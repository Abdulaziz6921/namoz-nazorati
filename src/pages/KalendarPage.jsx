import { useEffect, useMemo, useState } from "react";
import { PRAYERS, UZBEK_TERMS } from "../constants/prayers";
import {
  formatDate,
  getMonthName,
  getWeekdayName,
  WEEK_DAYS,
} from "../lib/dateUtils";
import { getAll } from "../lib/db";
import { getPrayerTimes, getStoredRegion } from "../lib/prayerTimesService";
import {
  QAZO_PRAYERS,
  loadQazoPlan,
  getDailyTarget,
  loadQazoBalance,
} from "../lib/qazoService";
import { loadProfile } from "../lib/profileService";
import AppHeader from "../components/layout/AppHeader";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import ErrorState from "../components/ui/ErrorState";
import {
  Calendar,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  XIcon,
} from "lucide-react";

const DAY_STATUS_STYLES = {
  complete: {
    dot: "bg-green-500",
  },

  partial: {
    dot: "bg-gold-400",
  },

  missed: {
    dot: "bg-red-500",
  },

  qazo: {
    dot: "bg-purple-500",
  },

  "qazo-period": {
    dot: "bg-red-500",
  },

  upcoming: {
    dot: "bg-cream-300",
  },

  none: {
    dot: "bg-transparent",
  },
};

