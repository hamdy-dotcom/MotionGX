// All numbers, money and dates go through Intl, with Latin digits in both locales.
type UiLocale = "ar" | "en" | (string & {});

function tag(locale: UiLocale) {
  return locale === "ar" ? "ar-EG-u-nu-latn" : "en-US-u-nu-latn";
}

const AR_CURRENCY: Record<string, string> = {
  EGP: "ج.م",
  SAR: "ر.س",
  AED: "د.إ",
  KWD: "د.ك",
  JOD: "د.أ",
};

export function formatNumber(value: number, locale: UiLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(tag(locale), options).format(value);
}

/** "1,250.08 ج.م" in Arabic, "EGP 1,250.08" in English, "$24.04" for USD in both. */
export function formatMoney(value: number, currency: string, locale: UiLocale) {
  const n = formatNumber(Math.abs(value), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = value < 0 ? "-" : "";
  if (currency === "USD") return `${sign}$${n}`;
  if (locale === "ar") return `${sign}${n} ${AR_CURRENCY[currency] ?? currency}`;
  return `${sign}${currency} ${n}`;
}

export function formatDate(value: string | Date, locale: UiLocale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(tag(locale), options ?? { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}
