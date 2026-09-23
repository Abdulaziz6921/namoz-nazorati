export const PRAYERS = [
  { key: "bomdod", name: "Bomdod", time: "Tongi" },
  { key: "peshin", name: "Peshin", time: "Kunduzi" },
  { key: "asr", name: "Asr", time: "Kechki kunduzi" },
  { key: "shom", name: "Shom", time: "Shomi" },
  { key: "xufton", name: "Xufton", time: "Kechasi" },
];

export const PRAYER_KEYS = PRAYERS.map((p) => p.key);

export const NAV_ITEMS = [
  { key: "asosiy", label: "Asosiy", path: "/", icon: "home" },
  { key: "kalendar", label: "Kalendar", path: "/kalendar", icon: "calendar" },
  {
    key: "statistika",
    label: "Statistika",
    path: "/statistika",
    icon: "chart",
  },
  {
    key: "sozlamalar",
    label: "Sozlamalar",
    path: "/sozlamalar",
    icon: "settings",
  },
];

export const UZBEK_TERMS = {
  appName: "Namoz Nazorati",
  appNameShort: "NN",
  todaysPrayers: "Bugungi namozlar",
  qazoPlan: "Qazo rejasi",
  settings: "Sozlamalar",
  calendar: "Kalendar",
  statistics: "Statistika",
  main: "Asosiy",
  completed: "Bajarildi",
  remaining: "Qoldi",
  missed: "O'tkazib yuborildi",
  total: "Jami",
  markComplete: "Bajarilgan deb belgilash",
  markIncomplete: "Bekor qilish",
  qazoRemaining: "Qoldirilgan qazo",
  qazoCompleted: "Qazo bajarildi",
  loading: "Yuklanmoqda...",
  error: "Xatolik yuz berdi",
  retry: "Qayta urinish",
  noData: "Hozircha ma'lumot yo'q",
};

export const STORAGE_KEYS = {
  SETTINGS: "namaz_tracker_settings",
};
