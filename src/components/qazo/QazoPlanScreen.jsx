import { useState, useEffect } from "react";
import {
  QAZO_PLAN_OPTIONS,
  loadQazoBalance,
  getQazoTotal,
  calculateCompletionEstimate,
  formatCompletionEstimate,
  saveQazoPlan,
  loadQazoPlan,
} from "../../lib/qazoService";
import Button from "../ui/Button";
import { PRAYERS } from "../../constants/prayers";
import { CheckLine, MapPin, Plus, Tally1, Tally5 } from "lucide-react";
import { formatNumber } from "../../lib/dateUtils";

function PlanIcon({ type }) {
  if (type === "daily_1") {
    return <Tally1 />;
  }

  if (type === "daily_5") {
    return <Tally5 />;
  }

  return <Plus />;
}

export default function QazoPlanScreen({ onContinue }) {
  const [balance, setBalance] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("daily_5");
  // const [includeWitr, setIncludeWitr] = useState(true);
  const [customTarget, setCustomTarget] = useState(10);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const bal = await loadQazoBalance();
        setBalance(bal);

        const existingPlan = await loadQazoPlan();

        if (existingPlan?.planType) {
          let normalizedPlan =
            existingPlan.planType === "after_each"
              ? "daily_5"
              : existingPlan.planType;

          // Daily 5 is not allowed when total qazo is less than 5
          if (normalizedPlan === "daily_5" && getQazoTotal(bal) < 5) {
            normalizedPlan = "daily_1";
          }

          const supportedPlan = QAZO_PLAN_OPTIONS.some(
            (plan) => plan.key === normalizedPlan,
          );

          if (supportedPlan) {
            setSelectedPlan(normalizedPlan);
          }

          if (existingPlan.customDailyTarget) {
            setCustomTarget(
              Math.min(
                getQazoTotal(bal),
                Math.max(1, Number(existingPlan.customDailyTarget)),
              ),
            );
          }
        }
      } catch (error) {
        console.error("Qazo plan load error:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const qazoTotal = balance ? getQazoTotal(balance) : 0;
  const byPrayer = balance?.byPrayer || {};

  const availablePlans = QAZO_PLAN_OPTIONS.filter(
    (plan) => !(plan.key === "daily_5" && qazoTotal < 5),
  );

  const prayerCounts = PRAYERS.map((prayer) => ({
    ...prayer,
    count: Number(byPrayer[prayer.key] || 0),
  }));

  const dailyTarget =
    selectedPlan === "custom"
      ? customTarget
      : selectedPlan === "daily_5"
        ? 5
        : 1;

  const weeklyTarget = dailyTarget * 7;

  const estimate =
    selectedPlan !== "daily_1"
      ? calculateCompletionEstimate(balance, {
          planType: selectedPlan,
          customDailyTarget: customTarget,
          dailyTarget,
        })
      : null;

  const selectedPlanInfo =
    QAZO_PLAN_OPTIONS.find((plan) => plan.key === selectedPlan) ||
    QAZO_PLAN_OPTIONS[1];

  function getPlanSummary() {
    if (selectedPlan === "daily_1") {
      return "Kuniga 1 ta qazo namozi";
    }

    if (selectedPlan === "daily_5") {
      return "Har kuni Bomdod, Peshin, Asr, Shom va Xuftondan 1 tadan";
    }

    return `Har kuni ${formatNumber(customTarget)} ta qazo namozi`;
  }

  async function handleConfirm() {
    setSaving(true);

    try {
      const option = QAZO_PLAN_OPTIONS.find(
        (item) => item.key === selectedPlan,
      );

      await saveQazoPlan({
        planType: selectedPlan,
        label:
          selectedPlan === "custom"
            ? `Kuniga ${customTarget} ta`
            : option?.label || selectedPlanInfo.label,

        dailyTarget,

        customDailyTarget: selectedPlan === "custom" ? customTarget : null,

        planSetupCompleted: true,
      });

      onContinue();
    } catch (error) {
      console.error("Qazo plan save error:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f7f4ed] to-[#f1eee6] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-green-100 border-t-green-600 animate-spin mx-auto" />

          <p className="text-green-500 text-sm mt-4">
            Ma'lumotlar yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f4ed] to-[#f1eee6] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}

        <div className="text-center mb-6 lg:mb-7">
          <div
            className="
            w-14 h-14 sm:w-16 sm:h-16
            mx-auto
            rounded-3xl
            bg-gradient-to-br from-green-600 to-green-800
            flex items-center justify-center
            shadow-[0_8px_28px_rgba(23,61,42,0.22)]
            mb-4
          "
          >
            <CheckLine size={35} color="white" />
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-2xl font-bold text-green-700 leading-tight">
            Qazo rejangizni tanlang
          </h1>
        </div>

        {/* ========================================================= */}
        {/* MAIN CONTENT */}
        {/* ========================================================= */}

        <div className="space-y-5">
          {/* ======================================================= */}
          {/* PLAN + RESULT */}
          {/* ======================================================= */}

          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {/* ===================================================== */}
            {/* LEFT — QAZO PLAN */}
            {/* ===================================================== */}

            <div className="space-y-4">
              <section
                className="
                bg-cream-50
                rounded-3xl
                border border-cream-200/60
                shadow-[0_5px_22px_rgba(23,61,42,0.07)]
                p-4 sm:p-5 lg:p-6
              "
              >
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-green-700">
                    Qancha qazo o‘qimoqchisiz?
                  </h2>

                  <p className="text-green-400 text-xs mt-1">
                    Sizga barqaror bo‘ladigan miqdorni tanlang.
                  </p>
                </div>

                <div className="space-y-2">
                  {availablePlans.map((plan) => {
                    const selected = selectedPlan === plan.key;

                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedPlan(plan.key)}
                        className={`
                        w-full
                        flex items-center gap-3
                        text-left
                        rounded-2xl
                        p-3 sm:p-3.5
                        border-2
                        transition-all duration-200
                        active:scale-[0.99]
                        ${
                          selected
                            ? "bg-green-600 border-green-600 text-cream-50 shadow-[0_6px_18px_rgba(23,61,42,0.15)]"
                            : "bg-cream-50 border-cream-200 text-green-700 hover:border-green-200"
                        }
                      `}
                      >
                        {/* Plan icon */}
                        <div
                          className={`
                          w-9 h-9
                          rounded-xl
                          flex items-center justify-center
                          shrink-0
                          ${
                            selected
                              ? "bg-cream-50/15 text-cream-50"
                              : "bg-green-50 text-green-600"
                          }
                        `}
                        >
                          <PlanIcon type={plan.key} />
                        </div>

                        {/* Plan text */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{plan.label}</p>

                          <p
                            className={`
                            text-xs mt-1
                            ${selected ? "text-cream-100/75" : "text-green-400"}
                          `}
                          >
                            {plan.description}
                          </p>
                        </div>

                        {/* Radio */}
                        <div
                          className={`
                          w-5 h-5
                          rounded-full
                          border-2
                          flex items-center justify-center
                          shrink-0
                          ${selected ? "border-cream-50" : "border-green-200"}
                        `}
                        >
                          {selected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-cream-50" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Custom amount */}
              {selectedPlan === "custom" && (
                <section
                  className="
                  bg-cream-50
                  rounded-3xl
                  border border-cream-200/60
                  shadow-[0_5px_22px_rgba(23,61,42,0.07)]
                  p-4 sm:p-5
                  animate-scale-in
                "
                >
                  <p className="text-green-700 font-semibold text-sm">
                    Kunlik miqdor
                  </p>

                  <p className="text-green-400 text-xs mt-1 mb-4">
                    O‘zingizga qulay bo‘lgan miqdorni belgilang.
                  </p>

                  <div className="flex items-center gap-3">
                    {/* Minus */}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomTarget((value) => Math.max(1, value - 1))
                      }
                      className="
                      w-11 h-11
                      rounded-xl
                      bg-cream-100
                      border border-cream-200
                      text-green-600
                      flex items-center justify-center
                      font-bold text-xl
                      active:scale-90
                      transition-all
                    "
                      aria-label="Kamaytirish"
                    >
                      −
                    </button>

                    {/* Amount */}
                    <div className="flex-1 text-center">
                      <p className="text-2xl font-bold text-green-700 tabular-nums">
                        {formatNumber(customTarget)}
                      </p>

                      <p className="text-green-400 text-xs mt-0.5">ta / kun</p>
                    </div>

                    {/* Plus */}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomTarget((value) =>
                          Math.min(qazoTotal, value + 1),
                        )
                      }
                      className="
                      w-11 h-11
                      rounded-xl
                      bg-cream-100
                      border border-cream-200
                      text-green-600
                      flex items-center justify-center
                      font-bold text-xl
                      active:scale-90
                      transition-all
                    "
                      aria-label="Ko‘paytirish"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-green-400 text-xs text-center mt-3">
                    1–{qazoTotal} ta qazo / kun
                  </p>
                </section>
              )}
            </div>

            {/* ===================================================== */}
            {/* RIGHT — RESULT SUMMARY */}
            {/* ===================================================== */}

            <div
              className="
              bg-green-700
              rounded-3xl
              p-5 sm:p-6
              text-cream-50
              shadow-[0_8px_28px_rgba(23,61,42,0.16)]
            "
            >
              <p className="text-cream-100/65 text-xs">Sizning rejangiz</p>

              <p className="text-md sm:text-lg font-bold mt-1">
                {getPlanSummary()}
              </p>

              {/* Daily / Weekly stats */}
              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <div
                  className="
                  rounded-2xl
                  bg-cream-50/10
                  px-3.5 py-3
                "
                >
                  <p className="text-cream-100/60 text-[11px]">Kuniga</p>

                  <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">
                    {formatNumber(dailyTarget)}
                  </p>

                  <p className="text-cream-100/60 text-[11px] mt-0.5">qazo</p>
                </div>

                <div
                  className="
                  rounded-2xl
                  bg-cream-50/10
                  px-3.5 py-3
                "
                >
                  <p className="text-cream-100/60 text-[11px]">Haftasiga</p>

                  <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">
                    {formatNumber(weeklyTarget)}
                  </p>

                  <p className="text-cream-100/60 text-[11px] mt-0.5">qazo</p>
                </div>
              </div>

              {/* Estimated completion */}
              {qazoTotal > 0 && dailyTarget > 0 && (
                <div className="mt-5 pt-4 border-t border-cream-50/10">
                  <p className="text-cream-100/65 text-xs">
                    Taxminiy tugash vaqti
                  </p>

                  {selectedPlan === "daily_1" ? (
                    <p className="text-base sm:text-lg text-cream-100/60 leading-relaxed mt-1">
                      Qaysi qazo namozini o‘qishingizga bog'liq.
                    </p>
                  ) : (
                    <p className="text-base sm:text-lg font-semibold mt-1">
                      {formatCompletionEstimate(estimate)}
                    </p>
                  )}
                </div>
              )}

              {/* Plan explanation */}
              <div className="mt-3 pt-4 border-t border-cream-50/10">
                <p className="text-cream-100/65 text-xs leading-relaxed">
                  Rejangizni keyinchalik Sozlamalar orqali o‘zgartirishingiz
                  mumkin.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 w-fit text-center mr-auto ml-auto">
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">{/* info icon */}</div>

              <div>
                <p className="text-md font-semibold text-amber-800">
                  Qazo haqida eslatma
                </p>

                <p className="text-xs leading-relaxed text-amber-700 mt-1.5">
                  Sunnat namozlari qazo qilinmaydi. Qazo sifatida farz namozlari
                  va Vitr ado etiladi. Ushbu ilovada Vitr Xufton qazosining
                  tarkibida hisoblanadi, ya'ni: <br /> Xufton = 4 rak’at farz +
                  3 rak’at Vitr.
                </p>
              </div>
            </div>
          </div>
          {/* ========================================================= */}
          {/* SAVE — FULL WIDTH */}
          {/* ========================================================= */}

          <div className="pt-0 pb-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleConfirm}
              disabled={saving || dailyTarget < 1 || qazoTotal < 1}
            >
              {saving ? "Saqlanmoqda..." : "Rejani saqlash"}
            </Button>
          </div>

          {/* ========================================================= */}
          {/* FOOTER */}
          {/* ========================================================= */}

          <div className="text-center pb-5">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-amber-50 p-5 ">
              <div className="flex items-center justify-center gap-3 text-emerald-800">
                <span className="w-10 h-px bg-emerald-800" />

                <MapPin size={20} strokeWidth={1.5} />

                <span className="w-10 h-px bg-emerald-800" />
              </div>
              <div className="flex items-start gap-3.5 justify-center ">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-emerald-800">
                    Oz bo‘lsa ham, davomli bo‘lsin.
                  </h3>

                  <p className="mt-1.5 text-sm leading-6 text-emerald-700/75">
                    Qazo namozlaringiz qancha ko‘p bo‘lishidan qat’i nazar,
                    bugun boshlagan bir namozingiz ham yo‘lingizdagi bir
                    qadamdir.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-emerald-800">
                    Muhimi — boshlash, muntazam davom etish va taslim
                    bo‘lmaslik.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