export default function KalendarPage() {
  const todayStr = formatDate(new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [allLogs, setAllLogs] = useState({});
  const [allQazoLogs, setAllQazoLogs] = useState({});

  const [qazoPlan, setQazoPlan] = useState(null);

  const [profile, setProfile] = useState(null);
  const [qazoBalance, setQazoBalance] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [region, setRegion] = useState(null);
  const [selectedDayPrayerTimes, setSelectedDayPrayerTimes] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(false);

    try {
      const [prayerRecords, qazoRecords, plan, userProfile, balance] =
        await Promise.all([
          getAll("prayer_logs"),
          getAll("qazo_logs"),
          loadQazoPlan(),
          loadProfile(),
          loadQazoBalance(),
        ]);

      const prayerMap = {};
      const qazoMap = {};

      /*
       * Current prayer logs
       *
       * Example:
       * {
       *   "2026-09-09": {
       *     bomdod: { completed: true },
       *     peshin: { completed: true },
       *     asr: { completed: false }
       *   }
       * }
       */
      for (const record of prayerRecords) {
        if (!record?.date || !record?.prayer) {
          continue;
        }

        if (!prayerMap[record.date]) {
          prayerMap[record.date] = {};
        }

        prayerMap[record.date][record.prayer] = record;
      }

      /*
       * Qazo completion logs
       *
       * Example:
       * {
       *   "2026-09-09": {
       *     bomdod: 1,
       *     peshin: 1,
       *     asr: 1
       *   }
       * }
       */
      for (const record of qazoRecords) {
        if (!record?.date || !record?.prayer) {
          continue;
        }

        if (!qazoMap[record.date]) {
          qazoMap[record.date] = {};
        }

        qazoMap[record.date][record.prayer] =
          (qazoMap[record.date][record.prayer] || 0) + (record.quantity || 0);
      }

      setAllLogs(prayerMap);
      setAllQazoLogs(qazoMap);
      setQazoPlan(plan || null);
      setProfile(userProfile || null);
      setQazoBalance(balance || null);
    } catch (err) {
      console.error("Calendar data loading failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadData();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    async function loadSelectedDayPrayerTimes() {
      if (!selectedDate || !region) {
        setSelectedDayPrayerTimes(null);
        return;
      }

      try {
        const day = await getPrayerTimes(selectedDate, region);
        setSelectedDayPrayerTimes(day?.times || null);
      } catch (error) {
        console.error("Namoz vaqtlarini yuklashda xatolik:", error);
        setSelectedDayPrayerTimes(null);
      }
    }

    loadSelectedDayPrayerTimes();
  }, [selectedDate, region]);

  useEffect(() => {
    async function loadRegion() {
      const storedRegion = await getStoredRegion();

      setRegion(storedRegion || "namangan-shahri");
    }

    loadRegion();
  }, []);

  const qazoDailyTarget = useMemo(() => {
    if (!qazoPlan) {
      return 0;
    }

    try {
      return getDailyTarget(qazoPlan) || 0;
    } catch (err) {
      console.error("Qazo daily target calculation failed:", err);
      return 0;
    }
  }, [qazoPlan]);

  const registrationDate = useMemo(() => {
    if (!profile?.createdAt) return todayStr;

    return formatDate(new Date(profile.createdAt));
  }, [profile, todayStr]);

  const hasQazo = useMemo(() => {
    if (!qazoBalance?.byPrayer) return false;

    return Object.values(qazoBalance.byPrayer).some(
      (value) => Number(value) > 0,
    );
  }, [qazoBalance]);

  const qazoStartDate = useMemo(() => {
    if (!hasQazo || !qazoBalance?.startDate) return null;

    return formatDate(new Date(qazoBalance.startDate));
  }, [qazoBalance, hasQazo]);

  const qazoEndDate = useMemo(() => {
    if (!hasQazo || !qazoBalance?.endDate) return null;

    return formatDate(new Date(qazoBalance.endDate));
  }, [qazoBalance, hasQazo]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);

    // JS: Sunday = 0, Monday = 1...
    // Calendar needs Monday first.
    const jsWeekday = firstDay.getDay();
    const startWeekday = jsWeekday === 0 ? 6 : jsWeekday - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [year, month]);

  function goToMonth(delta) {
    setCurrentMonth(new Date(year, month + delta, 1));
  }

  function goToToday() {
    const today = new Date();

    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));

    setSelectedDate(todayStr);
  }

  function goToQazoStart() {
    if (!qazoStartDate || !qazoEndDate) return;

    let targetDate = qazoStartDate;

    const start = new Date(`${qazoStartDate}T00:00:00`);
    const end = new Date(`${qazoEndDate}T00:00:00`);

    const current = new Date(start);

    while (current <= end) {
      const dateStr = formatDate(current);

      const completedCount = getQazoPeriodDayProgress(dateStr);

      if (completedCount < QAZO_PRAYERS.length) {
        targetDate = dateStr;
        break;
      }

      current.setDate(current.getDate() + 1);
    }

    const target = new Date(`${targetDate}T00:00:00`);

    setCurrentMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    setSelectedDate(targetDate);
  }

  function handleDayClick(day) {
    if (!day) return;

    const dateStr = formatDate(new Date(year, month, day));

    setSelectedDate(dateStr);
  }

  function getCompletedPrayerCount(dateStr) {
    // Future date
    if (dateStr > todayStr) {
      return 0;
    }

    // Qazo period is not a normal 5-prayer day
    if (
      qazoStartDate &&
      qazoEndDate &&
      dateStr >= qazoStartDate &&
      dateStr <= qazoEndDate
    ) {
      return 0;
    }

    // Dates before registration and outside the qazo period
    // are treated as fully completed virtual history.
    if (registrationDate && dateStr < registrationDate) {
      return PRAYERS.length;
    }

    // Registration date and all dates after it:
    // ALWAYS use the real prayer logs.
    return PRAYERS.filter(
      (prayer) => allLogs[dateStr]?.[prayer.key]?.completed === true,
    ).length;
  }

  function getMissedPrayerCount(dateStr) {
    // Future dates have not happened yet
    if (dateStr > todayStr) {
      return 0;
    }

    // Past dates after registration are treated
    // as completed virtual history.
    if (registrationDate && dateStr < todayStr && dateStr >= registrationDate) {
      return 0;
    }

    // Qazo-period dates are not normal daily prayer records.
    if (
      qazoStartDate &&
      qazoEndDate &&
      dateStr < registrationDate &&
      dateStr >= qazoStartDate &&
      dateStr <= qazoEndDate
    ) {
      return 0;
    }

    // Today: only prayers that are actually not completed
    // are counted here.
    return PRAYERS.length - getCompletedPrayerCount(dateStr);
  }

  function getQazoProgress(dateStr) {
    const dayQazo = allQazoLogs[dateStr] || {};

    return QAZO_PRAYERS.reduce(
      (total, prayer) => total + (dayQazo[prayer.key] || 0),
      0,
    );
  }
  function getQazoPeriodDayProgress(dateStr) {
    if (
      !qazoStartDate ||
      !qazoEndDate ||
      dateStr < qazoStartDate ||
      dateStr > qazoEndDate
    ) {
      return 0;
    }

    const start = new Date(`${qazoStartDate}T00:00:00`);
    const current = new Date(`${dateStr}T00:00:00`);

    const dayIndex = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;

    const completedByPrayer = {};

    QAZO_PRAYERS.forEach((prayer) => {
      completedByPrayer[prayer.key] = 0;
    });

    Object.values(allQazoLogs).forEach((dayQazo) => {
      QAZO_PRAYERS.forEach((prayer) => {
        completedByPrayer[prayer.key] += dayQazo?.[prayer.key] || 0;
      });
    });

    let completedCount = 0;

    QAZO_PRAYERS.forEach((prayer) => {
      if (completedByPrayer[prayer.key] >= dayIndex) {
        completedCount++;
      }
    });

    return completedCount;
  }
  function getQazoPeriodCompletedCount(dateStr) {
    if (
      !qazoStartDate ||
      !qazoEndDate ||
      dateStr < qazoStartDate ||
      dateStr > qazoEndDate
    ) {
      return 0;
    }

    return getQazoPeriodDayProgress(dateStr);
  }
  function isQazoPrayerCompletedForPeriodDay(dateStr, prayerKey) {
    if (
      !qazoStartDate ||
      !qazoEndDate ||
      dateStr < qazoStartDate ||
      dateStr > qazoEndDate
    ) {
      return false;
    }

    const start = new Date(`${qazoStartDate}T00:00:00`);
    const current = new Date(`${dateStr}T00:00:00`);

    const dayIndex = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;

    let completedCount = 0;

    Object.values(allQazoLogs).forEach((dayQazo) => {
      completedCount += dayQazo?.[prayerKey] || 0;
    });

    return completedCount >= dayIndex;
  }

  function getQazoPeriodDayStatus(dateStr) {
    const completedCount = getQazoPeriodDayProgress(dateStr);

    if (completedCount === QAZO_PRAYERS.length) {
      return "complete";
    }

    if (completedCount > 0) {
      return "partial";
    }

    return "missed";
  }

  function getDayStatus(dateStr) {
    // Future date
    if (dateStr > todayStr) {
      return "upcoming";
    }

    // Historical qazo period
    if (
      qazoStartDate &&
      qazoEndDate &&
      dateStr >= qazoStartDate &&
      dateStr <= qazoEndDate
    ) {
      const qazoCompletedCount = getQazoPeriodDayProgress(dateStr);

      if (qazoCompletedCount === QAZO_PRAYERS.length) {
        return "complete";
      }

      if (qazoCompletedCount > 0) {
        return "partial";
      }

      return "missed";
    }

    // Before registration and outside the qazo period
    // Treat these days as fully completed virtual history.
    if (dateStr < registrationDate) {
      return "complete";
    }

    // Registration date and all dates after it
    // Use actual prayer logs.
    const completedCount = getCompletedPrayerCount(dateStr);

    // All 5 prayers completed
    if (completedCount === PRAYERS.length) {
      return "complete";
    }

    // At least one prayer completed, but not all
    if (completedCount > 0) {
      return "partial";
    }

    // No prayers completed
    return "missed";
  }

  function getSelectedDayLogs() {
    if (!selectedDate) {
      return {};
    }

    return allLogs[selectedDate] || {};
  }

  function getSelectedDayQazo() {
    if (!selectedDate) {
      return {};
    }

    return allQazoLogs[selectedDate] || {};
  }

  function getSelectedPrayerStatus(prayerKey) {
    if (!selectedDate) {
      return "none";
    }

    // Future date
    if (selectedDate > todayStr) {
      return "upcoming";
    }

    // Qazo period
    if (
      qazoStartDate &&
      qazoEndDate &&
      selectedDate >= qazoStartDate &&
      selectedDate <= qazoEndDate
    ) {
      const isQazoDone = isQazoPrayerCompletedForPeriodDay(
        selectedDate,
        prayerKey,
      );

      if (isQazoDone) {
        return "completed";
      }

      return "qazo";
    }

    // Before registration and outside the qazo period
    // These dates are displayed as completed 5/5.
    if (selectedDate < registrationDate) {
      return "completed";
    }

    // From registration date onward:
    // Use the real stored prayer status.
    const isDone = selectedDayLogs[prayerKey]?.completed === true;

    if (isDone) {
      return "completed";
    }

    // Today: not completed yet, so it is still pending.
    if (selectedDate === todayStr) {
      return "pending";
    }

    // Previous registered day: not completed, therefore qazo.
    if (selectedDate < todayStr) {
      return "qazo";
    }

    return "none";
  }

  const selectedDateObj = selectedDate
    ? new Date(`${selectedDate}T00:00:00`)
    : null;

  const selectedDayLogs = getSelectedDayLogs();
  const selectedDayQazo = getSelectedDayQazo();

  const selectedQazoProgress = selectedDate ? getQazoProgress(selectedDate) : 0;

  const selectedCompletedCount = selectedDate
    ? qazoStartDate &&
      qazoEndDate &&
      selectedDate >= qazoStartDate &&
      selectedDate <= qazoEndDate
      ? getQazoPeriodCompletedCount(selectedDate)
      : getCompletedPrayerCount(selectedDate)
    : 0;

  const selectedMissedCount = selectedDate
    ? getMissedPrayerCount(selectedDate)
    : 0;

  return (
    <div className="animate-fade-in">
      <AppHeader title={UZBEK_TERMS.calendar} />

      <div
        className="
          px-3 sm:px-5 lg:px-0
          pt-4 lg:pt-6
          pb-24 lg:pb-8
        "
      >
        {loading ? (
          <Card padding="md">
            <Spinner label={UZBEK_TERMS.loading} className="py-16" />
          </Card>
        ) : error ? (
          <Card padding="md">
            <ErrorState onRetry={loadData} />
          </Card>
        ) : (
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-5
              gap-4
              lg:gap-5
              items-start
            "
          >
            {/* =========================================
                DAY DETAILS
            ========================================== */}
            <div
              className="
                order-2
                lg:order-2
                lg:col-span-2
              "
            >
              {selectedDate && selectedDateObj ? (
                <Card padding="md" className="lg:sticky lg:top-5">
                  {/* DATE HEADER */}
                  <div className="mb-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2
                          className="
                            text-lg
                            sm:text-xl
                            font-bold
                            text-green-800
                            tracking-tight
                          "
                        >
                          {selectedDateObj.getDate()}{" "}
                          {getMonthName(selectedDateObj.getMonth())}{" "}
                          {selectedDateObj.getFullYear()}
                        </h2>

                        <p className="text-green-400 text-xs mt-1">
                          {getWeekdayName(selectedDateObj.getDay())}
                        </p>
                      </div>

                      {selectedDate === todayStr && (
                        <span
                          className="
                            shrink-0
                            px-2.5
                            py-1
                            rounded-full
                            bg-gold-50
                            text-[10px]
                            font-semibold
                          "
                        >
                          Bugun
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CURRENT PRAYERS */}
                  <section>
                    <div className="flex items-center justify-between mb-2.5">
                      <p
                        className="
                          text-[11px]
                          uppercase
                          tracking-wider
                          font-semibold
                          text-green-400
                        "
                      >
                        {selectedDate === todayStr
                          ? "Bugungi namozlar"
                          : "Namozlar"}
                      </p>

                      <span
                        className="
                          text-xs
                          font-semibold
                          text-green-700
                          tabular-nums
                        "
                      >
                        {selectedCompletedCount} / {PRAYERS.length}
                      </span>
                    </div>

                    <div
                      className="
                        rounded-2xl
                        bg-cream-50/70
                        overflow-hidden
                        border
                        border-cream-100
                      "
                    >
                      {PRAYERS.map((prayer) => {
                        const prayerStatus = getSelectedPrayerStatus(
                          prayer.key,
                        );

                        const isDone = prayerStatus === "completed";
                        const isUpcoming = prayerStatus === "upcoming";
                        const isQazoPeriod = prayerStatus === "qazo-period";
                        const isPending = prayerStatus === "pending";
                        const isQazo = prayerStatus === "qazo";

                        return (
                          <div
                            key={prayer.key}
                            className="
        flex
        items-center
        gap-3
        px-3
        sm:px-3.5
        py-3
        border-b
        border-cream-200/60
        last:border-b-0
      "
                          >
                            <div
                              className={`
          w-8
          h-8
          rounded-lg
          flex
          items-center
          justify-center
          shrink-0
          ${
            isDone
              ? "bg-green-50 text-green-600"
              : isUpcoming
                ? "bg-cream-100 text-green-300"
                : isQazoPeriod
                  ? "bg-purple-50 text-purple-400"
                  : isPending
                    ? "bg-gold-50 text-gold-500"
                    : isQazo
                      ? "bg-red-50 text-red-400"
                      : "bg-red-50 text-red-400"
          }
        `}
                            >
                              {isDone ? (
                                <CheckIcon size={17} />
                              ) : isUpcoming ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                              ) : isQazoPeriod ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
                              ) : isPending ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                              ) : (
                                <XIcon size={17} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p
                                className="
            text-sm
            font-medium
            text-green-700
          "
                              >
                                {prayer.name}
                              </p>
                            </div>

                            <span
                              className={`
          text-[11px]
          sm:text-xs
          font-semibold
          whitespace-nowrap
          ${
            isDone
              ? "text-green-600"
              : isUpcoming
                ? "text-green-400"
                : isQazoPeriod
                  ? "text-red-500"
                  : isPending
                    ? "text-gold-500"
                    : "text-red-400"
          }
        `}
                            >
                              {isDone
                                ? "Bajarildi"
                                : isUpcoming
                                  ? selectedDayPrayerTimes?.[prayer.key] || "—"
                                  : isPending
                                    ? "Kutilmoqda"
                                    : "Qazo bo'ldi"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* DAILY SUMMARY */}
                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-2
                      gap-2
                    "
                  >
                    <div
                      className="
                        rounded-xl
                        bg-green-50/70
                        px-3
                        py-2.5
                      "
                    >
                      <p className="text-[10px] text-green-400">Namozlar</p>

                      <p
                        className="
                          text-sm
                          font-bold
                          text-green-700
                          mt-0.5
                          tabular-nums
                        "
                      >
                        {selectedCompletedCount} / {PRAYERS.length}
                      </p>
                    </div>

                    <div
                      className="
                        rounded-xl
                        bg-cream-100
                        px-3
                        py-2.5
                      "
                    >
                      <p className="text-[10px] text-green-400">Qazo</p>

                      <p
                        className="
                          text-sm
                          font-bold
                          text-green-700
                          mt-0.5
                          tabular-nums
                        "
                      >
                        {selectedQazoProgress}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card padding="md">
                  <div className="py-12 text-center bg-red-600">
                    <Calendar size={32} />

                    <p className="text-sm text-green-400 mt-3">Kun tanlang</p>
                  </div>
                </Card>
              )}
            </div>

            {/* =========================================
                CALENDAR
            ========================================== */}
            <Card
              padding="md"
              className="
                order-1
                lg:order-1
                lg:col-span-3
              "
            >
              {/* MONTH HEADER */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  mb-4
                "
              >
                <button
                  type="button"
                  onClick={() => goToMonth(-1)}
                  className="
                    w-9
                    h-9
                    sm:w-10
                    sm:h-10
                    rounded-xl
                    bg-cream-100
                    text-green-600
                    flex
                    items-center
                    justify-center
                    active:scale-90
                    hover:bg-cream-200
                    transition-all
                  "
                  aria-label="Oldingi oy"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-center">
                  <h2
                    className="
                      text-base
                      sm:text-lg
                      font-bold
                      text-green-800
                      tracking-tight
                    "
                  >
                    {getMonthName(month)} {year}
                  </h2>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={goToToday}
                      className="
      inline-flex
      items-center
      justify-center
      rounded-full
      border border-green-200
      bg-green-50
      px-3
      py-1.5
      text-[11px]
      font-medium
      text-green-600
      transition-all
      duration-200
      hover:border-green-300
      hover:bg-green-100
      hover:text-green-700
      active:scale-95
      sm:px-3.5
      sm:py-1.5
      sm:text-xs
    "
                    >
                      Bugunga o'tish
                    </button>
                    {qazoStartDate && (
                      <button
                        type="button"
                        onClick={goToQazoStart}
                        className="
        inline-flex
        items-center
        justify-center
        rounded-full
        border border-purple-200
        bg-purple-50
        px-3
        py-1.5
        text-[11px]
        font-medium
        text-purple-600
        transition-all
        duration-200
        hover:border-purple-300
        hover:bg-purple-100
        hover:text-purple-700
        active:scale-95
        sm:px-3.5
        sm:py-1.5
        sm:text-xs
      "
                      >
                        Qazo davriga o'tish
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goToMonth(1)}
                  className="
                    w-9
                    h-9
                    sm:w-10
                    sm:h-10
                    rounded-xl
                    bg-cream-100
                    text-green-600
                    flex
                    items-center
                    justify-center
                    active:scale-90
                    hover:bg-cream-200
                    transition-all
                  "
                  aria-label="Keyingi oy"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* WEEKDAYS */}
              <div
                className="
                  grid
                  grid-cols-7
                  gap-1
                  mb-2
                "
              >
                {WEEK_DAYS.map((day) => (
                  <div
                    key={day}
                    className="
                      text-center
                      text-[10px]
                      sm:text-xs
                      font-semibold
                      text-green-400
                      py-1.5
                    "
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* DAYS */}
              <div
                className="
                  grid
                  grid-cols-7
                  gap-1
                  sm:gap-1.5
                "
              >
                {monthDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div key={`empty-${index}`} className="aspect-square" />
                    );
                  }

                  const dateStr = formatDate(new Date(year, month, day));

                  const isToday = dateStr === todayStr;

                  const isSelected = dateStr === selectedDate;

                  const isQazoPeriodDay =
                    qazoStartDate &&
                    qazoEndDate &&
                    dateStr >= qazoStartDate &&
                    dateStr <= qazoEndDate &&
                    getQazoPeriodDayProgress(dateStr) < QAZO_PRAYERS.length;

                  const status = getDayStatus(dateStr);

                  const style =
                    DAY_STATUS_STYLES[status] || DAY_STATUS_STYLES.none;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`
                        relative
                        aspect-square
                        rounded-xl
                        flex
                        flex-col
                        items-center
                        justify-center
                        transition-all
                        active:scale-95
                        ${
                          isSelected
                            ? "bg-green-700 shadow-soft"
                            : "hover:bg-cream-100"
                        }
                        ${
                          isQazoPeriodDay
                            ? "ring-1 sm:ring-2 ring-purple-400 ring-inset"
                            : isToday && !isSelected
                              ? "ring-1 sm:ring-2 ring-black"
                              : ""
                        }
                      `}
                      aria-label={`${day} ${getMonthName(month)} ${year}`}
                    >
                      <span
                        className={`
                          text-xs
                          sm:text-sm
                          font-semibold
                          ${isSelected ? "text-cream-50" : "text-green-700"}
                        `}
                      >
                        {day}
                      </span>

                      <span
                        className={`
                          absolute
                          bottom-1
                          sm:bottom-1.5
                          w-1
                          h-1
                          sm:w-1.5
                          sm:h-1.5
                          rounded-full
                          ${style.dot}
                          ${isSelected ? "ring-1 ring-cream-50/50" : ""}
                        `}
                      />
                    </button>
                  );
                })}
              </div>

              {/* LEGEND */}
              <div
                className="
                  mt-5
                  pt-4
                  border-t
                  border-cream-200/70
                "
              >
                <div
                  className="
                    flex
                    flex-wrap
                    gap-x-4
                    gap-y-2.5
                  "
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />

                    <span className="text-[10px] text-green-500">
                      Barchasi bajarilgan
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />

                    <span className="text-[10px] text-gold-400">
                      Ba'zilari qolgan
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />

                    <span className="text-[10px] text-red-500">
                      Barchasi qazo bo'lgan
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />

                    <span className="text-[10px] text-purple-500">
                      Qazo maqsadi
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm ring-1 ring-black" />

                    <span className="text-[10px]">Bugun</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
