import { useState } from "react";
import StepWrapper from "./StepWrapper";
import { ONBOARDING_TERMS } from "../../constants/onboarding";
import { formatDateNice, todayKey } from "../../lib/dateUtils";
import { Info } from "lucide-react";

export default function BirthDateStep({
  value,
  onChange,
  gender,
  accountabilityDate,
  onAccountabilityDateChange,
}) {
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState(value || "");
  const [accountabilityInputValue, setAccountabilityInputValue] = useState(
    accountabilityDate || "",
  );

  const accountabilityAge = gender === "female" ? 9 : 12;

  // Get today's date in the user's local timezone.
  // This avoids the UTC issue caused by toISOString().
  function getLocalDateString() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Add years to YYYY-MM-DD without UTC conversion.
  function addYearsToDate(dateString, years) {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-").map(Number);

    if (!year || !month || !day) return "";

    const newYear = year + years;

    return `${newYear}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}`;
  }

  function handleDateChange(e) {
    const dateStr = e.target.value;

    setInputValue(dateStr);

    if (!dateStr) {
      setAccountabilityInputValue("");

      if (onAccountabilityDateChange) {
        onAccountabilityDateChange(null);
      }

      return;
    }

    const calculatedDate = addYearsToDate(dateStr, accountabilityAge);

    if (calculatedDate) {
      setAccountabilityInputValue(calculatedDate);

      if (onAccountabilityDateChange) {
        onAccountabilityDateChange(calculatedDate);
      }
    }
  }

  function handleDateBlur() {
    const dateStr = inputValue;

    if (!dateStr) {
      onChange(null);

      if (onAccountabilityDateChange) {
        onAccountabilityDateChange(null);
      }

      setError("");
      return;
    }

    if (dateStr < "1900-01-01") {
      setError("1900-yildan oldingi sanani tanlash mumkin emas");

      setTimeout(() => {
        setError("");
      }, 3000);

      return;
    }

    if (dateStr > todayKey()) {
      setError("Kelajak sanani tanlash mumkin emas");

      setTimeout(() => {
        setError("");
      }, 3000);

      return;
    }

    setError("");
    onChange(dateStr);

    const calculatedDate = addYearsToDate(dateStr, accountabilityAge);

    if (calculatedDate) {
      setAccountabilityInputValue(calculatedDate);

      if (onAccountabilityDateChange) {
        onAccountabilityDateChange(calculatedDate);
      }
    }
  }

  function handleAccountabilityDateChange(e) {
    const dateStr = e.target.value;

    setAccountabilityInputValue(dateStr);

    if (onAccountabilityDateChange) {
      onAccountabilityDateChange(dateStr || null);
    }
  }

  function handleAccountabilityDateBlur() {
    const dateStr = accountabilityInputValue;

    if (!dateStr) return;

    if (dateStr < "1900-01-01") {
      if (onAccountabilityDateChange) {
        onAccountabilityDateChange(null);
      }

      setError("1900-yildan oldingi sanani tanlash mumkin emas");

      setTimeout(() => {
        setError("");
      }, 3000);

      return;
    }

    if (dateStr > todayKey()) {
      if (onAccountabilityDateChange) {
        onAccountabilityDateChange(null);
      }

      setError("Kelajak sanani tanlash mumkin emas");

      setTimeout(() => {
        setError("");
      }, 3000);

      return;
    }

    setError("");
  }

  const dateValue = inputValue;

  const displayedAccountabilityDate =
    accountabilityDate ||
    (dateValue ? addYearsToDate(dateValue, accountabilityAge) : "");

  return (
    <StepWrapper title={ONBOARDING_TERMS.birthDateTitle}>
      <div className="w-full max-w-sm space-y-5">
        {/* Tug'ilgan sana */}
        <div className="bg-cream-50 rounded-card shadow-card p-6">
          <label className="block text-green-500 text-sm font-medium mb-3">
            Tug'ilgan sana
          </label>

          <input
            type="date"
            value={inputValue}
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            min="1900-01-01"
            max={todayKey()}
            className="w-full px-4 py-4 rounded-xl border-2 border-cream-200 text-green-700 text-lg font-medium focus:outline-none focus:border-green-400 transition-colors bg-cream-50"
          />

          {dateValue && (
            <p className="mt-3 text-green-700 text-base font-semibold">
              {formatDateNice(dateValue)}
            </p>
          )}
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
        )}

        {/* Balog'at yoshi sanasi */}
        {dateValue && (
          <div className="bg-cream-50 rounded-card shadow-card p-6">
            <label className="block text-green-500 text-sm font-medium mb-2">
              Balog'at yoshi sanasi
            </label>

            <p className="text-green-600 text-xs leading-relaxed mb-3">
              Tug'ilgan sanangiz asosida taxminiy ravishda{" "}
              <span className="font-semibold">{accountabilityAge} yosh</span>{" "}
              qo'shib hisoblandi. Agar bu sana siz uchun boshqacha bo'lsa,
              quyidagi sanani o'zgartirishingiz mumkin.
            </p>

            <input
              type="date"
              value={accountabilityInputValue}
              onChange={handleAccountabilityDateChange}
              onBlur={handleAccountabilityDateBlur}
              min="1900-01-01"
              max={todayKey()}
              className="w-full px-4 py-4 rounded-xl border-2 border-cream-200 text-green-700 text-lg font-medium focus:outline-none focus:border-green-400 transition-colors bg-cream-50"
            />

            {displayedAccountabilityDate && (
              <p className="mt-3 text-green-700 text-base font-semibold">
                {formatDateNice(displayedAccountabilityDate)}
              </p>
            )}

            <div className="mt-3 flex items-start gap-2">
              <Info className="text-green-600 shrink-0 mt-0.5" size={18} />

              <p className="text-green-600 text-xs leading-relaxed">
                {gender === "female"
                  ? ONBOARDING_TERMS.femaleAccountability
                  : ONBOARDING_TERMS.maleAccountability}
              </p>
            </div>
          </div>
        )}

        {/* General information */}
        <div className="bg-green-100 rounded-xl p-4 flex items-start gap-3">
          <Info className="text-green-600 shrink-0 mt-0.5" size={22} />

          <div className="text-left">
            <p className="text-green-600 text-sm leading-relaxed">
              {ONBOARDING_TERMS.accountabilityNote}
            </p>
          </div>
        </div>
      </div>
    </StepWrapper>
  );
}
