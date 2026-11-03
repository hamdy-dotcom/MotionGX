import type { DemoText } from "./demos";
import type { LiveText } from "./live-demos";

export const DEMO_TEXT: Record<"ar" | "en", DemoText> = {
  ar: {
    site: { url: "yourbrand.com", read: "", logo: "اللوجو", colors: "الألوان", fonts: "الخطوط", voice: "الصوت", ready: "براندك اتقرا" },
    edit: { ask: "خلي العرض أوضح واللون أدفى", before: "عرض النهاردة", after: "خصم على كل حاجة" },
  },
  en: {
    site: { url: "yourbrand.com", read: "", logo: "Logo", colors: "Colours", fonts: "Fonts", voice: "Voice", ready: "Your brand is read" },
    edit: { ask: "Make the offer clearer and warmer", before: "Today's offer", after: "A discount on everything" },
  },
};

export const LIVE_TEXT: Record<"ar" | "en", LiveText> = {
  ar: {
    name: "سفرة تيتا",
    brand: {
      business: "تورت بيتي بتتوصل في المعادي، لأعياد الميلاد والمناسبات الصغيرة",
      turns: [
        { q: "مين أكتر حد بيطلب منك؟", options: ["أمهات في المعادي", "شركات", "عرايس"], a: "أمهات في المعادي" },
        { q: "عايز الناس تحس بإيه أول ما تشوف البراند؟", options: ["فخامة", "دفا البيت", "فرحة"], a: "دفا البيت" },
      ],
      concepts: ["التورتة زي ما تيتا كانت بتعملها: سفرة عامرة، ومفرش مطرّز، وحب في كل شريحة.", "اسم صغير ودافي يشبه الفتات الحلو اللي بيفضل على الطبق، بشكل بسيط وضحوك."],
      notes: "خلّي الألوان أدفى شوية",
      world: ["واجهة المحل", "علبة التورتة", "تيشيرت", "يونيفورم", "لوحة إعلانية", "كارت"],
    },
    post: {
      brief: "عرض الجمعة: التورتة التانية بنص السعر",
      title: "عرض الجمعة",
      headline: "التورتة التانية بنص السعر",
      texts: { instagram: "الجمعة دي السفرة عليكي، والتورتة التانية علينا بنص السعر 🎂", facebook: "اطلبي تورتتين يوم الجمعة، والتانية بنص السعر.", x: "الجمعة بس: التورتة التانية بنص السعر." },
      tags: ["سفرة_تيتا", "المعادي"],
    },
    video: { brief: "فيديو عن الطلب من الموبايل والتوصيل في نفس اليوم", title: "كل تورتة وراها لمّة", mood: "دافي" },
  },
  en: {
    name: "Teta's Table",
    brand: {
      business: "Home-made cakes delivered in Maadi, for birthdays and small occasions",
      turns: [
        { q: "Who orders from you the most?", options: ["Mums in Maadi", "Companies", "Brides"], a: "Mums in Maadi" },
        { q: "What should people feel when they first see the brand?", options: ["Luxury", "Warmth of home", "Joy"], a: "Warmth of home" },
      ],
      concepts: ["Cake the way your grandmother made it: a full table, an embroidered cloth and love in every slice.", "A small, warm name, like the sweet crumbs left on the plate, in a simple and playful look."],
      notes: "Make the colours a little warmer",
      world: ["Storefront", "Cake box", "T-shirt", "Uniform", "Billboard", "Card"],
    },
    post: {
      brief: "Friday offer: the second cake at half price",
      title: "Friday offer",
      headline: "The second cake at half price",
      texts: { instagram: "This Friday the table is yours, and the second cake is half price 🎂", facebook: "Order two cakes on Friday and the second is half price.", x: "Friday only: the second cake at half price." },
      tags: ["TetasTable", "Maadi"],
    },
    video: { brief: "A video about ordering by phone and same-day delivery", title: "Every cake brings people together", mood: "warm" },
  },
};
