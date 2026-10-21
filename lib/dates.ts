/** Calendar days as "YYYY-MM-DD" in the studio's timezone (Egypt), so a piece made at 1am Cairo lands on the right day. */
export const STUDIO_TZ = "Africa/Cairo";

export const dayKey = (value: string | Date, tz = STUDIO_TZ) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
export const todayKey = () => dayKey(new Date());
export const parseDay = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const addDays = (k: string, n: number) => { const d = parseDay(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (k: string) => parseDay(k).getUTCDay(); // 0 = Sunday
/** The Saturday-to-Friday week that holds a day (the week used across Egypt and the Gulf). */
export const weekOf = (k: string) => { const start = addDays(k, -((weekday(k) + 1) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 864e5);

export const WEEKDAY_MONO = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const MONTH_MONO = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** "24 OCT" */
export const dayMono = (k: string) => `${k.slice(8)} ${MONTH_MONO[+k.slice(5, 7) - 1]}`;
/** "السبت 24 أكتوبر" / "Saturday 24 October" */
export const dayLabel = (k: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { ...opts, timeZone: "UTC" }).format(parseDay(k));
