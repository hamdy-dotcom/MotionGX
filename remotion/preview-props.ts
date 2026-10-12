// Default props for Remotion Studio and design QA stills: every scene type once, Slllr's real brand.
import type { BrandVideoProps } from "../lib/video/kit";
import { SLLLR_LOGO } from "./fixtures/slllr-logo";

export const previewProps: BrandVideoProps = {
  format: "9:16",
  fps: 30,
  lengthS: 60,
  lang: "ar",
  bpm: 110,
  music: null,
  voiceover: null,
  brand: {
    name: "SLLLR",
    logoUrl: SLLLR_LOGO,
    logoPlate: true,
    colors: [
      { hex: "#00A67C", role: "primary" },
      { hex: "#12263F", role: "ink" },
      { hex: "#26C486", role: "accent" },
      { hex: "#FFFFFF", role: "background" },
    ],
    fonts: { arabic: "Readex Pro", latin: "Space Grotesk" },
    url: "slllr.com",
    imageUrl: null,
  },
  scenes: [
    { id: "s1", type: "hook", title: "الخطّاف", duration_beats: 6, lines: ["تبي تبيع أونلاين؟", "بدون مخزون؟"], props: { emphasis_line: 1 }, voiceover_line: null },
    { id: "s2", type: "problem", title: "المشكلة", duration_beats: 7, lines: ["التجارة تتعبك؟"], props: { pains: ["تخزين المنتجات", "الشحن والتوصيل", "خدمة العملاء"] }, voiceover_line: null },
    { id: "s3", type: "logo_reveal", title: "الشعار", duration_beats: 6, lines: ["منصة سلر", "للدروبشيبنج"], props: {}, voiceover_line: null },
    { id: "s4", type: "feature_list", title: "المميزات", duration_beats: 8, lines: ["كل شي علينا"], props: { items: [{ text: "شحن لكل المدن", icon: "truck" }, { text: "منتجات جاهزة", icon: "box" }, { text: "أرباح أسبوعية", icon: "wallet" }, { text: "دعم فني", icon: "users" }] }, voiceover_line: null },
    { id: "s5", type: "stat", title: "رقم", duration_beats: 6, lines: ["تجّار معنا"], props: { value: 2500, prefix: "+", suffix: "", caption: "يبيعون كل يوم" }, voiceover_line: null },
    { id: "s6", type: "steps", title: "الخطوات", duration_beats: 7, lines: ["ابدأ في 3 خطوات"], props: { steps: ["سجّل حسابك", "اختر منتجاتك", "ابدأ البيع"] }, voiceover_line: null },
    { id: "s7", type: "phone_mock", title: "الجوال", duration_beats: 8, lines: ["متجرك في جوالك"], props: { screen_title: "متجري", items: ["طلب جديد", "تم الشحن", "تم التوصيل"], button: "اطلب الحين" }, voiceover_line: null },
    { id: "s8", type: "before_after", title: "قبل وبعد", duration_beats: 7, lines: ["الفرق واضح"], props: { before_label: "قبل", before: ["رأس مال كبير", "مخزون"], after_label: "مع سلر", after: ["بدون رأس مال", "بدون مخزون"] }, voiceover_line: null },
    { id: "s9", type: "offer", title: "العرض", duration_beats: 6, lines: ["سجّل اليوم"], props: { value: "مجانًا", badge: "عرض الإطلاق" }, voiceover_line: null },
    { id: "s10", type: "quote", title: "اقتباس", duration_beats: 6, lines: ["أسهل منصة", "جربتها في حياتي"], props: { author: "تاجر من الرياض" }, voiceover_line: null },
    { id: "s11", type: "comparison", title: "مقارنة", duration_beats: 7, lines: ["ليش سلر؟"], props: { us_label: "سلر", them_label: "غيرنا", rows: ["بدون مخزون", "شحن سريع", "أرباح أسبوعية"] }, voiceover_line: null },
    { id: "s12", type: "chips_cloud", title: "كلمات", duration_beats: 6, lines: ["كل اللي تحتاجه"], props: { chips: ["متجر جاهز", "شحن", "دفع عند الاستلام", "تسويق", "تقارير", "دعم"] }, voiceover_line: null },
    { id: "s13", type: "split_image", title: "صورة", duration_beats: 6, lines: ["ركّز على البيع", "واحنا نتكفل بالباقي"], props: { caption: "من الطلب للتوصيل" }, voiceover_line: null },
    { id: "s14", type: "cta", title: "الدعوة", duration_beats: 6, lines: ["ابدأ تجارتك", "اليوم"], props: { url: "slllr.com", button: "سجّل الحين" }, voiceover_line: null },
    { id: "s15", type: "outro_logo", title: "الختام", duration_beats: 6, lines: ["ثورة في عالم الدروبشيبنج"], props: { url: "slllr.com" }, voiceover_line: null },
  ],
};
