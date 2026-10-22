// The brand's industry (one, from this list): what ideas, seasons and daily trends are matched against.

export const INDUSTRIES = [
  "ecommerce", "retail", "fashion", "beauty", "jewelry", "food", "grocery", "health", "pharma", "fitness",
  "education", "kids", "software", "fintech", "realestate", "construction", "logistics", "automotive", "travel",
  "events", "media", "gaming", "telecom", "home", "electronics", "b2b", "agency", "legal", "nonprofit", "energy",
  "agriculture", "other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABEL: Record<Industry, { ar: string; en: string }> = {
  ecommerce: { ar: "تجارة إلكترونية ومتاجر أونلاين", en: "E-commerce & online stores" },
  retail: { ar: "تجزئة ومحلات", en: "Retail & shops" },
  fashion: { ar: "أزياء وملابس", en: "Fashion & apparel" },
  beauty: { ar: "تجميل وعناية", en: "Beauty & personal care" },
  jewelry: { ar: "مجوهرات وإكسسوارات", en: "Jewelry & accessories" },
  food: { ar: "مطاعم وكافيهات", en: "Restaurants & cafés" },
  grocery: { ar: "بقالة وسوبرماركت", en: "Grocery & supermarkets" },
  health: { ar: "صحة وعيادات", en: "Health & clinics" },
  pharma: { ar: "صيدليات ومنتجات صحية", en: "Pharmacies & health products" },
  fitness: { ar: "لياقة ورياضة", en: "Fitness & sports" },
  education: { ar: "تعليم وتدريب", en: "Education & training" },
  kids: { ar: "أطفال وأمهات", en: "Kids & parents" },
  software: { ar: "برمجيات وتطبيقات (SaaS)", en: "Software & apps (SaaS)" },
  fintech: { ar: "خدمات مالية ومدفوعات", en: "Finance & payments" },
  realestate: { ar: "عقارات", en: "Real estate" },
  construction: { ar: "مقاولات وتشطيبات", en: "Construction & contracting" },
  logistics: { ar: "شحن ونقل وتوصيل", en: "Logistics, transport & delivery" },
  automotive: { ar: "سيارات", en: "Automotive" },
  travel: { ar: "سفر وسياحة وفنادق", en: "Travel, tourism & hotels" },
  events: { ar: "فعاليات وترفيه", en: "Events & entertainment" },
  media: { ar: "إعلام وصناعة محتوى", en: "Media & creators" },
  gaming: { ar: "ألعاب", en: "Gaming" },
  telecom: { ar: "اتصالات وإنترنت", en: "Telecom & internet" },
  home: { ar: "أثاث وديكور ومنزل", en: "Home, furniture & décor" },
  electronics: { ar: "إلكترونيات وأجهزة", en: "Electronics & devices" },
  b2b: { ar: "خدمات أعمال واستشارات", en: "Business services & consulting" },
  agency: { ar: "وكالة تسويق وإبداع", en: "Marketing & creative agency" },
  legal: { ar: "محاماة وخدمات قانونية", en: "Legal services" },
  nonprofit: { ar: "جمعيات وعمل خيري", en: "Nonprofit & charity" },
  energy: { ar: "طاقة وخدمات صناعية", en: "Energy & industrial" },
  agriculture: { ar: "زراعة وأغذية", en: "Agriculture & food production" },
  other: { ar: "مجال آخر", en: "Other" },
};

export const isIndustry = (v: unknown): v is Industry => typeof v === "string" && (INDUSTRIES as readonly string[]).includes(v);
export const industryLabel = (v: string | null | undefined, locale: string) => (isIndustry(v) ? INDUSTRY_LABEL[v][locale === "ar" ? "ar" : "en"] : "");

/** groups the seasons calendar uses ("shopping" moments matter to every seller, and so on) */
export const SELLERS: Industry[] = ["ecommerce", "retail", "fashion", "beauty", "jewelry", "grocery", "pharma", "home", "electronics", "kids", "automotive", "food"];
export const FAMILY: Industry[] = ["kids", "education", "fashion", "retail", "ecommerce", "food", "travel", "events", "home", "beauty"];
