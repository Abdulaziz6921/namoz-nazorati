import { useState } from "react";
import {
  QAZO_PRAYERS,
  suggestQazoPrayer,
  getPlanPrayers,
  recordQazoCompletion,
} from "../../lib/qazoService";
import { todayKey } from "../../lib/dateUtils";
import Button from "../ui/Button";
import { CheckIcon, Star, XIcon } from "lucide-react";

function formatNumber(n) {
  return new Intl.NumberFormat("uz-UZ").format(n);
}

export default function QazoCompleteModal({
  balance,
  plan,
  onCompleted,
  onClose,
}) {
  const suggestedKey = suggestQazoPrayer(plan);
  const planPrayers = getPlanPrayers(plan);
  const availablePrayers = QAZO_PRAYERS.filter((p) =>
    planPrayers.includes(p.key),
  );

  const [selectedPrayer, setSelectedPrayer] = useState(suggestedKey);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    const today = todayKey();
    const { balance: updatedBalance } = await recordQazoCompletion(
      selectedPrayer,
      quantity,
      today,
      balance,
    );
    setSaving(false);
    onCompleted(updatedBalance);
  }

  const remainingForSelected = balance?.byPrayer?.[selectedPrayer] || 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-green-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 rounded-t-card sm:rounded-card shadow-deep max-w-md w-full p-6 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-green-700 text-lg">
            Qazo namozini ado etdim
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-cream-100 text-green-500 flex items-center justify-center hover:bg-cream-200 transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Prayer type selection */}
        <div className="mb-4">
          <p className="text-green-500 text-sm font-medium mb-2">Namoz turi</p>
          <div className="grid grid-cols-2 gap-2">
            {availablePrayers.map((prayer) => {
              const isSelected = selectedPrayer === prayer.key;
              const remaining = balance?.byPrayer?.[prayer.key] || 0;
              const isSuggested = prayer.key === suggestedKey;
              return (
                <button
                  key={prayer.key}
                  onClick={() => setSelectedPrayer(prayer.key)}
                  className={`relative px-3 py-3 rounded-xl transition-all text-left ${
                    isSelected
                      ? "bg-green-600 text-cream-50 shadow-soft"
                      : "bg-cream-100 text-green-600"
                  }`}
                >
                  <p className="font-semibold text-sm">{prayer.name}</p>
                  <p
                    className={`text-xs mt-0.5 ${isSelected ? "text-cream-200" : "text-green-400"}`}
                  >
                    {formatNumber(remaining)} ta qoldi
                  </p>
                  {isSuggested && !isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold-400" />
                  )}
                </button>
              );
            })}
          </div>
          {selectedPrayer === suggestedKey && (
            <p className="text-gold-600 text-xs mt-2 flex items-center gap-1">
              <Star size={12} />
              Tavsiya etilgan
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="mb-5">
          <p className="text-green-500 text-sm font-medium mb-2">Soni</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((v) => Math.max(1, v - 1))}
              className="w-11 h-11 rounded-xl bg-cream-100 text-green-600 flex items-center justify-center font-bold text-xl hover:bg-cream-200 active:scale-90 transition-all"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-green-700 tabular-nums">
                {quantity}
              </span>
              <p className="text-green-400 text-xs mt-0.5">
                {selectedPrayer
                  ? QAZO_PRAYERS.find((p) => p.key === selectedPrayer)?.name
                  : ""}{" "}
                qazosidan
              </p>
            </div>
            <button
              onClick={() =>
                setQuantity((v) => Math.min(remainingForSelected || 999, v + 1))
              }
              className="w-11 h-11 rounded-xl bg-cream-100 text-green-600 flex items-center justify-center font-bold text-xl hover:bg-cream-200 active:scale-90 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Summary */}
        {quantity > 0 && (
          <div className="bg-green-50 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <CheckIcon size={20} color="green" />
            <p className="text-green-700 text-sm font-medium">
              {QAZO_PRAYERS.find((p) => p.key === selectedPrayer)?.name}{" "}
              qazosidan {quantity} ta ado etildi
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onClose}>
            Bekor
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleConfirm}
            disabled={saving || quantity < 1}
          >
            {saving ? "Saqlanmoqda..." : "Ado etdim"}
          </Button>
        </div>
      </div>
    </div>
  );
}
