import { useEffect, useState } from "react";
import { PRAYERS, UZBEK_TERMS } from "../constants/prayers";
import { DEFAULT_REGION, getRegionName } from "../constants/regions";
import { todayKey, formatDisplayDate, formatNumber } from "../lib/dateUtils";
import { getByIndex, putItem, getItem } from "../lib/db";
import {
  loadQazoBalance,
  getQazoTotal,
  QAZO_PRAYERS,
  loadQazoPlan,
  getDailyTarget,
  calculateCompletionEstimate,
  formatCompletionEstimate,
  getPlanPrayers,
  suggestQazoPrayer,
} from "../lib/qazoService";
import {
  getPrayerTimes,
  getPrayerStatuses,
  prefetchMonth,
} from "../lib/prayerTimesService";
import AppHeader from "../components/layout/AppHeader";
import Card from "../components/ui/Card";
import PrayerIcon from "../components/ui/PrayerIcon";
import Spinner from "../components/ui/Spinner";
import ErrorState from "../components/ui/ErrorState";
import QazoCompleteModal from "../components/qazo/QazoCompleteModal";
import {
  Check,
  CircleAlert,
  Clock,
  ClockAlert,
  Ellipsis,
  MapPin,
  Plus,
  Star,
  X,
} from "lucide-react";

const STATUS_STYLES = {
  completed: {
    card: "bg-green-50/60 border border-green-200/60",
    icon: "bg-green-600 text-cream-50",
    label: "Bajarildi",
    labelColor: "text-green-600",
    dot: "bg-green-500",
  },
  upcoming: {
    card: "border border-cream-200/80",
    icon: "bg-cream-100 text-green-400",
    label: "Yaqinlashmoqda",
    labelColor: "text-green-400",
    dot: "bg-green-300",
  },
  current: {
    card: "bg-gradient-to-br from-gold-50/80 to-cream-50 border border-gold-200/60",
    icon: "bg-gradient-to-br from-gold-300 to-gold-500 text-green-800",
    label: "Hozir",
    labelColor: "text-gold-600",
    dot: "bg-gold-400",
  },
  missed: {
    card: "border border-red-100 bg-red-50/30",
    icon: "bg-red-50 text-red-400",
    label: "O'tkazib yuborildi",
    labelColor: "text-red-500",
    dot: "bg-red-400",
  },
  pending: {
    card: "border border-cream-200/80",
    icon: "bg-cream-100 text-green-300",
    label: "Kutilmoqda",
    labelColor: "text-green-400",
    dot: "bg-cream-300",
  },
};

