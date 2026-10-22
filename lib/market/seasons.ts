// The seasons calendar: the dated moments brands in the Gulf, Egypt and the Arab world plan content around — national
// days, religious occasions, shopping seasons, festivals, school and pay days — country by country, Oct 2026 → Dec 2027.
// Researched 2026-10-22. `approx` = expected but not final: Hijri dates depend on the moon sighting (±1 day), and some
// festivals had not announced their dates yet. Re-check and extend each year.

import { ARAB, GCC, MUSLIM } from "./countries";
import { FAMILY, SELLERS, type Industry } from "./industries";

export type Season = {
  id: string;
  name: { ar: string; en: string };
  from: string;
  to?: string;
  /** "all" = every market */
  countries: string[] | "all";
  /** omitted = every industry */
  industries?: Industry[];
  /** how many days ahead the studio starts reminding (default 21) */
  lead?: number;
  approx?: boolean;
  /** a content angle that fits the moment */
  angle: { ar: string; en: string };
  kind: "national" | "religious" | "shopping" | "festival" | "school" | "payday" | "awareness" | "global";
};

const S = (s: Season) => s;
const MAWLID = ["EG", "AE", "OM", "BH", "KW", "JO", "MA", "DZ", "TN", "IQ", "LB", "SD", "LY", "YE", "SY", "PS", "MR"];
const MOTHERS_MAR21 = ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "SY", "PS", "IQ", "SD", "YE"];
const HEALTH: Industry[] = ["health", "pharma", "fitness", "beauty", "nonprofit", "food"];
const TECH: Industry[] = ["software", "fintech", "telecom", "electronics", "b2b", "agency", "media", "gaming", "education"];

