import StepWrapper from "./StepWrapper";
import {
  ONBOARDING_TERMS,
  GENDER_OPTIONS,
  CONSISTENCY_OPTIONS,
  PRAYER_START_TYPES,
  MENSTRUATION_OPTIONS,
} from "../../constants/onboarding";
import { calculateAccountabilityDate } from "../../lib/accountability";
import { formatDateNice } from "../../lib/dateUtils";
import { Pencil } from "lucide-react";

function findLabel(options, key) {
  const found = options.find((o) => o.key === key);
  return found ? found.label : "—";
}

export default function ReviewStep({ profile, onEdit }) {
  const accountabilityDate =
    profile.accountabilityDate ||
    (profile.birthDate && profile.gender
      ? calculateAccountabilityDate(profile.birthDate, profile.gender)
      : null);

  const rows = [
    {
      label: "Jins",
      value: findLabel(GENDER_OPTIONS, profile.gender),
      step: "gender",
    },
    {
      label: "Tug'ilgan sana",
      value: formatDateNice(profile.birthDate),
      step: "birth_date",
    },
    {
      label: "Balog'at yoshi sanasi",
      value: accountabilityDate
        ? formatDateNice(
            accountabilityDate instanceof Date
              ? accountabilityDate.toLocaleDateString("en-CA")
              : accountabilityDate,
          )
        : "—",
      step: "birth_date",
    },
    {
      label: "Muntazam namoz boshlangan",
      value: profile.regularPrayerStartDate
        ? {
            type: findLabel(PRAYER_START_TYPES, profile.regularPrayerStartType),
            date: formatDateNice(profile.regularPrayerStartDate),
          }
        : {
            type: findLabel(PRAYER_START_TYPES, profile.regularPrayerStartType),
            date: null,
          },
      step: "prayer_start",
    },

    {
      label: "Oldingi izchillik",
      value: findLabel(CONSISTENCY_OPTIONS, profile.consistencyEstimate),
      step: "prayer_start",
    },
  ];

  if (profile.gender === "female") {
    let mensValue = findLabel(MENSTRUATION_OPTIONS, profile.menstruationDays);
    if (
      profile.menstruationDays === "custom" &&
      profile.customMenstruationDays
    ) {
      mensValue = `${profile.customMenstruationDays} kun`;
    }
    rows.push({
      label: "Hayz davri",
      value: mensValue,
      step: "menstruation",
    });
  }

  return (
    <StepWrapper title={ONBOARDING_TERMS.reviewTitle}>
      <div className="w-full max-w-md space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="bg-cream-50 rounded-xl shadow-soft p-4 flex items-center justify-between gap-4 min-h-[76px]"
          >
            <div className="text-left flex-1 break-words">
              <p className="text-green-500 text-xs font-medium mb-0.5">
                {row.label}
              </p>

              {typeof row.value === "object" && row.value !== null ? (
                <div className="text-sm font-semibold text-green-700 leading-relaxed">
                  <p className="text-green-600 font-bold">{row.value.type}:</p>
                  {row.value.date && (
                    <p className="text-green-600 text-sm font-semibold mt-0.5">
                      {row.value.date}
                    </p>
                  )}
                </div>
              ) : (
                /* Qolgan oddiy qatorlar uchun (Jins, Tug'ilgan sana va hk) */
                <p className="text-green-700 text-sm font-semibold leading-relaxed">
                  {row.value}
                </p>
              )}
            </div>

            {onEdit && (
              <button
                onClick={() => onEdit(row.step)}
                className="shrink-0 text-green-500 hover:text-green-700 text-sm font-medium p-2 rounded-xl hover:bg-green-100/50 active:bg-green-100 transition-colors"
                aria-label={`${row.label}ni tahrirlash`}
              >
                <Pencil size={18} className="stroke-[2.5]" />
              </button>
            )}
          </div>
        ))}
      </div>
    </StepWrapper>
  );
}
