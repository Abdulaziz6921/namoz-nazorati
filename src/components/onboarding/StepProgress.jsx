export default function StepProgress({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-400 ${
            i < current
              ? "w-7 bg-green-600"
              : i === current
                ? "w-9 bg-gold-400 shadow-gold"
                : "w-4 bg-cream-200"
          }`}
        />
      ))}
    </div>
  );
}
