// Where a brand operates (the brand form's searchable multi-select): the Arab countries, Gulf first. The seasons calendar
// knows each one's own days, and the daily check keeps them current (lib/market/live.ts).

export type Country = { code: string; ar: string; en: string; group: "gcc" | "arab" };

export const COUNTRIES: Country[] = [
  { code: "SA", ar: "السعودية", en: "Saudi Arabia", group: "gcc" },
  { code: "AE", ar: "الإمارات", en: "United Arab Emirates", group: "gcc" },
  { code: "KW", ar: "الكويت", en: "Kuwait", group: "gcc" },
  { code: "QA", ar: "قطر", en: "Qatar", group: "gcc" },
  { code: "BH", ar: "البحرين", en: "Bahrain", group: "gcc" },
  { code: "OM", ar: "عُمان", en: "Oman", group: "gcc" },
  { code: "EG", ar: "مصر", en: "Egypt", group: "arab" },
  { code: "JO", ar: "الأردن", en: "Jordan", group: "arab" },
  { code: "LB", ar: "لبنان", en: "Lebanon", group: "arab" },
  { code: "IQ", ar: "العراق", en: "Iraq", group: "arab" },
  { code: "SY", ar: "سوريا", en: "Syria", group: "arab" },
  { code: "PS", ar: "فلسطين", en: "Palestine", group: "arab" },
  { code: "YE", ar: "اليمن", en: "Yemen", group: "arab" },
  { code: "MA", ar: "المغرب", en: "Morocco", group: "arab" },
  { code: "DZ", ar: "الجزائر", en: "Algeria", group: "arab" },
  { code: "TN", ar: "تونس", en: "Tunisia", group: "arab" },
  { code: "LY", ar: "ليبيا", en: "Libya", group: "arab" },
  { code: "SD", ar: "السودان", en: "Sudan", group: "arab" },
  { code: "MR", ar: "موريتانيا", en: "Mauritania", group: "arab" },
  { code: "SO", ar: "الصومال", en: "Somalia", group: "arab" },
  { code: "DJ", ar: "جيبوتي", en: "Djibouti", group: "arab" },
  { code: "KM", ar: "جزر القمر", en: "Comoros", group: "arab" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);
export const GCC = COUNTRIES.filter((c) => c.group === "gcc").map((c) => c.code);
export const ARAB = COUNTRY_CODES;
/** every market here marks Ramadan, the two Eids and the Hijri new year */
export const MUSLIM = ARAB;

export const countryName = (code: string, locale: string) => {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? (locale === "ar" ? c.ar : c.en) : code;
};

export const cleanCountries = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.map(String).filter((c) => COUNTRY_CODES.includes(c)))].slice(0, 60) : []);
