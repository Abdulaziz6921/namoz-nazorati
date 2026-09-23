export default function EmptyState({ title, subtitle, icon, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {icon && (
        <div className="mb-4 w-20 h-20 rounded-full bg-green-50 flex items-center justify-center text-green-300">
          {icon}
        </div>
      )}
      <h3 className="text-green-700 font-semibold text-lg mb-1">{title}</h3>
      {subtitle && (
        <p className="text-green-400 text-sm max-w-xs leading-relaxed">{subtitle}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
