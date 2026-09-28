import { LogIn, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function AppHeader({
  title,
  subtitle,
  right,
  showAccount = true,
}) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-green-800 to-green-700 text-cream-50 pt-[env(safe-area-inset-top)] lg:rounded-[1.25rem] lg:mt-6 lg:shadow-[0_8px_24px_rgba(23,61,42,0.18)] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
        <svg
          viewBox="0 0 200 100"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
        >
          <path
            d="M0 50 Q50 10 100 50 T200 50"
            fill="none"
            stroke="#C9A23E"
            strokeWidth="1"
          />
          <path
            d="M0 60 Q50 20 100 60 T200 60"
            fill="none"
            stroke="#C9A23E"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      <div className="relative px-5 py-4 lg:px-8 lg:py-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight tracking-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="text-cream-200/80 text-sm lg:text-base font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showAccount && (
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#/hisob";
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-cream-50 hover:bg-cream-50/10 active:bg-cream-50/15 transition-colors"
              aria-label="Hisob va zaxira"
            >
              {user ? (
                <User size={22} strokeWidth={2} />
              ) : (
                <LogIn size={22} strokeWidth={2} />
              )}
            </button>
          )}

          {right && <div>{right}</div>}
        </div>
      </div>
    </header>
  );
}
