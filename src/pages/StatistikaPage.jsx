import { useEffect, useMemo, useState } from "react";
import { PRAYERS, UZBEK_TERMS } from "../constants/prayers";
import {
  formatDate,
  addDays,
  formatNumber,
  WEEK_DAYS,
  MONTHS,
} from "../lib/dateUtils";
import { getAll } from "../lib/db";

import {
  loadQazoBalance,
  loadQazoPlan,
  getDailyTarget,
} from "../lib/qazoService";

import AppHeader from "../components/layout/AppHeader";
import Spinner from "../components/ui/Spinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import PrayerIcon from "../components/ui/PrayerIcon";

const PERIODS = [
  {
    key: "daily",
    label: "Kunlik",
  },
  {
    key: "weekly",
    label: "Haftalik",
  },
  {
    key: "monthly",
    label: "Oylik",
  },
  {
    key: "yearly",
    label: "Yillik",
  },
];

/*
 * Your qazoService treats Xufton as:
 * 4 rak'at Xufton farz + 3 rak'at Vitr.
 *
 * Therefore Xufton = 7 rakats for statistics.
 */
const QAZO_RAKAHS = {
  bomdod: 2,
  peshin: 4,
  asr: 4,
  shom: 3,
  xufton: 7,
};

function getDaysForPeriod(period) {
  if (period === "daily") return 1;
  if (period === "monthly") return 30;
  if (period === "yearly") return 365;
  return 7;
}

function getPeriodStart(period) {
  const days = getDaysForPeriod(period) - 1;

  return formatDate(addDays(new Date(), -days));
}

function clampPercentage(value) {
  return Math.min(100, Math.max(0, Math.round(value || 0)));
}

/*
 * Calculate qazo units from qazo balance.
 *
 * byPrayer:
 * {
 *   bomdod: 730,
 *   peshin: 730,
 *   asr: 730,
 *   shom: 730,
 *   xufton: 730
 * }
 */
function getQazoUnits(balance) {
  if (!balance?.byPrayer) return 0;

  return Object.values(balance.byPrayer).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
}

/*
 * Calculate remaining qazo rakats.
 */
function getQazoRakahs(balance) {
  if (!balance?.byPrayer) return 0;

  return Object.entries(balance.byPrayer).reduce((sum, [prayer, units]) => {
    const rakahs = QAZO_RAKAHS[prayer] || 0;

    return sum + (Number(units) || 0) * rakahs;
  }, 0);
}

/*
 * Convert qazo completion logs into:
 *
 * {
 *   units: 126,
 *   rakahs: 730,
 *   byPrayer: {...}
 * }
 */
function calculateQazoCompleted(qazoLogs) {
  const byPrayer = {
    bomdod: 0,
    peshin: 0,
    asr: 0,
    shom: 0,
    xufton: 0,
  };

  let units = 0;
  let rakahs = 0;

  for (const log of qazoLogs || []) {
    const quantity = Math.max(0, Number(log.quantity) || 0);

    if (Object.prototype.hasOwnProperty.call(byPrayer, log.prayer)) {
      byPrayer[log.prayer] += quantity;

      units += quantity;

      rakahs += quantity * (QAZO_RAKAHS[log.prayer] || 0);
    }
  }

  return {
    units,
    rakahs,
    byPrayer,
  };
}

/*
 * Completed qazo during a specific period.
 */
function calculatePeriodQazo(qazoLogs, period) {
  const today = formatDate(new Date());
  const periodStart = getPeriodStart(period);

  let units = 0;
  let rakahs = 0;

  for (const log of qazoLogs || []) {
    if (log.date >= periodStart && log.date <= today) {
      const quantity = Math.max(0, Number(log.quantity) || 0);

      units += quantity;

      rakahs += quantity * (QAZO_RAKAHS[log.prayer] || 0);
    }
  }

  return {
    units,
    rakahs,
  };
}

/*
 * Get all days on which every obligatory prayer
 * was completed.
 */
function getFullPrayerDays(records) {
  const completedByDate = {};

  for (const record of records) {
    if (!record.completed) continue;

    if (!completedByDate[record.date]) {
      completedByDate[record.date] = new Set();
    }

    completedByDate[record.date].add(record.prayer);
  }

  const requiredPrayers = PRAYERS.map((prayer) => prayer.key);

  const fullDays = new Set();

  Object.entries(completedByDate).forEach(([date, prayers]) => {
    const isComplete = requiredPrayers.every((prayer) => prayers.has(prayer));

    if (isComplete) {
      fullDays.add(date);
    }
  });

  return fullDays;
}

