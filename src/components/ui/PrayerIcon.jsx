import { Sunrise, Sun, Sunset, MoonStar, CloudSun } from "lucide-react";

const ICONS = {
  bomdod: Sunrise,
  peshin: Sun,
  asr: CloudSun,
  shom: Sunset,
  xufton: MoonStar,
};

export default function PrayerIcon({ prayer, size = 24, className = "" }) {
  // Agar mos ikonka topilmasa, fallback sifatida Sun (Peshin) ikonkasini tanlaydi
  const IconComponent = ICONS[prayer] || ICONS.peshin;

  return (
    <IconComponent
      size={size}
      className={className}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}
