export default function Card({
  children,
  className = "",
  padding = "md",
  onClick,
  ...rest
}) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-4 sm:p-5",
    lg: "p-5 sm:p-6",
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        bg-cream-50 rounded-[1.25rem] border border-cream-200/80 shadow-[0_8px_24px_rgba(23,61,42,0.07)]
        ${onClick ? "text-left w-full active:scale-[0.985] transition-all hover:-translate-y-0.5 hover:shadow-card" : ""}
        ${paddings[padding]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </Component>
  );
}