function calculateCurrentStreak(records) {
  const fullDays = getFullPrayerDays(records);

  let streak = 0;

  for (let i = 0; i < 3650; i++) {
    const date = formatDate(addDays(new Date(), -i));

    if (!fullDays.has(date)) {
      break;
    }

    streak++;
  }

  return streak;
}

function calculateLongestStreak(records) {
  const fullDays = getFullPrayerDays(records);

  if (fullDays.size === 0) return 0;

  const dates = Array.from(fullDays).sort();

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const previous = new Date(`${dates[i - 1]}T00:00:00`);

    const currentDate = new Date(`${dates[i]}T00:00:00`);

    const difference = Math.round(
      (currentDate - previous) / (1000 * 60 * 60 * 24),
    );

    if (difference === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function ProgressRing({ percentage, type = "green" }) {
  const value = clampPercentage(percentage);

  const color = type === "purple" ? "#8553a8" : "#26744f";

  const track = type === "purple" ? "#eadcf2" : "#dcecdf";

  return (
    <div
      className="
        relative
        w-28 h-28
        sm:w-32 sm:h-32
        rounded-full
        flex
        items-center
        justify-center
        shrink-0
      "
      style={{
        background: `conic-gradient(
          ${color} ${value * 3.6}deg,
          ${track} ${value * 3.6}deg
        )`,
      }}
    >
      <div
        className="
          absolute
          inset-[10px]
          rounded-full
          bg-[#fbfcf8]
          flex
          items-center
          justify-center
        "
      >
        <span className="text-2xl sm:text-3xl font-bold text-green-950 tabular-nums">
          {value}%
        </span>
      </div>
    </div>
  );
}

function SmallIcon({ children, purple = false }) {
  return (
    <div
      className={`
        w-11 h-11
        rounded-full
        flex
        items-center
        justify-center
        shrink-0
        ${
          purple ? "bg-purple-50 text-purple-700" : "bg-green-50 text-green-800"
        }
      `}
    >
      {children}
    </div>
  );
}

function polarToCartesian(cx, cy, radius, angle) {
  const angleInRadians = ((angle - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutArc(
  cx,
  cy,
  outerRadius,
  innerRadius,
  startAngle,
  endAngle,
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);

  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);

  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);

  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function StatistikaPage() {
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const [stats, setStats] = useState(null);

  const [period, setPeriod] = useState("daily");

  const [activeQazoKey, setActiveQazoKey] = useState(null);

  async function loadStats() {
    setLoading(true);
    setError(false);

    try {
      const [prayerLogs, qazoLogs, qazoBalance, qazoPlan] = await Promise.all([
        getAll("prayer_logs"),
        getAll("qazo_logs"),
        loadQazoBalance(),
        loadQazoPlan(),
      ]);

      const today = formatDate(new Date());

      const periodStart = getPeriodStart(period);

      /*
       * --------------------------------------------------
       * NAMOZ STATS
       * --------------------------------------------------
       */

      const prayerCounts = {};

      PRAYERS.forEach((prayer) => {
        prayerCounts[prayer.key] = 0;
      });

      let periodDone = 0;

      for (const record of prayerLogs) {
        if (
          record.date >= periodStart &&
          record.date <= today &&
          record.completed
        ) {
          periodDone++;

          if (prayerCounts[record.prayer] !== undefined) {
            prayerCounts[record.prayer]++;
          }
        }
      }

      const expectedPeriodTotal = PRAYERS.length * getDaysForPeriod(period);

      const prayerPercentage =
        expectedPeriodTotal > 0
          ? clampPercentage((periodDone / expectedPeriodTotal) * 100)
          : 0;

      /*
       * --------------------------------------------------
       * DAILY / MONTHLY / YEARLY CHART
       * --------------------------------------------------
       */

      let chartData = [];

      if (period === "daily") {
        const date = formatDate(new Date());

        const todayRecords = prayerLogs.filter(
          (record) => record.date === date && record.completed,
        );

        chartData = PRAYERS.map((prayer) => {
          const completed = todayRecords.some(
            (record) => record.prayer === prayer.key,
          );

          return {
            date,
            label: PRAYERS[prayer.name],
            prayer: prayer.key,
            count: completed ? 1 : 0,
            total: 1,
          };
        });
      }

      if (period === "weekly") {
        for (let i = 6; i >= 0; i--) {
          const date = formatDate(addDays(new Date(), -i));

          const count = prayerLogs.filter(
            (record) => record.date === date && record.completed,
          ).length;

          const [year, month, day] = date.split("-").map(Number);
          const dateObject = new Date(year, month - 1, day);

          // Якшанба=0 -> 6-индексга, Душанба=1 -> 0-индексга ўтади
          const dayIndex = (dateObject.getDay() + 6) % 7;

          chartData.push({
            date,
            label: WEEK_DAYS[dayIndex],
            count,
            total: PRAYERS.length,
          });
        }
      }

      if (period === "monthly") {
        for (let i = 29; i >= 0; i--) {
          const date = formatDate(addDays(new Date(), -i));

          const count = prayerLogs.filter(
            (record) => record.date === date && record.completed,
          ).length;

          chartData.push({
            date,
            label: new Date(`${date}T00:00:00`).getDate(),
            count,
            total: PRAYERS.length,
          });
        }
      }

      if (period === "yearly") {
        for (let i = 11; i >= 0; i--) {
          const date = new Date();

          date.setMonth(date.getMonth() - i);

          const month = date.getMonth();

          const year = date.getFullYear();

          const count = prayerLogs.filter((record) => {
            const recordDate = new Date(`${record.date}T00:00:00`);

            return (
              recordDate.getMonth() === month &&
              recordDate.getFullYear() === year &&
              record.completed
            );
          }).length;

          chartData.push({
            label: MONTHS[month],
            count,
            total: PRAYERS.length * 30,
          });
        }
      }

      /*
       * --------------------------------------------------
       * QAZO
       * --------------------------------------------------
       */

      const remainingQazoUnits = getQazoUnits(qazoBalance);

      const remainingQazoRakahs = getQazoRakahs(qazoBalance);

      const completedQazo = calculateQazoCompleted(qazoLogs);

      const periodQazo = calculatePeriodQazo(qazoLogs, period);

      /*
       * Total historical qazo =
       * current remaining + everything completed.
       *
       * This gives us the original qazo workload.
       */
      const totalQazoUnits = remainingQazoUnits + completedQazo.units;

      const totalQazoRakahs = remainingQazoRakahs + completedQazo.rakahs;

      const qazoPercentage =
        totalQazoUnits > 0
          ? clampPercentage((completedQazo.units / totalQazoUnits) * 100)
          : 100;

      /*
       * Completed qazo by prayer.
       */
      const qazoCompletedByPrayer = {
        bomdod: completedQazo.byPrayer.bomdod,
        peshin: completedQazo.byPrayer.peshin,
        asr: completedQazo.byPrayer.asr,
        shom: completedQazo.byPrayer.shom,
        xufton: completedQazo.byPrayer.xufton,
      };

      /*
       * Qazo remaining by prayer.
       */
      const qazoRemainingByPrayer = {
        bomdod: qazoBalance?.byPrayer?.bomdod || 0,

        peshin: qazoBalance?.byPrayer?.peshin || 0,

        asr: qazoBalance?.byPrayer?.asr || 0,

        shom: qazoBalance?.byPrayer?.shom || 0,

        xufton: qazoBalance?.byPrayer?.xufton || 0,
      };

      /*
       * Actual daily target from qazo plan.
       */
      const dailyTarget = getDailyTarget(qazoPlan);

      /*
       * Streak.
       */
      const currentStreak = calculateCurrentStreak(prayerLogs);

      const longestStreak = calculateLongestStreak(prayerLogs);

      setStats({
        prayerCounts,

        periodDone,

        expectedPeriodTotal,

        prayerPercentage,

        chartData,

        remainingQazoUnits,

        remainingQazoRakahs,

        completedQazoUnits: completedQazo.units,

        completedQazoRakahs: completedQazo.rakahs,

        periodQazoUnits: periodQazo.units,

        periodQazoRakahs: periodQazo.rakahs,

        todayQazoUnits: periodQazo.units,

        todayQazoRakahs: periodQazo.rakahs,

        totalQazoUnits,

        totalQazoRakahs,

        qazoPercentage,

        qazoCompletedByPrayer,

        qazoRemainingByPrayer,

        dailyTarget,

        currentStreak,

        longestStreak,

        totalPrayerLogs: prayerLogs.length,

        totalQazoLogs: qazoLogs.length,
      });
    } catch (err) {
      console.error("Statistics loading error:", err);

      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [period]);

  /*
   * Maximum value for the chart.
   */
  const maxChartValue = useMemo(() => {
    if (!stats?.chartData?.length) {
      return PRAYERS.length;
    }

    return Math.max(...stats.chartData.map((item) => item.count), 1);
  }, [stats]);

  /*
   * Prayer percentages.
   */
  const prayerPercentages = useMemo(() => {
    if (!stats) return {};

    return PRAYERS.reduce((result, prayer) => {
      const count = stats.prayerCounts[prayer.key] || 0;

      const days = getDaysForPeriod(period);

      result[prayer.key] = clampPercentage((count / days) * 100);

      return result;
    }, {});
  }, [stats, period]);

  /*
   * Qazo breakdown.
   */
  const qazoBreakdown = useMemo(() => {
    if (!stats) return [];

    const xuftonQazo = stats.qazoRemainingByPrayer.xufton;

    return [
      {
        key: "bomdod",
        label: "Bomdod farz",
        value: stats.qazoRemainingByPrayer.bomdod,
        rakahs: stats.qazoRemainingByPrayer.bomdod * QAZO_RAKAHS.bomdod,
        color: "#70a96f",
      },

      {
        key: "peshin",
        label: "Peshin farz",
        value: stats.qazoRemainingByPrayer.peshin,
        rakahs: stats.qazoRemainingByPrayer.peshin * QAZO_RAKAHS.peshin,
        color: "#f2b83f",
      },

      {
        key: "asr",
        label: "Asr farz",
        value: stats.qazoRemainingByPrayer.asr,
        rakahs: stats.qazoRemainingByPrayer.asr * QAZO_RAKAHS.asr,
        color: "#4b9be8",
      },

      {
        key: "shom",
        label: "Shom farz",
        value: stats.qazoRemainingByPrayer.shom,
        rakahs: stats.qazoRemainingByPrayer.shom * QAZO_RAKAHS.shom,
        color: "#8553a8",
      },

      {
        key: "xufton",
        label: "Xufton",
        value: xuftonQazo,

        farzRakahs: xuftonQazo * 4,
        vitrRakahs: xuftonQazo * 3,

        rakahs: xuftonQazo * 7,

        color: "#328d87",
      },
    ];
  }, [stats]);

  /*
   * Donut gradient.
   */
  // const qazoDonutStyle = useMemo(() => {
  //   if (!qazoBreakdown.length) {
  //     return {
  //       background: "conic-gradient(#dce8df 0deg 360deg)",
  //     };
  //   }

  //   const total = qazoBreakdown.reduce((sum, item) => sum + item.value, 0);

  //   if (!total) {
  //     return {
  //       background: "conic-gradient(#dce8df 0deg 360deg)",
  //     };
  //   }

  //   let current = 0;

  //   const segments = qazoBreakdown.map((item) => {
  //     const start = current;

  //     const degrees = (item.value / total) * 360;

  //     current += degrees;

  //     return `${item.color} ${start}deg ${current}deg`;
  //   });

  //   return {
  //     background: `conic-gradient(${segments.join(", ")})`,
  //   };
  // }, [qazoBreakdown]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <AppHeader title={UZBEK_TERMS.statistics} />

        <Spinner label={UZBEK_TERMS.loading} className="py-20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <AppHeader title={UZBEK_TERMS.statistics} />

        <div className="px-5 lg:px-0 pt-6">
          <ErrorState onRetry={loadStats} />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalPrayerLogs === 0) {
    return (
      <div className="animate-fade-in">
        <AppHeader title={UZBEK_TERMS.statistics} />

        <div className="px-5 lg:px-0 pt-6">
          <EmptyState
            title="Statistika yo'q"
            subtitle="Namozlarni belgilashni boshlang va statistika bu yerda ko'rinadi."
            icon={<PrayerIcon prayer="peshin" size={32} />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in bg-[#fbfcf8] rounded-b-2xl">
      <AppHeader title="Statistika" />
      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden  text-green-500">
        {/* <div className="absolute right-0 bottom-[-25px] text-[130px] sm:text-[170px] leading-none opacity-[0.10] pointer-events-none">
          ☪
        </div> */}

        <div className="relative max-w-6xl mx-auto px-5 lg:px-8">
          {/* Period selector */}
          <div className="flex justify-center mt-5">
            <div className="inline-flex rounded-full bg-black/15 backdrop-blur-md border border-white/10 p-1">
              {PERIODS.map((item) => {
                const isActive = period === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPeriod(item.key)}
                    className={`
                      px-4
                      sm:px-6
                      py-2.5
                      rounded-full
                      text-sm
                      sm:text-base
                      font-medium
                      transition-all
                      duration-200
                      ${
                        isActive
                          ? "bg-white text-green-950 shadow-sm"
                          : "text-green-500 hover:bg-white/10"
                      }
                    `}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-8 py-5 sm:py-6 space-y-4">
        {/* =====================================================
            PROGRESS CARDS
        ====================================================== */}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Namoz */}
          <div className="rounded-2xl border border-green-100 bg-[#f8fbf6] p-5 sm:p-6">
            <div className="flex items-center gap-5">
              <ProgressRing percentage={stats.prayerPercentage} type="green" />

              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-green-950 leading-tight">
                  Namozlar
                  <br />
                  muntazamligi
                </h2>

                <p className="text-xl sm:text-2xl font-bold text-green-950 mt-4 tabular-nums">
                  {formatNumber(stats.periodDone)} /{" "}
                  {formatNumber(stats.expectedPeriodTotal)}
                </p>

                <p className="text-sm text-green-800/60 mt-1">
                  {period === "daily"
                    ? "bugun"
                    : period === "weekly"
                      ? "hafta davomida"
                      : period === "monthly"
                        ? "oy davomida"
                        : "yil davomida"}
                </p>
              </div>

              <div className="ml-auto hidden sm:block">
                <SmallIcon>
                  <PrayerIcon prayer="peshin" size={23} />
                </SmallIcon>
              </div>
            </div>
          </div>

          {/* Qazo */}
          <div className="rounded-2xl border border-purple-100 bg-[#fbf8fc] p-5 sm:p-6">
            <div className="flex items-center gap-5">
              <ProgressRing percentage={stats.qazoPercentage} type="purple" />

              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-green-950 leading-tight">
                  Qazo
                  <br />
                  bajarilishi
                </h2>

                <p className="text-xl sm:text-2xl font-bold text-green-950 mt-4 tabular-nums">
                  {formatNumber(stats.completedQazoUnits)} /{" "}
                  {formatNumber(stats.totalQazoUnits)}
                </p>

                <p className="text-sm text-green-800/60 mt-1">jami qazo</p>
              </div>

              <div className="ml-auto hidden sm:block">
                <SmallIcon purple>
                  <span className="text-2xl">▤</span>
                </SmallIcon>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            QAZO SUMMARY
        ====================================================== */}

        <section className="rounded-2xl border border-green-100 bg-[#fcfbf7] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-green-100">
            {/* Remaining */}
            <div className="p-5 sm:p-6 flex items-center gap-4">
              <SmallIcon>
                <span className="text-xl">🕌</span>
              </SmallIcon>

              <div>
                <p className="text-sm font-semibold text-green-900">
                  Jami qazo
                </p>

                <p className="text-2xl sm:text-3xl font-bold text-green-950 mt-1 tabular-nums">
                  {formatNumber(stats.remainingQazoUnits)} ta
                </p>

                <p className="text-sm text-green-800/60">qolgan</p>
              </div>
            </div>

            {/* Completed */}
            <div className="p-5 sm:p-6 flex items-center gap-4">
              <SmallIcon>
                <span className="text-2xl text-green-700">✓</span>
              </SmallIcon>

              <div>
                <p className="text-sm font-semibold text-green-900">
                  Jami ado etilgan qazo
                </p>

                <p className="text-2xl sm:text-3xl font-bold text-green-950 mt-1 tabular-nums">
                  {formatNumber(stats.completedQazoUnits)} ta
                </p>

                <p className="text-sm text-green-800/60">umumiy</p>
              </div>
            </div>

            {/* Daily target */}
            <div className="p-5 sm:p-6 flex items-center gap-4">
              <SmallIcon>
                <span className="text-xl">◎</span>
              </SmallIcon>

              <div>
                <p className="text-sm font-semibold text-green-900">
                  Bugungi maqsad
                </p>

                <p className="text-2xl sm:text-3xl font-bold text-green-950 mt-1 tabular-nums">
                  {formatNumber(stats.dailyTarget)} ta
                </p>

                <p className="text-sm text-green-800/60">qazo namozi</p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            STREAK
        ====================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-2xl border border-green-100 bg-[#fcfbf7] p-5 sm:p-6">
            <div className="grid grid-cols-2 divide-x divide-green-100">
              <div className="px-2 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl">
                    🔥
                  </div>

                  <p className="font-semibold text-green-900">Uzluksizlik</p>
                </div>

                <p className="text-2xl sm:text-3xl font-bold text-green-950 mt-5">
                  {stats.currentStreak} kun
                </p>

                <p className="text-sm text-green-800/60 mt-1">
                  jami ketma-ket kun
                </p>
              </div>

              <div className="px-4 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-green-50 flex items-center justify-center text-xl text-green-800">
                    ★
                  </div>

                  <p className="font-semibold text-green-900">Eng uzun</p>
                </div>

                <p className="text-2xl sm:text-3xl font-bold text-green-950 mt-5">
                  {stats.longestStreak} kun
                </p>

                <p className="text-sm text-green-800/60 mt-1">
                  eng yaxshi natija
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-[#eff7ec] to-[#e2f0df] p-6">
            <div className="relative z-10">
              <p className="text-lg sm:text-xl font-medium italic leading-relaxed text-green-900">
                “Har bir kichik qadam
                <br />
                katta o‘zgarishlarga
                <br />
                olib keladi.”
              </p>
            </div>

            <div className="absolute right-0 bottom-[-20px] text-[130px] leading-none opacity-[0.07]">
              ☪
            </div>
          </div>
        </section>

        {/* =====================================================
            PRAYER PERFORMANCE
        ====================================================== */}

        <section className="rounded-2xl border border-green-100 bg-[#fcfbf7] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-800 text-white flex items-center justify-center">
                ▥
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-green-950">
                Namozlar bo‘yicha ko‘rsatkich
              </h2>
            </div>

            <span className="text-sm font-medium text-green-900">
              {PERIODS.find((item) => item.key === period)?.label}
            </span>
          </div>

          <div
            className="
    overflow-x-auto
    -mx-2
    px-2
    pb-3
    scrollbar-thin
    scrollbar-thumb-green-200
    scrollbar-track-transparent
  "
          >
            <div
              className="
      flex
      min-w-max
      lg:grid
      lg:grid-cols-5
      lg:min-w-0
    "
            >
              {PRAYERS.map((prayer, index) => {
                const percentage = prayerPercentages[prayer.key] || 0;

                const count = stats.prayerCounts[prayer.key] || 0;

                return (
                  <div
                    key={prayer.key}
                    className="
              w-[130px]
              sm:w-[150px]
              lg:w-auto
              shrink-0
              px-4
              sm:px-5
              py-2
              flex
              flex-col
              items-center
              border-l
              border-green-100
              first:border-l-0
            "
                  >
                    <p className="text-sm sm:text-base font-bold text-green-950">
                      {percentage}%
                    </p>

                    <div className="h-28 sm:h-32 w-full max-w-[72px] mt-2 flex items-end">
                      <div
                        className={`
                  w-full
                  rounded-lg
                  min-h-[8px]
                  transition-all
                  duration-500
                  ${
                    percentage >= 90
                      ? "bg-green-700"
                      : percentage >= 70
                        ? "bg-green-500"
                        : percentage >= 50
                          ? "bg-lime-500"
                          : "bg-amber-400"
                  }
                `}
                        style={{
                          height: `${Math.max(percentage, 7)}%`,
                        }}
                      />
                    </div>

                    <p className="mt-3 text-sm sm:text-base font-medium text-green-950 whitespace-nowrap">
                      {PRAYERS[prayer.name]}
                    </p>

                    <p className="text-xs sm:text-sm text-green-800/70 mt-1">
                      {count} / {getDaysForPeriod(period)}
                    </p>

                    <div className="mt-3 text-green-900">
                      <PrayerIcon prayer={prayer.key} size={24} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            QAZO BREAKDOWN
        ====================================================== */}

        <section className="rounded-2xl border border-green-100 bg-[#fcfbf7] p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-green-800 text-white flex items-center justify-center">
              ▣
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-green-950">
              Qazo bo‘yicha tafsilot
            </h2>
          </div>
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[680px] overflow-visible">
              <svg
                viewBox="0 0 680 430"
                className="w-full h-auto block overflow-visible"
                role="img"
                aria-label="Qazo bo‘yicha tafsilot"
              >
                {(() => {
                  const total = qazoBreakdown.reduce(
                    (sum, item) => sum + item.rakahs,
                    0,
                  );

                  if (!total) {
                    return null;
                  }

                  const cx = 340;
                  const cy = 215;

                  const baseOuterRadius = 108;
                  const innerRadius = 62;

                  /*
                   * Label positions.
                   *
                   * dotX/dotY = exact end of connector
                   * textX/textY = text position
                   */
                  const labelPositions = [
                    // 0 — Bomdod
                    {
                      dotX: 490,
                      dotY: 55,
                      textX: 508,
                      textY: 50,
                      textAnchor: "start",
                    },

                    // 1 — Peshin
                    {
                      dotX: 520,
                      dotY: 145,
                      textX: 538,
                      textY: 140,
                      textAnchor: "start",
                    },

                    // 2 — Asr
                    {
                      dotX: 520,
                      dotY: 335,
                      textX: 538,
                      textY: 330,
                      textAnchor: "start",
                    },

                    // 3 — Shom
                    {
                      dotX: 160,
                      dotY: 335,
                      textX: 142,
                      textY: 330,
                      textAnchor: "end",
                    },

                    // 4 — Xufton
                    {
                      dotX: 160,
                      dotY: 55,
                      textX: 142,
                      textY: 50,
                      textAnchor: "end",
                    },
                  ];

                  let currentAngle = 0;

                  return qazoBreakdown.map((item, index) => {
                    const totalRakahs = qazoBreakdown.reduce(
                      (sum, item) => sum + item.rakahs,
                      0,
                    );

                    const percentage =
                      totalRakahs > 0 ? (item.rakahs / totalRakahs) * 100 : 0;

                    const startAngle = currentAngle;

                    const endAngle = currentAngle + (percentage / 100) * 360;

                    currentAngle = endAngle;

                    const isActive = activeQazoKey === item.key;

                    const outerRadius = isActive
                      ? baseOuterRadius + 8
                      : baseOuterRadius;

                    /*
                     * Actual donut segment.
                     */
                    const segmentPath = describeDonutArc(
                      cx,
                      cy,
                      outerRadius,
                      innerRadius,
                      startAngle,
                      endAngle,
                    );

                    /*
                     * Middle angle of this exact segment.
                     */
                    const middleAngle =
                      startAngle + (endAngle - startAngle) / 2;

                    /*
                     * Exact point where connector starts.
                     */
                    const connectorStart = polarToCartesian(
                      cx,
                      cy,
                      outerRadius + 2,
                      middleAngle,
                    );

                    const label = labelPositions[index];

                    let points;

                    /*
                     * ================================
                     * BOMDOD
                     *
                     * donut
                     *   │
                     *   │
                     *   └────────●
                     *             Bomdod
                     * ================================
                     */
                    if (index === 0) {
                      points = [
                        `${connectorStart.x},${connectorStart.y}`,
                        `${connectorStart.x},${label.dotY}`,
                        `${label.dotX},${label.dotY}`,
                      ].join(" ");
                    } else if (index === 1) {
                      /*
                       * ================================
                       * PESHIN
                       *
                       * donut ──────┐
                       *              │
                       *              ● Peshin
                       * ================================
                       */
                      const elbowX = label.dotX - 30;

                      points = [
                        `${connectorStart.x},${connectorStart.y}`,
                        `${elbowX},${connectorStart.y}`,
                        `${elbowX},${label.dotY}`,
                        `${label.dotX},${label.dotY}`,
                      ].join(" ");
                    } else if (index === 2) {
                      /*
                       * ================================
                       * ASR
                       *
                       * donut
                       *   │
                       *   └─────────● Asr
                       *
                       * exactly like the reference image
                       * ================================
                       */
                      const elbowY = label.dotY;

                      points = [
                        `${connectorStart.x},${connectorStart.y}`,
                        `${connectorStart.x},${elbowY}`,
                        `${label.dotX},${elbowY}`,
                      ].join(" ");
                    } else if (index === 3) {
                      /*
                       * ================================
                       * SHOM
                       *
                       *              donut
                       *                │
                       *          ●─────┘
                       *          Shom
                       * ================================
                       */
                      const elbowX = label.dotX + 30;

                      points = [
                        `${connectorStart.x},${connectorStart.y}`,
                        `${elbowX},${connectorStart.y}`,
                        `${elbowX},${label.dotY}`,
                        `${label.dotX},${label.dotY}`,
                      ].join(" ");
                    } else {
                      /*
                       * ================================
                       * XUFTON
                       *
                       *             donut
                       *               │
                       *       ●───────┘
                       *       Xufton
                       *
                       * Mirror of Bomdod.
                       * ================================
                       */
                      points = [
                        `${connectorStart.x},${connectorStart.y}`,
                        `${connectorStart.x},${label.dotY}`,
                        `${label.dotX},${label.dotY}`,
                      ].join(" ");
                    }

                    return (
                      <g key={item.key}>
                        {/* Connector */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke={item.color}
                          strokeWidth={isActive ? 2.5 : 1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all duration-200"
                        />

                        {/* Donut segment */}
                        <path
                          d={segmentPath}
                          fill={item.color}
                          className="cursor-pointer transition-all duration-200"
                          onClick={() =>
                            setActiveQazoKey((current) =>
                              current === item.key ? null : item.key,
                            )
                          }
                        />

                        {/* Label dot */}
                        <circle
                          cx={label.dotX}
                          cy={label.dotY}
                          r={isActive ? 8 : 6}
                          fill={item.color}
                          className="cursor-pointer transition-all duration-200"
                          onClick={() =>
                            setActiveQazoKey((current) =>
                              current === item.key ? null : item.key,
                            )
                          }
                        />

                        {/* Prayer name */}
                        <text
                          x={label.textX}
                          y={label.textY}
                          textAnchor={label.textAnchor}
                          className={`fill-green-950 text-[20px] ${
                            isActive ? "font-bold" : "font-semibold"
                          }`}
                        >
                          {item.label}
                        </text>

                        {/* Value + percentage */}
                        <text
                          x={label.textX}
                          y={label.textY + 21}
                          textAnchor={label.textAnchor}
                          className={`text-[14px] ${
                            isActive
                              ? "fill-green-950 font-bold"
                              : "fill-green-800/60 font-normal"
                          }`}
                        >
                          {item.key === "xufton" ? (
                            <>
                              {formatNumber(item.farzRakahs)} farz +{" "}
                              {formatNumber(item.vitrRakahs)} vitr ·{" "}
                              {Math.round(percentage)}%
                            </>
                          ) : (
                            <>
                              {formatNumber(item.rakahs)} farz ·{" "}
                              {Math.round(percentage)}%
                            </>
                          )}
                        </text>
                      </g>
                    );
                  });
                })()}

                {/* Center */}
                <circle
                  cx="340"
                  cy="215"
                  r="62"
                  fill="#fcfbf7"
                  pointerEvents="none"
                />

                <text
                  x="340"
                  y="207"
                  textAnchor="middle"
                  className="fill-green-950 text-[34px] font-bold"
                  pointerEvents="none"
                >
                  {formatNumber(stats.remainingQazoRakahs)}
                </text>

                <text
                  x="340"
                  y="232"
                  textAnchor="middle"
                  className="fill-green-800/70 text-[14px]"
                  pointerEvents="none"
                >
                  qoldiq rakat
                </text>
              </svg>
            </div>
          </div>
        </section>

        {/* =====================================================
            PERIOD CHART
        ====================================================== */}

        <section className="rounded-2xl border border-green-100 bg-[#fcfbf7] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-green-950">
              Namozlar dinamikasi
            </h2>

            <span className="text-sm text-green-800/60">
              <div className="text-right">
                <p className="text-sm font-semibold text-green-900">
                  {stats.periodDone} / {stats.expectedPeriodTotal}
                </p>

                <p className="text-[11px] text-green-800/60">
                  {period === "daily"
                    ? "bugungi namozlar"
                    : period === "weekly"
                      ? "haftalik"
                      : period === "monthly"
                        ? "oylik"
                        : "yillik"}
                </p>
              </div>
            </span>
          </div>
          <div
            className="
    overflow-x-auto
    -mx-2
    px-2
    pb-3
    scrollbar-thin
    scrollbar-thumb-green-200
    scrollbar-track-transparent
  "
          >
            <div
              className={`
      flex
      items-end
      gap-2
      sm:gap-3
      min-w-[520px]
      ${
        period === "daily"
          ? "h-48"
          : period === "yearly"
            ? "h-40"
            : period === "monthly"
              ? "h-44"
              : "h-48"
      }
    `}
            >
              {stats.chartData.map((item, index) => {
                const percentage =
                  maxChartValue > 0 ? (item.count / maxChartValue) * 100 : 0;

                const isToday =
                  period !== "daily" && item.date === formatDate(new Date());

                const showLabel =
                  period === "daily" ||
                  period === "weekly" ||
                  period === "yearly" ||
                  index % 5 === 0 ||
                  isToday;

                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="
            flex-1
            min-w-[70px]
            h-full
            flex
            flex-col
            items-center
            justify-end
            gap-2
          "
                  >
                    <div className="w-full h-full flex items-end justify-center">
                      <div
                        className={`
                w-full
                ${period === "daily" ? "max-w-[56px]" : "max-w-[42px]"}
                rounded-t-lg
                transition-all
                duration-500
                ${
                  period === "daily"
                    ? item.count > 0
                      ? "bg-green-700"
                      : "bg-green-200"
                    : isToday
                      ? "bg-green-800"
                      : "bg-green-500"
                }
              `}
                        style={{
                          height: `${Math.max(
                            percentage,
                            item.count > 0 ? 8 : 2,
                          )}%`,
                        }}
                        title={`${item.label}: ${item.count}`}
                      />
                    </div>

                    {showLabel && (
                      <span className="text-[9px] sm:text-xs text-green-800/70 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default StatistikaPage;