export default function AsosiyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [logs, setLogs] = useState({});
  const [qazoBalance, setQazoBalance] = useState(null);
  const [qazoPlan, setQazoPlan] = useState(null);
  const [showQazoModal, setShowQazoModal] = useState(false);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [prayerTimesData, setPrayerTimesData] = useState(null);
  const [prayerStatuses, setPrayerStatuses] = useState(null);
  const [timesError, setTimesError] = useState(false);
  const [timesLoading, setTimesLoading] = useState(true);
  const today = todayKey();

  async function loadRegion() {
    const settings = await getItem("settings", "app_settings");
    if (settings?.region) {
      setRegion(settings.region);
    }
  }

  async function loadToday() {
    setLoading(true);
    setError(false);
    try {
      const records = await getByIndex("prayer_logs", "byDate", today);
      const map = {};
      for (const r of records) {
        map[r.prayer] = r;
      }
      setLogs(map);
      const balance = await loadQazoBalance();

      console.log("ASOSIY PAGE QAZO BALANCE:", balance);
      console.log("ASOSIY PAGE BY PRAYER:", balance?.byPrayer);
      console.log("ASOSIY PAGE TOTAL:", getQazoTotal(balance));

      setQazoBalance(balance);

      const plan = await loadQazoPlan();
      setQazoPlan(plan);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrayerTimes(selectedRegion) {
    setTimesLoading(true);
    setTimesError(false);
    try {
      const dayData = await getPrayerTimes(today, selectedRegion);
      setPrayerTimesData(dayData);

      const records = await getByIndex("prayer_logs", "byDate", today);
      const logMap = {};
      for (const r of records) {
        logMap[r.prayer] = r;
      }

      const statuses = await getPrayerStatuses(today, selectedRegion, logMap);
      setPrayerStatuses(statuses);

      // Prefetch next month for smoother navigation
      const now = new Date();
      prefetchMonth(selectedRegion, now.getFullYear(), now.getMonth());
    } catch {
      setTimesError(true);
      setPrayerTimesData(null);
      setPrayerStatuses(null);
    } finally {
      setTimesLoading(false);
    }
  }

  useEffect(() => {
    loadRegion();
  }, []);

  useEffect(() => {
    loadToday();
  }, []);

  useEffect(() => {
    loadPrayerTimes(region);
  }, [region]);

  // useEffect(() => {
  //   const handleQazoBalanceUpdated = (event) => {
  //     if (event.detail) {
  //       setQazoBalance(event.detail);
  //     }
  //   };

  //   window.addEventListener("qazo-balance-updated", handleQazoBalanceUpdated);

  //   return () => {
  //     window.removeEventListener(
  //       "qazo-balance-updated",
  //       handleQazoBalanceUpdated,
  //     );
  //   };
  // }, []);

  useEffect(() => {
    const refreshQazoBalance = async () => {
      try {
        const balance = await loadQazoBalance();
        setQazoBalance(balance);
      } catch (error) {
        console.error("Qazo balansini yangilashda xatolik:", error);
      }
    };

    window.addEventListener("qazo-balance-updated", refreshQazoBalance);
    window.addEventListener("profile-updated", refreshQazoBalance);

    return () => {
      window.removeEventListener("qazo-balance-updated", refreshQazoBalance);
      window.removeEventListener("profile-updated", refreshQazoBalance);
    };
  }, []);

  async function togglePrayer(prayerKey) {
    const existing = logs[prayerKey];
    if (existing) {
      const updated = { ...existing, completed: !existing.completed };
      await putItem("prayer_logs", updated);
      setLogs((prev) => ({ ...prev, [prayerKey]: updated }));
    } else {
      const newRecord = {
        id: `${today}-${prayerKey}`,
        date: today,
        prayer: prayerKey,
        completed: true,
        createdAt: Date.now(),
      };
      await putItem("prayer_logs", newRecord);
      setLogs((prev) => ({ ...prev, [prayerKey]: newRecord }));
    }

    // Refresh statuses after toggle
    if (prayerTimesData) {
      const updatedLogs = { ...logs };
      if (existing) {
        updatedLogs[prayerKey] = {
          ...existing,
          completed: !existing.completed,
        };
      } else {
        updatedLogs[prayerKey] = {
          id: `${today}-${prayerKey}`,
          date: today,
          prayer: prayerKey,
          completed: true,
        };
      }
      const statuses = await getPrayerStatuses(today, region, updatedLogs);
      setPrayerStatuses(statuses);
    }
  }

  function hasPrayerTimeStarted(time) {
    if (!time) return false;

    const [hours, minutes] = time.split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return false;
    }

    const now = new Date();

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayerMinutes = hours * 60 + minutes;

    return currentMinutes >= prayerMinutes;
  }

  const completedCount = Object.values(logs).filter((l) => l?.completed).length;
  const progress = Math.round((completedCount / PRAYERS.length) * 100);

  const qazoTotal = qazoBalance ? getQazoTotal(qazoBalance) : 0;
  const hasQazo =
    qazoBalance && qazoBalance.qazoSetupCompleted && qazoTotal > 0;
  const hasPlan = qazoPlan && qazoPlan.planSetupCompleted;
  const dailyTarget = hasPlan ? getDailyTarget(qazoPlan) : 0;
  const estimate = hasPlan
    ? calculateCompletionEstimate(qazoBalance, qazoPlan)
    : null;
  const planPrayers = hasPlan ? getPlanPrayers(qazoPlan) : [];
  const suggestedPrayer = hasPlan ? suggestQazoPrayer(qazoPlan) : null;

  return (
    <div className="animate-fade-in">
      <AppHeader
        title={UZBEK_TERMS.todaysPrayers}
        subtitle={formatDisplayDate(new Date())}
      />

      <div className="px-2 lg:px-0 pt-5 lg:pt-6 space-y-4">
        <Card
          padding="lg"
          className="bg-gradient-to-br from-green-700 to-green-800 text-cream-50 border-0 shadow-[0_8px_28px_rgba(23,61,42,0.22)] overflow-hidden relative"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold-400/10 pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-28 h-28 rounded-full bg-cream-50/5 pointer-events-none" />
          <div className="relative flex items-center justify-between mb-1">
            <div>
              <p className="text-cream-200/70 text-xs font-medium tracking-wide uppercase">
                Bugungi natija
              </p>
              <p className="text-3xl font-bold mt-1 tracking-tight">
                {completedCount}{" "}
                <span className="text-cream-200/40 text-2xl">
                  / {PRAYERS.length}
                </span>
              </p>
              <p className="text-cream-200/60 text-xs mt-1.5 flex items-center gap-1.5 ">
                <MapPin size={12} />
                {getRegionName(region)}
              </p>
            </div>
            <div className="relative w-16 h-16 ">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#C9A23E"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-gold-200 font-bold text-sm">
                {progress}%
              </span>
            </div>
          </div>
        </Card>
        {loading ? (
          <Spinner label={UZBEK_TERMS.loading} className="py-16" />
        ) : error ? (
          <ErrorState onRetry={loadToday} />
        ) : timesError ? (
          <Card padding="md" className="text-center">
            <div className="py-8">
              <CircleAlert
                size={40}
                strokeWidth={1.5}
                className="mx-auto mb-3"
              />
              <p className="text-green-700 font-medium text-sm mb-1">
                Namoz vaqtlari yuklanmadi
              </p>
              <p className="text-green-400 text-xs mb-4">
                Internetga ulanib qayta urinib ko'ring
              </p>
              <button
                onClick={() => loadPrayerTimes(region)}
                className="px-5 py-2.5 rounded-xl bg-green-600 text-cream-50 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          </Card>
        ) : timesLoading ? (
          <Spinner label="Namoz vaqtlari yuklanmoqda..." className="py-12" />
        ) : !prayerTimesData ? (
          <Card padding="md" className="text-center">
            <p className="text-green-400 text-sm py-8">
              Ushbu hudud uchun namoz vaqtlari hozircha mavjud emas
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {PRAYERS.map((prayer) => {
              const log = logs[prayer.key];
              const isDone = log?.completed;

              const statusInfo = prayerStatuses?.[prayer.key];

              const apiTime =
                statusInfo?.time || prayerTimesData?.times?.[prayer.key];

              // Has the prayer time started?
              const hasStarted = hasPrayerTimeStarted(apiTime);

              // A completed prayer should always remain completed.
              // Otherwise use the calculated status.
              const status = isDone
                ? "completed"
                : !hasStarted
                  ? "upcoming"
                  : statusInfo?.status || "pending";

              const style = STATUS_STYLES[status] || STATUS_STYLES.pending;

              const isLocked = !isDone && !hasStarted;

              return (
                <Card
                  key={prayer.key}
                  onClick={() => {
                    if (isLocked) return;
                    togglePrayer(prayer.key);
                  }}
                  className={`
        flex items-center gap-4 transition-all
        ${style.card}
        ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
      `}
                >
                  {/* Icon */}
                  <div
                    className={`
          w-11 h-11 rounded-2xl
          flex items-center justify-center
          shrink-0
          ${style.icon}
        `}
                  >
                    <PrayerIcon prayer={prayer.key} size={22} />
                  </div>

                  {/* Prayer information */}
                  <div className="flex-1 text-left min-w-0">
                    <p
                      className={`
            font-semibold text-[15px] tracking-tight
            ${isDone ? "text-green-700" : "text-green-800"}
          `}
                    >
                      {prayer.name}
                    </p>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-green-500 text-md font-semibold tabular-nums">
                        {apiTime || "--:--"}
                      </span>

                      <span className="text-cream-300 text-xs">·</span>

                      <span
                        className={`
              text-[11px] font-medium
              ${style.labelColor}
            `}
                      >
                        {style.label}
                      </span>
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div
                    className={`
          w-12 h-12 rounded-full
          border-2
          flex items-center justify-center
          shrink-0
          transition-all
          ${
            isDone
              ? "bg-green-600 border-green-600"
              : isLocked
                ? "border-cream-200 bg-cream-100"
                : "border-cream-300"
          }
        `}
                  >
                    {status === "completed" ? (
                      <Check
                        size={22}
                        strokeWidth={2}
                        className="text-[#FBF8F1]"
                      />
                    ) : status === "upcoming" ? (
                      <Ellipsis
                        size={22}
                        strokeWidth={2}
                        className="text-green-500"
                      />
                    ) : status === "missed" ? (
                      <ClockAlert
                        size={22}
                        strokeWidth={2}
                        className="text-red-500"
                      />
                    ) : (
                      <Ellipsis
                        size={22}
                        strokeWidth={2}
                        className="text-green-500"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {hasPlan && dailyTarget > 0 && (
          <Card
            padding="md"
            className="bg-gradient-to-br from-gold-50/80 to-cream-50 border border-gold-200/60"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-green-800 tracking-tight">
                  Bugungi qazo rejasi
                </h3>
                <p className="text-green-400 text-xs mt-0.5">
                  Oz-ozdan, lekin muntazam
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700 tabular-nums">
                  {formatNumber(dailyTarget)}
                </p>
                <p className="text-green-400 text-xs">ta namoz</p>
              </div>
            </div>

            {estimate && estimate.totalDays > 0 && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <Clock size={13} />
                <span className="text-green-600">
                  Taxminiy davomiyligi: {formatCompletionEstimate(estimate)}
                </span>
              </div>
            )}

            {suggestedPrayer && planPrayers.length > 0 && (
              <div className="bg-cream-50 rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold-100 flex items-center justify-center shrink-0">
                  <Star size={16} color="gold" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-green-700 text-sm font-medium">Tavsiya</p>
                  <p className="text-green-400 text-xs">
                    {QAZO_PRAYERS.find((p) => p.key === suggestedPrayer)?.name}{" "}
                    qazosini o'qing
                  </p>
                </div>
                <span className="text-green-700 text-sm font-semibold tabular-nums shrink-0">
                  {formatNumber(qazoBalance?.byPrayer?.[suggestedPrayer] || 0)}{" "}
                  ta
                </span>
              </div>
            )}

            <button
              onClick={() => setShowQazoModal(true)}
              className="w-full bg-green-600 text-cream-50 font-semibold py-3.5 rounded-xl shadow-soft hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Qazo namozini ado etdim
            </button>
          </Card>
        )}

        {hasQazo && (
          <Card padding="md">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-green-800 tracking-tight">
                    Qolgan qazo namozlar
                  </h3>
                </div>

                <p className="text-green-400 text-xs mt-1">
                  Barcha qazo namozlaringiz
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl leading-none font-bold text-green-700 tabular-nums">
                  {formatNumber(qazoTotal)}
                </p>
                <p className="text-green-400 text-xs mt-1">ta namoz</p>
              </div>
            </div>

            {/* Prayer breakdown */}
            <div className="rounded-2xl bg-cream-50/70 p-3.5 space-y-3">
              {(() => {
                const maxCount = Math.max(
                  ...QAZO_PRAYERS.map(
                    (p) => qazoBalance.byPrayer?.[p.key] || 0,
                  ),
                  1,
                );

                return QAZO_PRAYERS.map((prayer) => {
                  const count = qazoBalance.byPrayer?.[prayer.key] || 0;

                  const barWidth = Math.round((count / maxCount) * 100);

                  return (
                    <div key={prayer.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-green-700 text-sm font-medium">
                          {prayer.name}
                        </span>

                        <span className="text-green-800 text-sm font-semibold tabular-nums">
                          {formatNumber(count)}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </Card>
        )}
      </div>

      {showQazoModal && qazoBalance && qazoPlan && (
        <QazoCompleteModal
          balance={qazoBalance}
          plan={qazoPlan}
          onCompleted={(updatedBalance) => {
            setQazoBalance(updatedBalance);
            setShowQazoModal(false);
          }}
          onClose={() => setShowQazoModal(false)}
        />
      )}
    </div>
  );
}
