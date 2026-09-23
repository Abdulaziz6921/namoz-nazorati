export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...rest
}) {
  const variants = {
    primary:
      "bg-green-600 text-cream-50 hover:bg-green-700 active:bg-green-800 shadow-soft hover:shadow-card",
    secondary:
      "bg-cream-100 text-green-700 hover:bg-cream-200 active:bg-cream-300 border border-green-200",
    gold: "bg-gold-400 text-green-800 hover:bg-gold-300 active:bg-gold-500 shadow-gold",
    ghost: "bg-transparent text-green-600 hover:bg-green-50 active:bg-green-100",
    danger:
      "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-soft",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm rounded-xl",
    md: "px-5 py-3 text-sm rounded-xl",
    lg: "px-6 py-4 text-base rounded-2xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-semibold tracking-[-0.01em] transition-all duration-200
        inline-flex items-center justify-center gap-2
        select-none touch-manipulation
        ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
