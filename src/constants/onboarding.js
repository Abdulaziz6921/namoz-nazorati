export const ONBOARDING_STEPS = {
  WELCOME: "welcome",
  GENDER: "gender",
  BIRTH_DATE: "birth_date",
  PRAYER_START: "prayer_start",
  MENSTRUATION: "menstruation",
  REVIEW: "review",
};

export const STEP_ORDER = [
  ONBOARDING_STEPS.WELCOME,
  ONBOARDING_STEPS.GENDER,
  ONBOARDING_STEPS.BIRTH_DATE,
  ONBOARDING_STEPS.PRAYER_START,
  ONBOARDING_STEPS.MENSTRUATION,
  ONBOARDING_STEPS.REVIEW,
];

export const GENDER_OPTIONS = [
  { key: "male", label: "Erkak", icon: "male" },
  { key: "female", label: "Ayol", icon: "female" },
];

export const CONSISTENCY_OPTIONS = [
  { key: "none", label: "Deyarli umuman o'qimaganman", value: 0 },
  { key: "sometimes", label: "Vaqti-vaqti bilan", value: 0.15 },
  { key: "25", label: "Taxminan 25%", value: 0.25 },
  { key: "50", label: "Taxminan 50%", value: 0.5 },
  { key: "75", label: "Taxminan 75%", value: 0.75 },
  { key: "mostly", label: "Deyarli muntazam", value: 0.9 },
  { key: "unknown", label: "Aniq eslay olmayman", value: null },
];

export const PRAYER_START_TYPES = [
  { key: "exact", label: "Aniq sana" },
  { key: "approximate", label: "Taxminiy sana" },
  { key: "unknown", label: "Aniq eslay olmayman" },
];

export const MENSTRUATION_OPTIONS = [
  { key: "3", label: "3 kun", value: 3 },
  { key: "5", label: "5 kun", value: 5 },
  { key: "7", label: "7 kun", value: 7 },
  { key: "custom", label: "Boshqa", value: null },
];

export const ONBOARDING_TERMS = {
  welcomeTitle: "Namoz Nazorati",
  welcomeSubtitle:
    "Har bir namozni o'z vaqtida ado eting va qazo namozlaringizni asta-sekin ado etib boring.",
  startButton: "Boshlash",
  laterButton: "Keyinroq",
  genderTitle: "Jinsingizni tanlang",
  birthDateTitle: "Tug'ilgan sanangizni kiriting",
  prayerStartTitle: "Namozni qachondan muntazam o'qiy boshladingiz?",
  consistencyTitle: "Muntazam o'qishdan oldin qanchalik namoz o'qigan edingiz?",
  menstruationTitle: "Odatda o'rtacha hayzingiz necha kun davom etadi?",
  reviewTitle: "Ma'lumotlaringizni tasdiqlang",
  finishButton: "Tasdiqlash va yakunlash",
  nextButton: "Keyingi",
  backButton: "Orqaga",
  accountabilityNote:
    "Balog'at yoshiga yetgan sanangiz avtomatik hisoblanadi. Bu qazo namozlarining boshlanish sanasini aniqlash uchun kerak.",
  maleAccountability: "Erkaklarda balog'at o'rtacha 12 yoshda boshlanadi",
  femaleAccountability: "Ayollarda balog'at o'rtacha 9 yoshda boshlanadi",
  prayerStartExact: "Aniq sana kiriting",
  prayerStartApproximate: "Taxminiy sana kiriting",
  prayerStartUnknown:
    "Hisoblash uchun balog'at yoshingizdan boshlab hisoblanadi",
};
