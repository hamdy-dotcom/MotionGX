import type { DemoText } from "./demos";

export const DEMO_TEXT: Record<"ar" | "en", DemoText> = {
  ar: {
    brand: { head: "أول براند", q1: "شغلك إيه؟", a1: "مخبز بيتي في المعادي", q2: "عايز الناس تحس بإيه؟", chips: ["فخامة", "دفا البيت", "فرحة"], making: "بنصمم 5 اتجاهات", names: ["فرن", "دفّا", "حلوة"], done: "براندك جاهز" },
    post: { head: "أول بوست", prompt: "بوست لعرض الجمعة البيضا", make: "اعمل", h1: "الجمعة البيضا", h2: "نص السعر", tag: "لفترة محدودة", done: "البوست جاهز", cal: "اتحط في الجدول" },
    video: { head: "أول فيديو", lines: ["عندك فكرة؟", "احكيهالنا", "وشوفها بتتحرك"], voice: "صوت مصري", done: "الفيديو جاهز" },
    site: { url: "yourbrand.com", read: "", logo: "اللوجو", colors: "الألوان", fonts: "الخطوط", voice: "الصوت", ready: "براندك اتقرا" },
    edit: { ask: "خلي العرض أوضح واللون أدفى", before: "عرض النهاردة", after: "خصم على كل حاجة" },
  },
  en: {
    brand: { head: "First brand", q1: "What's your business?", a1: "A home bakery in Maadi", q2: "How should people feel?", chips: ["Luxury", "Warm", "Joy"], making: "Designing 5 directions", names: ["Oven", "Warmth", "Sweet"], done: "Your brand is ready" },
    post: { head: "First post", prompt: "A post for our White Friday offer", make: "Make", h1: "White Friday", h2: "Half price", tag: "Limited time", done: "Your post is ready", cal: "Added to your calendar" },
    video: { head: "First video", lines: ["Got an idea?", "Tell us", "Watch it move"], voice: "Egyptian voice", done: "Your video is ready" },
    site: { url: "yourbrand.com", read: "", logo: "Logo", colors: "Colours", fonts: "Fonts", voice: "Voice", ready: "Your brand is read" },
    edit: { ask: "Make the offer clearer and warmer", before: "Today's offer", after: "A discount on everything" },
  },
};
