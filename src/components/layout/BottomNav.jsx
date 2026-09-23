import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/prayers";
import NavIcon from "../ui/NavIcon";

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-cream-50/95 backdrop-blur-xl border-t border-cream-200 safe-area-pb shadow-[0_-4px_20px_rgba(23,61,42,0.08)]">
      <div className="max-w-md mx-auto flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-2.5 px-3 min-w-[64px] rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-green-600"
                  : "text-green-300 hover:text-green-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute -top-px w-8 h-0.5 bg-gold-400 rounded-full shadow-gold" />
                )}
                <div
                  className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                >
                  <NavIcon name={item.icon} size={24} />
                </div>
                <span
                  className={`text-[11px] font-medium leading-none ${
                    isActive ? "font-semibold" : ""
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
