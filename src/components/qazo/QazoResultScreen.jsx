import { useState } from "react";
import { QAZO_PRAYERS } from "../../lib/qazoService";
import Button from "../ui/Button";
import { formatDateNice, formatDate, formatNumber } from "../../lib/dateUtils";
import { Clock3, Info } from "lucide-react";

// Farz rak'ahs for each prayer
const RAKAH_COUNT = {
  bomdod: 2,
  peshin: 4,
  asr: 4,
  shom: 3,
  xufton: 4,
};

// Xufton vitr rak'ahs
const VITR_RAKAH = 3;

export default function QazoResultScreen({ result, onContinue }) {
  // Calculate total rak'ahs from the number of missed prayers
  function calculateTotalRakahs(byPrayer) {
    return Object.entries(byPrayer).reduce((sum, [key, count]) => {
      const farzRakah = RAKAH_COUNT[key] || 0;
      const vitrRakah = key === "xufton" ? VITR_RAKAH : 0;

      return sum + count * (farzRakah + vitrRakah);
    }, 0);
  }

  const [balance, setBalance] = useState({
    byPrayer: { ...result.byPrayer },
    total: calculateTotalRakahs(result.byPrayer),
  });
  const missedDays = Math.max(...Object.values(balance.byPrayer));

  function formatQazoDuration(totalDays) {
    const years = Math.floor(totalDays / 365);
    const remainingAfterYears = totalDays % 365;

    const months = Math.floor(remainingAfterYears / 30);
    const days = remainingAfterYears % 30;

    const parts = [];

    if (years > 0) parts.push(`${years} yil`);
    if (months > 0) parts.push(`${months} oy`);
    if (days > 0) parts.push(`${days} kun`);

    return parts.length > 0 ? parts.join(" ") : "0 kun";
  }

  const missedDuration = formatQazoDuration(missedDays);
  // Get the total rak'ahs for one specific prayer
  function getPrayerRakahs(prayerKey) {
    const count = balance.byPrayer[prayerKey] || 0;
    const farzRakah = RAKAH_COUNT[prayerKey] || 0;
    const vitrRakah = prayerKey === "xufton" ? VITR_RAKAH : 0;

    return count * (farzRakah + vitrRakah);
  }

  function adjust(prayerKey, delta) {
    setBalance((prev) => {
      const current = prev.byPrayer[prayerKey] || 0;
      const newVal = Math.max(0, current + delta);

      const byPrayer = {
        ...prev.byPrayer,
        [prayerKey]: newVal,
      };

      const total = calculateTotalRakahs(byPrayer);

      return {
        byPrayer,
        total,
      };
    });
  }

  function handleContinue() {
    onContinue(balance);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f4ed] to-[#f1eee6] flex flex-col items-center px-3 sm:px-6 py-10 lg:py-14">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center mb-6 shadow-[0_8px_28px_rgba(23,61,42,0.22)]">
          <Clock3 size={50} strokeWidth={1.5} color="#FBF8F1" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-2 leading-tight tracking-tight">
          Sizning qazo namozlaringiz
        </h2>

        <p className="text-green-400 text-sm mb-1">taxminan</p>

        <p className="text-5xl font-bold text-green-700 mb-0.5 tabular-nums tracking-tight">
          {formatNumber(balance.total)}
        </p>

        <p className="text-green-500 text-lg font-medium">rak‘at</p>

        <div
          className="
    mt-3
    inline-flex max-w-full
    flex-wrap items-center justify-center
    gap-x-2 gap-y-1
    rounded-full
    border border-green-100
    bg-green-50/80
    px-3.5 py-2
    shadow-sm
  "
        >
          <span className="text-sm font-bold text-green-700 tabular-nums">
            {missedDuration}
          </span>
          =
          <span className="text-sm font-bold text-green-700 tabular-nums">
            {formatNumber(missedDays)} kun
          </span>
          <span className="text-xs sm:text-sm font-medium text-green-600">
            qazo
          </span>
        </div>

        {/* Estimate Information */}
        {result.isEstimate && (
          <div className="mt-4 bg-gold-50/80 border border-gold-200/60 rounded-xl px-4 py-3 flex items-start gap-3 text-left">
            <Info className="text-gold-600 shrink-0 mt-0.5" size={20} />

            <p className="text-gold-700 text-xs leading-relaxed text-left">
              Taxminiy qazo — bu hisob-kitob sizga namoz farz bo‘lgan kundan (
              {formatDateNice(formatDate(result.startDate))}) boshlab, muntazam
              namoz o‘qishni boshlaganingizgacha bo‘lgan davr uchun hisoblangan.
              <br />
              Bu natijani o‘zgartirishingiz mumkin.
            </p>
          </div>
        )}

        {/* Prayer List */}
        <div className="w-full mt-6 space-y-2.5">
          <p className="text-green-600 font-semibold text-sm text-left mb-2">
            Har bir namoz bo‘yicha:
          </p>

          {QAZO_PRAYERS.map((prayer) => {
            const missedDays = balance.byPrayer[prayer.key] || 0;
            const totalRakahs = getPrayerRakahs(prayer.key);

            return (
              <div
                key={prayer.key}
                className="
        group
        rounded-2xl
        border border-cream-200/70
        bg-cream-50
        px-3.5 py-3
        sm:px-4 sm:py-3.5
        shadow-[0_2px_12px_rgba(23,61,42,0.04)]
        transition-all duration-200
        hover:border-green-100
        hover:shadow-[0_5px_18px_rgba(23,61,42,0.07)]
      "
              >
                <div className="flex items-center justify-between gap-3">
                  {/* ===================================================== */}
                  {/* PRAYER INFO */}
                  {/* ===================================================== */}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-green-700">
                          {prayer.name}
                        </p>

                        <p className="mt-0.5 text-[11px] sm:text-xs text-green-500 leading-tight">
                          {prayer.key === "xufton" ? (
                            <>
                              {formatNumber(missedDays * 4)} farz
                              <span className="mx-1 text-green-300">+</span>
                              {formatNumber(missedDays * 3)} vitr
                            </>
                          ) : (
                            <>{formatNumber(totalRakahs)} rak‘at farz</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ===================================================== */}
                  {/* QAZO DAYS CONTROL */}
                  {/* ===================================================== */}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Minus */}
                    <button
                      type="button"
                      onClick={() => adjust(prayer.key, -1)}
                      disabled={missedDays === 0}
                      className="
              flex h-9 w-9
              items-center justify-center
              rounded-xl
              border border-cream-200
              bg-cream-100
              text-lg font-semibold leading-none
              text-green-600
              transition-all duration-150
              hover:bg-cream-200
              active:scale-90
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
                      aria-label={`${prayer.name} qazo kunini kamaytirish`}
                    >
                      −
                    </button>

                    {/* Number */}
                    <div
                      className="
              flex h-9
              min-w-[2.75rem]
              items-center justify-center
              rounded-xl
              border border-green-100
              bg-green-50
              px-2
            "
                    >
                      <span className="text-xs font-bold tabular-nums text-green-700">
                        {formatNumber(missedDays)} <br />
                        kun
                      </span>
                    </div>

                    {/* Plus */}
                    <button
                      type="button"
                      onClick={() => adjust(prayer.key, 1)}
                      className="
              flex h-9 w-9
              items-center justify-center
              rounded-xl
              bg-green-700
              text-lg font-semibold leading-none
              text-cream-50
              shadow-[0_2px_8px_rgba(23,61,42,0.14)]
              transition-all duration-150
              hover:bg-green-800
              active:scale-90
            "
                      aria-label={`${prayer.name} qazo kunini oshirish`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        <p className="text-green-400 text-xs leading-relaxed mt-5 text-center">
          Har bir qazo namozining rak‘atlari alohida hisoblanadi. Miqdorni
          o‘zgartirsangiz, umumiy rak‘at soni ham avtomatik yangilanadi.
        </p>

        {/* Continue */}
        <div className="w-full mt-6 pb-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleContinue}
          >
            Davom etish
          </Button>
        </div>
      </div>
    </div>
  );
}
