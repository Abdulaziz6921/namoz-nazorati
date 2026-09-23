import { useState, useEffect } from "react";
import { loadProfile, saveProfile } from "../../lib/profileService";
import { recalculateQazoFromProfile } from "../../lib/qazoService";

import {
  GENDER_OPTIONS,
  CONSISTENCY_OPTIONS,
  PRAYER_START_TYPES,
  MENSTRUATION_OPTIONS,
} from "../../constants/onboarding";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { formatDate } from "../../lib/dateUtils";
import { EditIcon, TriangleAlert } from "lucide-react";

const QAZO_AFFECTING_FIELDS = [
  "gender",
  "birthDate",
  "accountabilityDate",
  "regularPrayerStartDate",
  "consistencyEstimate",
  "menstruationDays",
];

function dateToInputValue(dateStr) {
  if (!dateStr) return "";

  if (typeof dateStr === "string") {
    return dateStr.slice(0, 10);
  }

  return "";
}

function findLabel(options, key) {
  const found = options.find((o) => o.key === key);
  return found ? found.label : "—";
}

const LANGUAGE_OPTIONS = [{ key: "uz", label: "O'zbekcha" }];

export default function ProfileSection() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [customMensDays, setCustomMensDays] = useState("");

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setDraft(p);
      if (
        p?.menstruationDays &&
        !MENSTRUATION_OPTIONS.find(
          (o) => String(o.value) === String(p.menstruationDays),
        )
      ) {
        setCustomMensDays(String(p.menstruationDays));
      }
    });
  }, []);

  if (!profile || !draft) {
    return (
      <Card padding="md">
        <p className="text-green-400 text-sm text-center">Yuklanmoqda...</p>
      </Card>
    );
  }

  function startEdit() {
    setDraft({ ...profile });
    setEditing(true);
    if (
      profile.menstruationDays &&
      !MENSTRUATION_OPTIONS.find(
        (o) => String(o.value) === String(profile.menstruationDays),
      )
    ) {
      setCustomMensDays(String(profile.menstruationDays));
    }
  }

  function cancelEdit() {
    setDraft({ ...profile });
    setEditing(false);
  }

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function hasQazoImpact() {
    return QAZO_AFFECTING_FIELDS.some((field) => {
      if (field === "menstruationDays") {
        const oldVal = profile.menstruationDays;
        const newKey = draft.menstruationDays;
        let newVal = newKey;
        if (newKey === "custom" && customMensDays)
          newVal = parseInt(customMensDays, 10);
        else if (newKey && newKey !== "custom") newVal = parseInt(newKey, 10);
        return oldVal !== newVal;
      }
      if (field === "consistencyEstimate") {
        return profile.consistencyEstimate !== draft.consistencyEstimate;
      }
      return profile[field] !== draft[field];
    });
  }

  function handleSave() {
    if (hasQazoImpact()) {
      setShowConfirm(true);
      return;
    }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    setShowConfirm(false);

    try {
      const qazoImpact = hasQazoImpact();

      let toSave = { ...draft };

      if (draft.gender === "female") {
        if (draft.menstruationDays === "custom") {
          toSave.menstruationDays = customMensDays
            ? parseInt(customMensDays, 10)
            : null;
        } else if (draft.menstruationDays) {
          toSave.menstruationDays = parseInt(draft.menstruationDays, 10);
        }
      } else {
        toSave.menstruationDays = null;
      }

      const saved = await saveProfile(toSave);

      if (qazoImpact) {
        await recalculateQazoFromProfile(saved);
      }

      setProfile(saved);
      setDraft(saved);
      setEditing(false);
    } catch (error) {
      console.error("Profilni saqlashda xatolik:", error);
    } finally {
      setSaving(false);
    }
  }

  const rows = [
    {
      label: "Jins",
      field: "gender",
      value: findLabel(GENDER_OPTIONS, profile.gender),
    },
    {
      label: "Tug'ilgan sana",
      field: "birthDate",
      value: formatDate(profile.birthDate),
    },
    {
      label: "Hisobdorlik sanasi",
      field: "accountabilityDate",
      value: formatDate(profile.accountabilityDate),
    },
    {
      label: "Namozni muntazam boshlagan",
      field: "regularPrayerStartDate",
      // Qiymatni ob'ekt qilib yuboramiz
      value: profile.regularPrayerStartDate
        ? {
            type: findLabel(PRAYER_START_TYPES, profile.regularPrayerStartType),
            date: formatDate(profile.regularPrayerStartDate),
          }
        : {
            type: findLabel(PRAYER_START_TYPES, profile.regularPrayerStartType),
            date: null,
          },
    },
    {
      label: "Namoz o'qishdagi muntazamlik",
      field: "consistencyEstimate",
      value: findLabel(CONSISTENCY_OPTIONS, profile.consistencyEstimate),
    },
  ];

  if (profile.gender === "female") {
    let mensLabel = "—";
    if (profile.menstruationDays) {
      const opt = MENSTRUATION_OPTIONS.find(
        (o) => String(o.value) === String(profile.menstruationDays),
      );
      mensLabel = opt ? opt.label : `${profile.menstruationDays} kun`;
    }
    rows.push({
      label: "Hayz davomiyligi",
      field: "menstruationDays",
      value: mensLabel,
    });
  }

  rows.push({
    label: "Til",
    field: "language",
    value: findLabel(LANGUAGE_OPTIONS, profile.language) || "O'zbekcha",
  });

  return (
    <>
      <Card padding="md" className="!rounded-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-green-700">Profil ma'lumotlari</h3>
          {!editing ? (
            <button
              onClick={startEdit}
              className="text-green-500 hover:text-green-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              <EditIcon />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                className="text-green-400 hover:text-green-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-cream-100 transition-colors"
              >
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-cream-50 bg-green-600 hover:bg-green-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 py-3 border-b border-cream-100 last:border-0"
              >
                <span className="text-green-400 text-xs sm:text-sm font-medium shrink-0">
                  {row.label}
                </span>

                <div className="text-right flex-1 min-w-0 break-words">
                  {typeof row.value === "object" && row.value !== null ? (
                    <div className="text-xs sm:text-sm font-semibold text-green-700 leading-relaxed">
                      <p className="text-green-800 font-bold">
                        {row.value.type}:
                      </p>

                      {row.value.date && (
                        <p className="text-green-700 font-semibold text-xs sm:text-sm">
                          {row.value.date}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-green-700 font-semibold text-xs sm:text-sm">
                      {row.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EditForm
            draft={draft}
            updateDraft={updateDraft}
            customMensDays={customMensDays}
            setCustomMensDays={setCustomMensDays}
          />
        )}
      </Card>

      {showConfirm && (
        <ConfirmDialog
          onConfirm={doSave}
          onCancel={() => setShowConfirm(false)}
          saving={saving}
        />
      )}
    </>
  );
}

function EditForm({ draft, updateDraft, customMensDays, setCustomMensDays }) {
  return (
    <div className="space-y-4">
      {/* Gender */}
      <div>
        <label className="block text-green-500 text-sm font-medium mb-2">
          Jins
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateDraft("gender", opt.key)}
              className={`px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                draft.gender === opt.key
                  ? "bg-green-600 text-cream-50"
                  : "bg-cream-100 text-green-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Birth date */}
      <div>
        <label className="block text-green-500 text-sm font-medium mb-2">
          Tug'ilgan sana
        </label>
        <input
          type="date"
          value={dateToInputValue(draft.birthDate)}
          max={new Date().toISOString().split("T")[0]}
          min="1900-01-01"
          onChange={(e) => {
            if (e.target.value) {
              updateDraft(
                "birthDate",
                new Date(e.target.value + "T00:00:00").toISOString(),
              );
            }
          }}
          className="w-full px-4 py-3 rounded-xl border-2 border-cream-200 text-green-700 text-sm font-medium focus:outline-none focus:border-green-400 transition-colors bg-cream-50"
        />
      </div>

      {/* Accountability date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hisobdorlik sanasi
        </label>

        <input
          type="date"
          value={dateToInputValue(draft.accountabilityDate)}
          onChange={(e) => updateDraft("accountabilityDate", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
        />

        <p className="mt-2 text-xs text-gray-500">
          Bu sana qazo hisobining boshlanishiga ta’sir qiladi.
        </p>
      </div>

      {/* Prayer start type */}
      <div>
        <label className="block text-green-500 text-sm font-medium mb-2">
          Namozni boshlash turi
        </label>
        <div className="space-y-2">
          {PRAYER_START_TYPES.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateDraft("regularPrayerStartType", opt.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                draft.regularPrayerStartType === opt.key
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-cream-100 border border-transparent text-green-500"
              }`}
            >
              <span>{opt.label}</span>
              {draft.regularPrayerStartType === opt.key && (
                <div className="w-2 h-2 rounded-full bg-green-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Prayer start date (if not unknown) */}
      {draft.regularPrayerStartType &&
        draft.regularPrayerStartType !== "unknown" && (
          <div>
            <label className="block text-green-500 text-sm font-medium mb-2">
              {draft.regularPrayerStartType === "exact"
                ? "Aniq sana"
                : "Taxminiy sana"}
            </label>
            <input
              type="date"
              value={dateToInputValue(draft.regularPrayerStartDate)}
              max={new Date().toISOString().split("T")[0]}
              min="1900-01-01"
              onChange={(e) => {
                if (e.target.value) {
                  updateDraft("regularPrayerStartDate", e.target.value);
                }
              }}
              className="w-full px-4 py-3 rounded-xl border-2 border-cream-200 text-green-700 text-sm font-medium focus:outline-none focus:border-green-400 transition-colors bg-cream-50"
            />
          </div>
        )}

      {/* Consistency estimate */}
      <div>
        <label className="block text-green-500 text-sm font-medium mb-2">
          Namoz o'qish muntazamligi
        </label>
        <div className="space-y-2">
          {CONSISTENCY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateDraft("consistencyEstimate", opt.key)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                draft.consistencyEstimate === opt.key
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-cream-100 border border-transparent text-green-500"
              }`}
            >
              <span>{opt.label}</span>
              {draft.consistencyEstimate === opt.key && (
                <div className="w-2 h-2 rounded-full bg-green-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Menstruation (female only) */}
      {draft.gender === "female" && (
        <div>
          <label className="block text-green-500 text-sm font-medium mb-2">
            Hayz davomiyligi
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MENSTRUATION_OPTIONS.map((opt) => {
              const currentMensVal = draft.menstruationDays;
              const isSelected =
                opt.key === "custom"
                  ? currentMensVal === "custom" ||
                    (currentMensVal &&
                      !MENSTRUATION_OPTIONS.find(
                        (o) =>
                          String(o.value) === String(currentMensVal) &&
                          o.key !== "custom",
                      ))
                  : String(currentMensVal) === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => updateDraft("menstruationDays", opt.key)}
                  className={`px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isSelected
                      ? "bg-green-600 text-cream-50"
                      : "bg-cream-100 text-green-600"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {draft.menstruationDays === "custom" && (
            <input
              type="number"
              value={customMensDays}
              onChange={(e) => setCustomMensDays(e.target.value)}
              min="1"
              max="15"
              placeholder="Kunlar soni"
              className="w-full mt-2 px-4 py-3 rounded-xl border-2 border-cream-200 text-green-700 text-sm font-medium focus:outline-none focus:border-green-400 transition-colors bg-cream-50"
            />
          )}
        </div>
      )}

      {/* Language */}
      <div>
        <label className="block text-green-500 text-sm font-medium mb-2">
          Til
        </label>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateDraft("language", opt.key)}
              className={`px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                draft.language === opt.key
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-cream-100 text-green-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ onConfirm, onCancel, saving }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-green-900/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-cream-50 rounded-card shadow-deep max-w-sm w-full p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-4 mx-auto">
          <TriangleAlert size={24} color="#B8860B" strokeWidth={2} />
        </div>
        <h3 className="font-bold text-green-700 text-lg text-center mb-2">
          Diqqat!
        </h3>
        <p className="text-green-500 text-sm leading-relaxed text-center mb-6">
          Profil ma'lumotlarini o'zgartirish qazo namozlari hisoblashiga ta'sir
          qilishi mumkin. Hisobdorlik sanasi yoki namoz boshlash sanasi
          o'zgarganda, qazo balansi qayta hisoblanishi kerak bo'ladi. Davom
          etasizmi?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onCancel}>
            Bekor qilish
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Saqlanmoqda..." : "Tasdiqlash"}
          </Button>
        </div>
      </div>
    </div>
  );
}
