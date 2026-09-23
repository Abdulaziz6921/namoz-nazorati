import { NavLink } from "react-router-dom";
import { NAV_ITEMS, UZBEK_TERMS } from "../../constants/prayers";
import NavIcon from "../ui/NavIcon";
import { Clock3 } from "lucide-react";

export default function SideNav() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-gradient-to-b from-green-800 via-green-800 to-green-900 z-40 border-r border-green-900/40">
      <div className="px-6 py-7 border-b border-cream-50/5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center shrink-0 shadow-gold">
            <Clock3 size={24} strokeWidth={2} color="#112A1E" />
          </div>
          <div>
            <h1 className="text-cream-50 font-bold text-xl leading-tight tracking-tight">
              {UZBEK_TERMS.appName}
            </h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-gold-400/20 to-transparent text-cream-50 font-semibold border-l-2 border-gold-400"
                  : "text-cream-200/60 hover:bg-cream-50/5 hover:text-cream-50"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? "text-gold-300" : ""}>
                  <NavIcon name={item.icon} size={22} />
                </span>
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