export const SEASONS: Season[] = [
  // ── Islamic & religious (moon-sighted: ±1 day) ──────────────────────────────────────────────
  S({ id: "isra-miraj-2027", kind: "religious", name: { ar: "الإسراء والمعراج", en: "Isra and Mi'raj" }, from: "2027-01-06", countries: MUSLIM, lead: 10, approx: true, angle: { ar: "تهنئة هادئة بهوية العلامة، بدون عروض", en: "A quiet branded greeting, no offers" } }),
  S({ id: "ramadan-prep-2027", kind: "shopping", name: { ar: "التجهيز لرمضان", en: "Ramadan preparation" }, from: "2027-01-20", to: "2027-02-07", countries: MUSLIM, lead: 30, approx: true, angle: { ar: "قوائم التجهيز، عروض مبكرة، وإزاي منتجك يسهّل رمضان", en: "Prep lists, early offers, how you make Ramadan easier" } }),
  S({ id: "ramadan-2027", kind: "religious", name: { ar: "شهر رمضان", en: "Ramadan" }, from: "2027-02-08", to: "2027-03-09", countries: MUSLIM, lead: 45, approx: true, angle: { ar: "محتوى ليالي رمضان، مواعيد الفطار والسحور، روح العطاء", en: "Ramadan nights, iftar/suhoor timing, the spirit of giving" } }),
  S({ id: "last-ten-2027", kind: "religious", name: { ar: "العشر الأواخر من رمضان", en: "The last ten nights of Ramadan" }, from: "2027-02-27", to: "2027-03-09", countries: MUSLIM, lead: 10, approx: true, angle: { ar: "هدوء وعطاء، وتجهيز العيد", en: "Calm and giving, getting ready for Eid" } }),
  S({ id: "zayed-humanitarian-2027", kind: "national", name: { ar: "يوم زايد للعمل الإنساني (19 رمضان)", en: "Zayed Humanitarian Day (19 Ramadan)" }, from: "2027-02-26", countries: ["AE"], lead: 14, approx: true, industries: ["nonprofit", "b2b", "food", "retail", "education", "health"], angle: { ar: "مبادرة عطاء حقيقية من العلامة", en: "A real giving initiative from the brand" } }),
  S({ id: "eid-fitr-2027", kind: "religious", name: { ar: "عيد الفطر", en: "Eid al-Fitr" }, from: "2027-03-09", to: "2027-03-12", countries: MUSLIM, lead: 30, approx: true, angle: { ar: "تهنئة العيد، عيدية، وعروض كسوة العيد", en: "Eid greetings, eidiya, Eid outfit offers" } }),
  S({ id: "hajj-2027", kind: "religious", name: { ar: "موسم الحج", en: "Hajj season" }, from: "2027-05-10", to: "2027-05-19", countries: MUSLIM, lead: 21, approx: true, industries: ["travel", "logistics", "telecom", "fintech", "health", "pharma", "food", "retail"], angle: { ar: "خدمة الحجاج وتسهيل الرحلة", en: "Serving pilgrims, easing the journey" } }),
  S({ id: "arafah-2027", kind: "religious", name: { ar: "يوم عرفة", en: "Day of Arafah" }, from: "2027-05-15", countries: MUSLIM, lead: 10, approx: true, angle: { ar: "تهنئة وروحانية، بدون بيع", en: "Greeting and reflection, no selling" } }),
  S({ id: "eid-adha-2027", kind: "religious", name: { ar: "عيد الأضحى", en: "Eid al-Adha" }, from: "2027-05-16", to: "2027-05-19", countries: MUSLIM, lead: 30, approx: true, angle: { ar: "تهنئة العيد، العزومات والسفر، عروض العيد", en: "Eid greetings, family gatherings, travel, Eid offers" } }),
  S({ id: "hijri-new-year-1449", kind: "religious", name: { ar: "رأس السنة الهجرية 1449", en: "Islamic New Year 1449" }, from: "2027-06-06", countries: MUSLIM, lead: 10, approx: true, angle: { ar: "بداية جديدة: هدف العلامة للسنة", en: "A fresh start: the brand's goal for the year" } }),
  S({ id: "mawlid-2027", kind: "religious", name: { ar: "المولد النبوي الشريف", en: "Prophet's Birthday (Mawlid)" }, from: "2027-08-15", countries: MAWLID, lead: 14, approx: true, angle: { ar: "تهنئة بهوية العلامة؛ وفي مصر: حلاوة المولد", en: "A branded greeting; in Egypt, Mawlid sweets" } }),
  S({ id: "coptic-christmas-2027", kind: "religious", name: { ar: "عيد الميلاد المجيد", en: "Coptic Christmas" }, from: "2027-01-07", countries: ["EG"], lead: 14, angle: { ar: "تهنئة بروح الوحدة", en: "A greeting in the spirit of unity" } }),
  S({ id: "christmas-2026", kind: "global", name: { ar: "الكريسماس", en: "Christmas" }, from: "2026-12-25", countries: ["LB", "JO", "PS", "SY", "IQ", "AE", "GB", "US", "CA", "DE", "FR"], lead: 21, angle: { ar: "هدايا آخر السنة", en: "Year-end gifting" } }),
  S({ id: "coptic-easter-2027", kind: "religious", name: { ar: "عيد القيامة المجيد", en: "Coptic Easter" }, from: "2027-05-02", countries: ["EG"], lead: 10, angle: { ar: "تهنئة، وتمهيد لشم النسيم", en: "A greeting, leading into Sham El-Nessim" } }),

  // ── Shopping seasons ────────────────────────────────────────────────────────────────────────
  S({ id: "singles-day-2026", kind: "shopping", name: { ar: "عروض 11.11", en: "11.11 sales" }, from: "2026-11-11", countries: "all", industries: [...SELLERS], lead: 14, angle: { ar: "عرض ليوم واحد بعدّاد تنازلي", en: "A one-day offer with a countdown" } }),
  S({ id: "white-friday-2026", kind: "shopping", name: { ar: "الجمعة البيضاء", en: "White Friday" }, from: "2026-11-27", to: "2026-11-30", countries: "all", industries: [...SELLERS, "software", "fintech", "education", "travel", "fitness", "telecom"], lead: 40, angle: { ar: "تشويق قبلها بأسبوع، العرض، عدّاد، آخر يوم", en: "A teaser a week before, the offer, a countdown, the last day" } }),
  S({ id: "cyber-monday-2026", kind: "shopping", name: { ar: "سايبر مونداي", en: "Cyber Monday" }, from: "2026-11-30", countries: "all", industries: ["ecommerce", "electronics", "software", "telecom", "fashion"], lead: 14, angle: { ar: "آخر فرصة أونلاين", en: "The last online chance" } }),
  S({ id: "year-end-2026", kind: "global", name: { ar: "نهاية السنة ورأس السنة", en: "Year end & New Year" }, from: "2026-12-26", to: "2027-01-01", countries: "all", lead: 21, angle: { ar: "حصاد السنة بالأرقام، وشكر للعملاء", en: "The year in numbers, a thank-you to customers" } }),
  S({ id: "valentines-2027", kind: "global", name: { ar: "عيد الحب", en: "Valentine's Day" }, from: "2027-02-14", countries: "all", industries: ["fashion", "beauty", "jewelry", "food", "retail", "ecommerce", "events", "travel"], lead: 14, angle: { ar: "هدايا لطيفة؛ في رمضان 2027 يأتي في أوله — بهدوء", en: "Gentle gifting; in 2027 it falls early in Ramadan — keep it soft" } }),
  S({ id: "mothers-day-2027", kind: "global", name: { ar: "عيد الأم", en: "Mother's Day" }, from: "2027-03-21", countries: MOTHERS_MAR21, lead: 21, angle: { ar: "هدية الأم، وقصص حقيقية", en: "Gifts for mothers, real stories" } }),
  S({ id: "womens-day-2027", kind: "awareness", name: { ar: "يوم المرأة العالمي", en: "International Women's Day" }, from: "2027-03-08", countries: "all", lead: 10, angle: { ar: "نساء وراء العلامة أو عميلاتها", en: "The women behind the brand or among its customers" } }),
  S({ id: "prime-day-2027", kind: "shopping", name: { ar: "أيام برايم (أمازون)", en: "Prime Day (Amazon)" }, from: "2027-07-13", to: "2027-07-14", countries: ["SA", "AE", "EG"], industries: ["ecommerce", "electronics", "home", "beauty", "kids", "retail"], lead: 21, approx: true, angle: { ar: "عرض منافس في نفس الأيام", en: "A competing offer on the same days" } }),
  S({ id: "summer-2027", kind: "shopping", name: { ar: "موسم الصيف والإجازات", en: "Summer & holiday season" }, from: "2027-06-20", to: "2027-08-31", countries: "all", industries: ["travel", "fashion", "food", "events", "kids", "fitness", "beauty", "retail", "ecommerce"], lead: 21, angle: { ar: "السفر، الإجازة، والأنشطة الصيفية", en: "Travel, vacations, summer activities" } }),
  S({ id: "singles-day-2027", kind: "shopping", name: { ar: "عروض 11.11", en: "11.11 sales" }, from: "2027-11-11", countries: "all", industries: [...SELLERS], lead: 14, angle: { ar: "عرض ليوم واحد بعدّاد تنازلي", en: "A one-day offer with a countdown" } }),
  S({ id: "white-friday-2027", kind: "shopping", name: { ar: "الجمعة البيضاء", en: "White Friday" }, from: "2027-11-26", to: "2027-11-29", countries: "all", industries: [...SELLERS, "software", "fintech", "education", "travel", "fitness", "telecom"], lead: 40, angle: { ar: "تشويق قبلها بأسبوع، العرض، عدّاد، آخر يوم", en: "A teaser a week before, the offer, a countdown, the last day" } }),

  // ── Saudi Arabia ────────────────────────────────────────────────────────────────────────────
  S({ id: "sa-riyadh-season-2026", kind: "festival", name: { ar: "موسم الرياض 2026", en: "Riyadh Season 2026" }, from: "2026-10-21", to: "2026-12-30", countries: ["SA"], industries: ["events", "food", "travel", "fashion", "media", "retail", "automotive", "telecom", "fintech"], lead: 7, angle: { ar: "اربط عرضك بزيارة الموسم وفعالياته", en: "Tie your offer to visiting the season and its events" } }),
  S({ id: "sa-midyear-break-2027", kind: "school", name: { ar: "إجازة منتصف العام الدراسي", en: "Mid-year school break" }, from: "2027-01-08", to: "2027-01-16", countries: ["SA"], industries: ["travel", "events", "kids", "education", "food", "retail"], lead: 21, approx: true, angle: { ar: "أنشطة العائلة في الإجازة", en: "Family activities for the break" } }),
  S({ id: "sa-founding-2027", kind: "national", name: { ar: "يوم التأسيس السعودي", en: "Saudi Founding Day" }, from: "2027-02-22", countries: ["SA"], lead: 21, angle: { ar: "فخر وتراث بهوية العلامة، بدون مبالغة", en: "Pride and heritage in the brand's own look, without excess" } }),
  S({ id: "sa-flag-2027", kind: "national", name: { ar: "يوم العلم السعودي", en: "Saudi Flag Day" }, from: "2027-03-11", countries: ["SA"], lead: 10, angle: { ar: "تحية للعلم — تصميم احترامي", en: "A salute to the flag — a respectful design" } }),
  S({ id: "sa-back-to-school-2027", kind: "school", name: { ar: "العودة للمدارس", en: "Back to school" }, from: "2027-08-22", countries: ["SA"], industries: [...FAMILY, "electronics", "logistics"], lead: 30, approx: true, angle: { ar: "تجهيزات المدرسة وروتين العائلة", en: "School supplies and family routines" } }),
  S({ id: "sa-national-2027", kind: "national", name: { ar: "اليوم الوطني السعودي 97", en: "Saudi National Day (97th)" }, from: "2027-09-23", countries: ["SA"], lead: 30, angle: { ar: "هويتنا وطموحنا — عروض اليوم الوطني", en: "Identity and ambition — National Day offers" } }),

  // ── United Arab Emirates ────────────────────────────────────────────────────────────────────
  S({ id: "ae-flag-2026", kind: "national", name: { ar: "يوم العلم الإماراتي", en: "UAE Flag Day" }, from: "2026-11-03", countries: ["AE"], lead: 14, angle: { ar: "رفع العلم مع فريق العلامة", en: "Raising the flag with the brand's team" } }),
  S({ id: "ae-fitness-2026", kind: "festival", name: { ar: "تحدي دبي للياقة", en: "Dubai Fitness Challenge" }, from: "2026-11-01", to: "2026-11-30", countries: ["AE"], industries: ["fitness", "health", "food", "fashion", "pharma"], lead: 14, approx: true, angle: { ar: "30 يوم × 30 دقيقة مع منتجك", en: "30 days × 30 minutes, with your product" } }),
  S({ id: "ae-commemoration-2026", kind: "national", name: { ar: "يوم الشهيد", en: "Commemoration Day" }, from: "2026-12-01", countries: ["AE"], lead: 10, angle: { ar: "وقفة تقدير — بدون عروض", en: "A moment of respect — no offers" } }),
  S({ id: "ae-national-2026", kind: "national", name: { ar: "عيد الاتحاد (اليوم الوطني الإماراتي)", en: "Eid Al Etihad (UAE National Day)" }, from: "2026-12-02", to: "2026-12-03", countries: ["AE"], lead: 30, angle: { ar: "روح الاتحاد، عروض 2 ديسمبر", en: "The spirit of the union, 2 December offers" } }),
  S({ id: "ae-dsf-2026", kind: "festival", name: { ar: "مهرجان دبي للتسوق", en: "Dubai Shopping Festival" }, from: "2026-12-11", to: "2027-01-24", countries: ["AE"], industries: [...SELLERS, "events", "travel"], lead: 21, approx: true, angle: { ar: "عرض المهرجان + سحوبات", en: "A festival offer + raffles" } }),
  S({ id: "ae-summer-surprises-2027", kind: "festival", name: { ar: "مفاجآت صيف دبي", en: "Dubai Summer Surprises" }, from: "2027-07-01", to: "2027-08-31", countries: ["AE"], industries: [...SELLERS, "events", "travel", "kids"], lead: 21, approx: true, angle: { ar: "عروض الصيف داخل دبي", en: "Summer offers in Dubai" } }),
  S({ id: "ae-womens-2027", kind: "national", name: { ar: "يوم المرأة الإماراتية", en: "Emirati Women's Day" }, from: "2027-08-28", countries: ["AE"], lead: 14, angle: { ar: "قصص نساء ملهمات", en: "Stories of inspiring women" } }),
  S({ id: "ae-back-to-school-2027", kind: "school", name: { ar: "العودة للمدارس", en: "Back to school" }, from: "2027-08-30", countries: ["AE"], industries: [...FAMILY, "electronics"], lead: 30, approx: true, angle: { ar: "تجهيزات المدرسة", en: "School supplies" } }),
  S({ id: "ae-gitex-2027", kind: "festival", name: { ar: "جيتكس جلوبال", en: "GITEX Global" }, from: "2027-10-11", to: "2027-10-15", countries: ["AE"], industries: TECH, lead: 30, approx: true, angle: { ar: "إعلان ميزة جديدة أو لقاءات في الحدث", en: "Announce a feature or meetings at the show" } }),
  S({ id: "ae-flag-2027", kind: "national", name: { ar: "يوم العلم الإماراتي", en: "UAE Flag Day" }, from: "2027-11-03", countries: ["AE"], lead: 14, angle: { ar: "رفع العلم مع فريق العلامة", en: "Raising the flag with the brand's team" } }),
  S({ id: "ae-national-2027", kind: "national", name: { ar: "عيد الاتحاد (اليوم الوطني الإماراتي)", en: "Eid Al Etihad (UAE National Day)" }, from: "2027-12-02", to: "2027-12-03", countries: ["AE"], lead: 30, angle: { ar: "روح الاتحاد، عروض 2 ديسمبر", en: "The spirit of the union, 2 December offers" } }),

  // ── Kuwait ──────────────────────────────────────────────────────────────────────────────────
  S({ id: "kw-hala-feb-2027", kind: "festival", name: { ar: "مهرجان هلا فبراير", en: "Hala February" }, from: "2027-02-01", to: "2027-02-28", countries: ["KW"], industries: [...SELLERS, "events", "travel"], lead: 21, approx: true, angle: { ar: "عروض شهر الاحتفالات", en: "Offers for the month of celebrations" } }),
  S({ id: "kw-national-2027", kind: "national", name: { ar: "العيد الوطني الكويتي", en: "Kuwait National Day" }, from: "2027-02-25", countries: ["KW"], lead: 21, angle: { ar: "فرحة الوطن بألوان العلامة", en: "National joy in the brand's colours" } }),
  S({ id: "kw-liberation-2027", kind: "national", name: { ar: "عيد التحرير", en: "Kuwait Liberation Day" }, from: "2027-02-26", countries: ["KW"], lead: 14, angle: { ar: "امتنان وفخر", en: "Gratitude and pride" } }),
  S({ id: "kw-back-to-school-2027", kind: "school", name: { ar: "العودة للمدارس", en: "Back to school" }, from: "2027-09-12", countries: ["KW"], industries: FAMILY, lead: 30, approx: true, angle: { ar: "تجهيزات المدرسة", en: "School supplies" } }),

  // ── Qatar ───────────────────────────────────────────────────────────────────────────────────
  S({ id: "qa-national-2026", kind: "national", name: { ar: "اليوم الوطني القطري", en: "Qatar National Day" }, from: "2026-12-18", countries: ["QA"], lead: 21, angle: { ar: "فخر وطني بهوية العلامة", en: "National pride in the brand's look" } }),
  S({ id: "qa-sport-2027", kind: "national", name: { ar: "اليوم الرياضي للدولة", en: "Qatar National Sport Day" }, from: "2027-02-09", countries: ["QA"], industries: ["fitness", "health", "fashion", "food", "pharma", "events"], lead: 14, angle: { ar: "يأتي في رمضان لأول مرة: نشاط بعد الفطار", en: "In Ramadan for the first time: activity after iftar" } }),
  S({ id: "qa-national-2027", kind: "national", name: { ar: "اليوم الوطني القطري", en: "Qatar National Day" }, from: "2027-12-18", countries: ["QA"], lead: 21, angle: { ar: "فخر وطني بهوية العلامة", en: "National pride in the brand's look" } }),

  // ── Bahrain ─────────────────────────────────────────────────────────────────────────────────
  S({ id: "bh-national-2026", kind: "national", name: { ar: "العيد الوطني البحريني", en: "Bahrain National Day" }, from: "2026-12-16", to: "2026-12-17", countries: ["BH"], lead: 21, angle: { ar: "احتفال وطني بألوان العلامة", en: "A national celebration in the brand's colours" } }),
  S({ id: "bh-shop-bahrain-2027", kind: "festival", name: { ar: "مهرجان تسوّق البحرين", en: "Shop Bahrain festival" }, from: "2027-01-01", to: "2027-02-01", countries: ["BH"], industries: [...SELLERS, "events"], lead: 21, approx: true, angle: { ar: "عرض المهرجان", en: "A festival offer" } }),
  S({ id: "bh-national-2027", kind: "national", name: { ar: "العيد الوطني البحريني", en: "Bahrain National Day" }, from: "2027-12-16", to: "2027-12-17", countries: ["BH"], lead: 21, angle: { ar: "احتفال وطني بألوان العلامة", en: "A national celebration in the brand's colours" } }),

  // ── Oman ────────────────────────────────────────────────────────────────────────────────────
  S({ id: "om-national-2026", kind: "national", name: { ar: "العيد الوطني العُماني", en: "Oman National Day" }, from: "2026-11-20", to: "2026-11-21", countries: ["OM"], lead: 21, angle: { ar: "فخر عُماني — العطلة الرسمية قد تُنقل لأيام أخرى", en: "Omani pride — the official holiday may be moved to other days" } }),
  S({ id: "om-muscat-nights-2027", kind: "festival", name: { ar: "ليالي مسقط", en: "Muscat Nights" }, from: "2027-01-01", to: "2027-01-31", countries: ["OM"], industries: ["events", "food", "travel", "retail", "kids"], lead: 21, approx: true, angle: { ar: "شاركوا في ليالي مسقط", en: "Join Muscat Nights" } }),
  S({ id: "om-khareef-2027", kind: "festival", name: { ar: "موسم خريف ظفار", en: "Dhofar Khareef season" }, from: "2027-06-21", to: "2027-09-21", countries: ["OM"], industries: ["travel", "food", "events", "automotive", "retail"], lead: 21, angle: { ar: "رحلة الخريف إلى صلالة", en: "The Khareef trip to Salalah" } }),
  S({ id: "om-national-2027", kind: "national", name: { ar: "العيد الوطني العُماني", en: "Oman National Day" }, from: "2027-11-20", to: "2027-11-21", countries: ["OM"], lead: 21, angle: { ar: "فخر عُماني", en: "Omani pride" } }),

  // ── Egypt ───────────────────────────────────────────────────────────────────────────────────
  S({ id: "eg-police-jan25-2027", kind: "national", name: { ar: "عيد الشرطة وذكرى 25 يناير", en: "Police Day & 25 January" }, from: "2027-01-25", countries: ["EG"], lead: 10, angle: { ar: "تهنئة رسمية هادئة", en: "A quiet formal greeting" } }),
  S({ id: "eg-book-fair-2027", kind: "festival", name: { ar: "معرض القاهرة الدولي للكتاب", en: "Cairo International Book Fair" }, from: "2027-01-22", to: "2027-02-03", countries: ["EG"], industries: ["education", "media", "kids", "retail"], lead: 21, approx: true, angle: { ar: "قابلونا في المعرض / اقتراحات قراءة", en: "Meet us at the fair / reading picks" } }),
  S({ id: "eg-sinai-2027", kind: "national", name: { ar: "عيد تحرير سيناء", en: "Sinai Liberation Day" }, from: "2027-04-25", countries: ["EG"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "eg-labour-2027", kind: "national", name: { ar: "عيد العمال", en: "Labour Day" }, from: "2027-05-01", countries: ["EG", "JO", "LB", "IQ", "SY", "MA", "DZ", "TN", "LY", "SD", "YE"], lead: 14, angle: { ar: "شكر لفريق العلامة وللي بيشتغلوا بإيديهم", en: "Thanks to the brand's team and the people who build" } }),
  S({ id: "eg-sham-nessim-2027", kind: "national", name: { ar: "شم النسيم", en: "Sham El-Nessim" }, from: "2027-05-03", countries: ["EG"], lead: 21, angle: { ar: "خروجة الربيع، الفسيخ والتلوين", en: "The spring outing, colours and treats" } }),
  S({ id: "eg-thanaweya-2027", kind: "school", name: { ar: "امتحانات الثانوية العامة", en: "Thanaweya Amma exams" }, from: "2027-06-12", to: "2027-07-15", countries: ["EG"], industries: ["education", "kids", "food", "telecom", "health"], lead: 21, approx: true, angle: { ar: "دعم الطلاب والأهالي في الامتحانات", en: "Support for students and parents during exams" } }),
  S({ id: "eg-june30-2027", kind: "national", name: { ar: "ذكرى 30 يونيو", en: "30 June anniversary" }, from: "2027-06-30", countries: ["EG"], lead: 7, angle: { ar: "تهنئة رسمية هادئة", en: "A quiet formal greeting" } }),
  S({ id: "eg-july23-2027", kind: "national", name: { ar: "عيد ثورة 23 يوليو", en: "23 July Revolution Day" }, from: "2027-07-23", countries: ["EG"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "eg-back-to-school-2027", kind: "school", name: { ar: "العودة للمدارس", en: "Back to school" }, from: "2027-09-25", countries: ["EG"], industries: [...FAMILY, "electronics"], lead: 30, approx: true, angle: { ar: "شنطة المدرسة والروتين الجديد", en: "The school bag and the new routine" } }),
  S({ id: "eg-october6-2027", kind: "national", name: { ar: "عيد القوات المسلحة (6 أكتوبر)", en: "Armed Forces Day (6 October)" }, from: "2027-10-06", countries: ["EG"], lead: 14, angle: { ar: "تهنئة بروح الانتصار", en: "A greeting in the spirit of victory" } }),

  // ── Levant, Iraq, Maghreb and others ────────────────────────────────────────────────────────
  S({ id: "lb-independence-2026", kind: "national", name: { ar: "عيد الاستقلال اللبناني", en: "Lebanese Independence Day" }, from: "2026-11-22", countries: ["LB"], lead: 14, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "ma-independence-2026", kind: "national", name: { ar: "عيد الاستقلال المغربي", en: "Moroccan Independence Day" }, from: "2026-11-18", countries: ["MA"], lead: 14, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "ly-independence-2026", kind: "national", name: { ar: "عيد الاستقلال الليبي", en: "Libyan Independence Day" }, from: "2026-12-24", countries: ["LY"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "sd-independence-2027", kind: "national", name: { ar: "عيد الاستقلال السوداني", en: "Sudanese Independence Day" }, from: "2027-01-01", countries: ["SD"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "tn-independence-2027", kind: "national", name: { ar: "عيد الاستقلال التونسي", en: "Tunisian Independence Day" }, from: "2027-03-20", countries: ["TN"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "ye-unity-2027", kind: "national", name: { ar: "العيد الوطني اليمني (22 مايو)", en: "Yemeni Unity Day" }, from: "2027-05-22", countries: ["YE"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "jo-independence-2027", kind: "national", name: { ar: "عيد الاستقلال الأردني", en: "Jordanian Independence Day" }, from: "2027-05-25", countries: ["JO"], lead: 14, angle: { ar: "تهنئة وطنية بفخر", en: "A proud national greeting" } }),
  S({ id: "dz-independence-2027", kind: "national", name: { ar: "عيد الاستقلال الجزائري", en: "Algerian Independence Day" }, from: "2027-07-05", countries: ["DZ"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "ma-throne-2027", kind: "national", name: { ar: "عيد العرش", en: "Throne Day" }, from: "2027-07-30", countries: ["MA"], lead: 14, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "iq-national-2027", kind: "national", name: { ar: "اليوم الوطني العراقي", en: "Iraq National Day" }, from: "2027-10-03", countries: ["IQ"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),
  S({ id: "dz-revolution-2026", kind: "national", name: { ar: "عيد الثورة الجزائرية (1 نوفمبر)", en: "Algerian Revolution Day" }, from: "2026-11-01", countries: ["DZ"], lead: 10, angle: { ar: "تهنئة وطنية", en: "A national greeting" } }),

  // ── Awareness days that fit an industry ─────────────────────────────────────────────────────
  S({ id: "global-entrepreneurship-2026", kind: "awareness", name: { ar: "أسبوع ريادة الأعمال العالمي", en: "Global Entrepreneurship Week" }, from: "2026-11-16", to: "2026-11-22", countries: "all", industries: ["software", "fintech", "b2b", "agency", "education", "media"], lead: 14, angle: { ar: "قصة بداية العلامة، ونصائح لرواد الأعمال", en: "The brand's founding story, tips for founders" } }),
  S({ id: "diabetes-day-2026", kind: "awareness", name: { ar: "اليوم العالمي للسكري", en: "World Diabetes Day" }, from: "2026-11-14", countries: "all", industries: HEALTH, lead: 10, angle: { ar: "معلومة صحية موثوقة + خدمتك", en: "A trustworthy health tip + your service" } }),
  S({ id: "disabilities-day-2026", kind: "awareness", name: { ar: "اليوم الدولي للأشخاص ذوي الإعاقة", en: "International Day of Persons with Disabilities" }, from: "2026-12-03", countries: "all", industries: ["health", "nonprofit", "education", "software", "telecom"], lead: 10, angle: { ar: "إتاحة منتجك للجميع", en: "How your product works for everyone" } }),
  S({ id: "arabic-language-day-2026", kind: "awareness", name: { ar: "اليوم العالمي للغة العربية", en: "World Arabic Language Day" }, from: "2026-12-18", countries: ARAB, industries: ["education", "media", "software", "agency", "kids"], lead: 14, angle: { ar: "احتفاء بالعربية في منتجك ومحتواك", en: "Celebrating Arabic in your product and content" } }),
  S({ id: "health-day-2027", kind: "awareness", name: { ar: "يوم الصحة العالمي", en: "World Health Day" }, from: "2027-04-07", countries: "all", industries: HEALTH, lead: 10, angle: { ar: "عادة صحية بسيطة", en: "One simple healthy habit" } }),
  S({ id: "earth-day-2027", kind: "awareness", name: { ar: "يوم الأرض", en: "Earth Day" }, from: "2027-04-22", countries: "all", industries: ["energy", "agriculture", "construction", "home", "nonprofit", "logistics", "automotive"], lead: 10, angle: { ar: "ما تفعله العلامة لتقليل الهدر", en: "What the brand does to waste less" } }),
  S({ id: "tourism-day-2027", kind: "awareness", name: { ar: "يوم السياحة العالمي", en: "World Tourism Day" }, from: "2027-09-27", countries: "all", industries: ["travel", "events", "food"], lead: 14, angle: { ar: "وجهة أو تجربة محلية", en: "A local destination or experience" } }),
  S({ id: "coffee-day-2027", kind: "awareness", name: { ar: "اليوم العالمي للقهوة", en: "International Coffee Day" }, from: "2027-10-01", countries: "all", industries: ["food", "grocery", "retail"], lead: 10, angle: { ar: "عرض أو قصة عن القهوة", en: "An offer or a story about coffee" } }),
  S({ id: "teachers-day-2027", kind: "awareness", name: { ar: "اليوم العالمي للمعلم", en: "World Teachers' Day" }, from: "2027-10-05", countries: "all", industries: ["education", "kids", "software"], lead: 10, angle: { ar: "شكر للمعلمين", en: "Thanking teachers" } }),
  S({ id: "breast-cancer-2027", kind: "awareness", name: { ar: "شهر التوعية بسرطان الثدي", en: "Breast Cancer Awareness Month" }, from: "2027-10-01", to: "2027-10-31", countries: "all", industries: ["health", "pharma", "beauty", "fitness", "fashion", "nonprofit"], lead: 14, angle: { ar: "رسالة توعية باللون الوردي", en: "A pink awareness message" } }),
  S({ id: "food-day-2027", kind: "awareness", name: { ar: "يوم الأغذية العالمي", en: "World Food Day" }, from: "2027-10-16", countries: "all", industries: ["food", "grocery", "agriculture", "nonprofit"], lead: 10, angle: { ar: "من المزرعة للطبق", en: "From the farm to the plate" } }),
];

/** pay days: Saudi government salaries land on the 27th; elsewhere the last days of the month */
function paydays(fromDay: string, months: number): Season[] {
  const out: Season[] = [];
  const [y0, m0] = fromDay.split("-").map(Number);
  for (let i = 0; i < months; i++) {
    const y = y0 + Math.floor((m0 - 1 + i) / 12), m = ((m0 - 1 + i) % 12) + 1, mm = String(m).padStart(2, "0");
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    out.push({ id: `sa-payday-${y}-${mm}`, kind: "payday", name: { ar: "يوم الراتب (27)", en: "Pay day (27th)" }, from: `${y}-${mm}-27`, countries: ["SA"], industries: [...SELLERS, "travel", "events", "fitness", "fintech"], lead: 5, angle: { ar: "عرض نزول الراتب", en: "A salary-day offer" } });
    out.push({ id: `payday-${y}-${mm}`, kind: "payday", name: { ar: "آخر الشهر (القبض)", en: "End of month (pay day)" }, from: `${y}-${mm}-${String(last - 2).padStart(2, "0")}`, to: `${y}-${mm}-${last}`, countries: [...GCC.filter((c) => c !== "SA"), "EG", "JO", "LB", "IQ", "MA", "DZ", "TN"], industries: [...SELLERS, "travel", "events", "fitness"], lead: 5, angle: { ar: "عرض أول القبض", en: "A pay-day offer" } });
  }
  return out;
}

const ALL = [...SEASONS, ...paydays("2026-10", 15)];

export type UpcomingSeason = Season & { daysAway: number; ongoing: boolean };

/** the moments in the next `within` days (or each one's own lead) for a brand's countries and industry, soonest first */
export function upcomingSeasons(opts: { today: string; countries: string[]; industry?: string | null; within?: number }): UpcomingSeason[] {
  const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const t = day(opts.today);
  const markets = opts.countries.length ? opts.countries : [...GCC, "EG"]; // a brand that hasn't said yet: the core markets
  return ALL.filter((s) => {
    if (s.countries !== "all" && !s.countries.some((c) => markets.includes(c))) return false;
    if (s.industries && opts.industry && opts.industry !== "other" && !s.industries.includes(opts.industry as Industry)) return false;
    const start = day(s.from), end = day(s.to ?? s.from);
    if (end < t) return false;
    const lead = opts.within ?? s.lead ?? 21;
    return start - t <= lead * 86400000;
  })
    .map((s) => ({ ...s, daysAway: Math.max(0, Math.round((day(s.from) - t) / 86400000)), ongoing: day(s.from) <= t }))
    .sort((a, b) => a.daysAway - b.daysAway);
}

/** the dated moments inside a period (for plan ideas) */
export function seasonsBetween(opts: { from: string; to: string; countries: string[]; industry?: string | null }) {
  return ALL.filter((s) => (s.to ?? s.from) >= opts.from && s.from <= opts.to)
    .filter((s) => s.countries === "all" || s.countries.some((c) => (opts.countries.length ? opts.countries : [...GCC, "EG"]).includes(c)))
    .filter((s) => !s.industries || !opts.industry || opts.industry === "other" || s.industries.includes(opts.industry as Industry))
    .sort((a, b) => a.from.localeCompare(b.from));
}
