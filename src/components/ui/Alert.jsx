import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

const VARIANTS = {
  success: {
    wrapper: "bg-green-50 border-green-200 text-green-800",
    iconWrapper: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  error: {
    wrapper: "bg-red-50 border-red-200 text-red-700",
    iconWrapper: "bg-red-100 text-red-600",
    icon: CircleAlert,
  },
  warning: {
    wrapper: "bg-gold-50 border-gold-200 text-green-800",
    iconWrapper: "bg-gold-100 text-green-800",
    icon: TriangleAlert,
  },
  info: {
    wrapper: "bg-blue-50 border-blue-200 text-blue-700",
    iconWrapper: "bg-blue-100 text-blue-600",
    icon: Info,
  },
};

export default function Alert({
  title,
  message,
  variant = "info",
  onClose,
  className = "",
}) {
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`
        w-[calc(100%-1rem)] max-w-screen-sm rounded-[1.25rem] border p-4 fixed top-4 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-[999]
        shadow-[0_8px_24px_rgba(23,61,42,0.07)]
        ${config.wrapper}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            w-10 h-10 shrink-0 rounded-xl
            flex items-center justify-center
            ${config.iconWrapper}
          `}
        >
          <Icon size={20} strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          {title && (
            <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          )}

          {message && (
            <p
              className={`
                text-sm leading-relaxed
                ${title ? "mt-0.5 opacity-75" : ""}
              `}
            >
              {message}
            </p>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="
              w-8 h-8 shrink-0 rounded-lg
              flex items-center justify-center
              opacity-60 hover:opacity-100
              hover:bg-black/5 active:bg-black/10
              transition-colors
            "
            aria-label="Yopish"
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
