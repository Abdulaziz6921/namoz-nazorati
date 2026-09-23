import { useState } from "react";
import { Info, Check } from "lucide-react";
import StepWrapper from "./StepWrapper";
import { todayKey } from "../../lib/dateUtils";
import {
  PRAYER_START_TYPES,
  CONSISTENCY_OPTIONS,
  ONBOARDING_TERMS,
} from "../../constants/onboarding";

export default function PrayerStartStep({
  startType,
  onStartTypeChange,
  startDate,
  onStartDateChange,
  consistency,
  onConsistencyChange,
}) {
  const [dateError, setDateError] = useState("");

  function handleDateChange(e) {
    const dateStr = e.target.value;

    if (!dateStr) {
      onStartDateChange(null);
      return;
    }

    if (dateStr > todayKey()) {
      setDateError("Kelajak sanani tanlash mumkin emas");
      return;
    }

    setDateError("");
    onStartDateChange(dateStr);
  }

  const showDateInput = startType === "exact" || startType === "approximate";
  const dateValue = startDate || "";

  return (
    <StepWrapper title={ONBOARDING_TERMS.prayerStartTitle}>
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-2">
          {PRAYER_START_TYPES.map((option) => {
            const selected = startType === option.key;
            return (
              <button
                key={option.key}
                onClick={() => onStartTypeChange(option.key)}
                className={`
                  w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-200
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

        {showDateInput && (
          <div className="bg-cream-50 rounded-card shadow-card p-5 animate-scale-in">
            <label className="block text-green-500 text-sm font-medium mb-3">
              {startType === "exact"
                ? ONBOARDING_TERMS.prayerStartExact
                : ONBOARDING_TERMS.prayerStartApproximate}
            </label>
            <input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              max={todayKey()}
              min="1900-01-01"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-cream-200 text-green-700 text-base font-medium focus:outline-none focus:border-green-400 transition-colors bg-cream-50"
            />
            {dateError && (
              <p className="text-red-500 text-sm mt-2 text-left">{dateError}</p>
            )}
          </div>
        )}

        {startType === "unknown" && (
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3 animate-scale-in">
            <Info
              size={20}
              className="shrink-0 mt-0.5 text-[#2E6B4A]"
              strokeWidth={1.8}
            />
            <p className="text-green-600 text-sm leading-relaxed text-left">
              {ONBOARDING_TERMS.prayerStartUnknown}
            </p>
          </div>
        )}

        <div>
          <p className="text-green-600 font-semibold text-base mb-3 text-left">
            {ONBOARDING_TERMS.consistencyTitle}
          </p>
          <div className="space-y-2">
            {CONSISTENCY_OPTIONS.map((option) => {
              const selected = consistency === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => onConsistencyChange(option.key)}
                  className={`
                    w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-left
                    ${
                      selected
                        ? "bg-green-50 border border-green-300 text-green-700"
                        : "bg-cream-50 border border-cream-200 text-green-500 hover:border-green-200"
                    }
                  `}
                >
                  <span className="text-sm font-medium flex-1">
                    {option.label}
                  </span>
                  {selected && (
                    <Check
                      size={18}
                      className="text-[#1F5238]"
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StepWrapper>
  );
}
