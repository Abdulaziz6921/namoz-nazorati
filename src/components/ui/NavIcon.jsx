import { Home, Calendar, BarChart2, Settings } from "lucide-react";

const ICONS = {
  home: Home,
  calendar: Calendar,
  chart: BarChart2,
  settings: Settings,
};

export default function NavIcon({ name, size = 24, className = "" }) {
  // Agar mos ikonka topilmasa, komponent hech narsa render qilmaydi
  const IconComponent = ICONS[name];

  if (!IconComponent) return null;

  return (
    <IconComponent
      size={size}
      className={className}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}
