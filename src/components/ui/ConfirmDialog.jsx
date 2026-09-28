import { TriangleAlert } from "lucide-react";
import Button from "./Button";

export default function ConfirmDialog({
  title = "Diqqat!",
  message,
  onConfirm,
  onCancel,
  confirmText = "Tasdiqlash",
  cancelText = "Bekor qilish",
  saving = false,
  variant = "primary",
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-green-900/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-cream-50 rounded-card shadow-deep max-w-sm w-full p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-4 mx-auto">
          <TriangleAlert size={24} className="text-gold-600" strokeWidth={2} />
        </div>

        <h3 className="font-bold text-green-700 text-lg text-center mb-2">
          {title}
        </h3>

        <p className="text-green-500 text-sm leading-relaxed text-center mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onCancel}>
            {cancelText}
          </Button>

          <Button
            variant={variant}
            size="md"
            fullWidth
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Saqlanmoqda..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
