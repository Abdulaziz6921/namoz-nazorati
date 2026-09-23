export const REGIONS = [
  { slug: "toshkent-shahri", name: "Toshkent shahri" },
  { slug: "toshkent-viloyati", name: "Toshkent viloyati" },
  { slug: "sirdaryo-viloyati", name: "Sirdaryo viloyati" },
  { slug: "jizzax-viloyati", name: "Jizzax viloyati" },
  { slug: "samarqand-viloyati", name: "Samarqand viloyati" },
  { slug: "namangan-viloyati", name: "Namangan viloyati" },
  { slug: "namangan-shahri", name: "Namangan shahri" },
  { slug: "fargona-viloyati", name: "Farg'ona viloyati" },
  { slug: "andijon-viloyati", name: "Andijon viloyati" },
  { slug: "buxoro-viloyati", name: "Buxoro viloyati" },
  { slug: "navoiy-viloyati", name: "Navoiy viloyati" },
  { slug: "qashqadaryo-viloyati", name: "Qashqadaryo viloyati" },
  { slug: "surxondaryo-viloyati", name: "Surxondaryo viloyati" },
  { slug: "xorazm-viloyati", name: "Xorazm viloyati" },
  { slug: "qoraqalpogiston", name: "Qoraqalpog'iston Resp." },
];

export const DEFAULT_REGION = "namangan-shahri";

export function getRegionName(slug) {
  const region = REGIONS.find((r) => r.slug === slug);
  return region ? region.name : slug;
}
