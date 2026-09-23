import { CircleAlert } from "lucide-react";
import Button from "./Button";

export default function ErrorState({ message, onRetry, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <CircleAlert size={32} strokeWidth={2} className="text-[#EF4444]" />
      </div>
      <h3 className="text-red-600 font-semibold text-base mb-1">
        {message || "Xatolik yuz berdi"}
      </h3>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-4"
        >
          Qayta urinish
        </Button>
      )}
    </div>
  );
}
