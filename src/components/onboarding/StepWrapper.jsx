export default function StepWrapper({
  title,
  subtitle,
  children,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center text-center animate-slide-up ${className}`}
    >
      {title && (
        <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-6 leading-tight tracking-tight">
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-green-400 text-sm leading-relaxed max-w-sm mb-6">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
