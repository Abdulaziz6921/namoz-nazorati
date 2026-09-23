export default function Spinner({ size = 40, label, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="border-[3px] border-green-100 border-t-green-600 rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
      {label && (
        <p className="text-green-600 text-sm font-medium">{label}</p>
      )}
    </div>
  );
}
