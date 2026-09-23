import { useState } from "react";
import StepWrapper from "./StepWrapper";
import {
  MENSTRUATION_OPTIONS,
  ONBOARDING_TERMS,
} from "../../constants/onboarding";

export default function MenstruationStep({
  value,
  onChange,
  customDays,
  onCustomDaysChange,
}) {
  const [customError, setCustomError] = useState("");

  function handleCustomChange(e) {
    const val = parseInt(e.target.value, 10);

    if (isNaN(val) || val < 3) {
      onCustomDaysChange(null);
      setCustomError("3 kundan kam bo'lmasin");
      return;
    }

    if (val > 10) {
      setCustomError("10 kundan ko'p bo'lmasin");
      return;
    }

    setCustomError("");
    onCustomDaysChange(val);
  }

  const isCustom = value === "custom";
  const customVal = customDays || "";

  return (
    <StepWrapper title={ONBOARDING_TERMS.menstruationTitle}>
      <div className="w-full max-w-sm space-y-4">
        {/* Explanation */}
        <div className="rounded-xl border border-pink-100 bg-pink-50/70 p-4 shadow-[-5px_-5px_10px_2px_rgba(0,0,0,0.1),_5px_5px_10px_2px_rgba(45,78,255,0.15)]">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xl bg-white text-pink-500 shadow-sm">
              🌸
            </div>

            <div>
              <p className="text-sm font-semibold text-pink-800">
                Nega bu ma’lumot kerak?
              </p>

              <p className="mt-1 text-xs leading-5 text-pink-700/80">
                Hayz kunlari qazo hisobiga kiritilmaydi. Bu ma’lumot qazo
                namozlaringizni aniqroq hisoblashga yordam beradi.
              </p>
            </div>
          </div>
        </div>

        {/* Menstruation options */}
        <div className="space-y-3">
          {MENSTRUATION_OPTIONS.map((option) => {
            const selected = value === option.key;

            return (
              <button
                key={option.key}
                onClick={() => onChange(option.key)}
                className={`
              w-full flex items-center justify-between
              px-5 py-4 rounded-xl
              transition-all duration-200
              ${
                selected
                  ? "bg-green-600 text-cream-50 shadow-soft"
                  : "bg-cream-50 text-green-600 shadow-card hover:shadow-soft active:scale-[0.98]"
              }
            `}
              >
                <span className="font-semibold text-base text-left">
                  {option.label}
                </span>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-cream-50" : "border-green-200"
                  }`}
                >
                  {selected && (
                    <div className="w-2 h-2 rounded-full bg-cream-50" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom duration */}
        {isCustom && (
          <div className="bg-cream-50 rounded-card shadow-card p-5 animate-scale-in">
            <label className="block text-green-500 text-sm font-medium mb-3">
              Kunlar sonini kiriting
            </label>

            <input
              type="number"
              value={customVal}
              onChange={handleCustomChange}
              min="3"
              max="10"
              placeholder="Masalan: 8"
              className="
            w-full px-4 py-3.5 rounded-xl
            border-2 border-cream-200
            text-green-700 text-base font-medium
            focus:outline-none focus:border-green-400
            transition-colors bg-cream-50
          "
            />

            {customError && (
              <p className="text-red-500 text-sm mt-2 text-left">
                {customError}
              </p>
            )}
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
