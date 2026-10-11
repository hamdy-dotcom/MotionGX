// PHASE 2: replace with Claude script generation (brief + brand + goal + dialect → scenes).
// For now it always returns the same 7 scenes, timed to fit the chosen length.
import type { Dialect, Scene } from "@/lib/types";

type SceneSeed = { title: string; weight: number; ar: [string, string]; en: [string, string] };

const SCENES: SceneSeed[] = [
  {
    title: "الخطّاف",
    weight: 2,
    ar: ["عندك منتج وعايز تبيعه أونلاين؟", "عندك منتج وعايز تبيعه أونلاين؟ استنى ثانية."],
    en: ["Got a product to sell online?", "Got a product you want to sell online? Wait a second."],
  },
  {
    title: "من لينك لمتجر",
    weight: 3,
    ar: ["من لينك لمتجر كامل", "حط لينك منتجك، ومنتوج يعملك متجر كامل في دقايق."],
    en: ["From a link to a full store", "Paste your product link and Mantoog builds a full store in minutes."],
  },
  {
    title: "الشعار",
    weight: 1.5,
    ar: ["منتوج", "ده منتوج."],
    en: ["Mantoog", "This is Mantoog."],
  },
  {
    title: "صفحات بالذكاء الاصطناعي",
    weight: 3,
    ar: ["صفحات بيع بالذكاء الاصطناعي", "صفحات بيع مكتوبة ومصممة بالذكاء الاصطناعي، جاهزة تبيع."],
    en: ["AI-built sales pages", "Sales pages written and designed by AI, ready to sell."],
  },
  {
    title: "إعلانات تيك توك",
    weight: 3,
    ar: ["إعلانات تيك توك بضغطة", "وإعلانات تيك توك بتطلع لوحدها، من غير ما تصور حاجة."],
    en: ["TikTok ads in one click", "And TikTok ads launch on their own, no filming needed."],
  },
  {
    title: "العرض",
    weight: 2,
    ar: ["أول شهر مجانًا", "وأول شهر عليّا، مجانًا."],
    en: ["First month free", "And your first month is on us."],
  },
  {
    title: "سجّل دلوقتي",
    weight: 1.5,
    ar: ["سجّل دلوقتي على mantoog.com", "سجّل دلوقتي على منتوج دوت كوم."],
    en: ["Sign up at mantoog.com", "Sign up today at mantoog.com."],
  },
];

export function generateScript(lengthS: number, dialect: Dialect): { scenes: Scene[]; script: Record<string, unknown> } {
  const durations = splitDuration(lengthS, SCENES.map((s) => s.weight));
  const lang = dialect === "en" ? "en" : "ar";

  const scenes = SCENES.map((seed, i) => ({
    id: `s${i + 1}`,
    title: seed.title,
    duration_s: durations[i],
    on_screen_text: seed[lang][0],
    voiceover_line: seed[lang][1],
  }));

  return { scenes, script: { generator: "mock", dialect, length_s: lengthS } };
}

/** Alternate wording for "أعد كتابة المشهد" — PHASE 2: ask Claude for a rewrite. */
export function rewriteScene(scene: Scene, dialect: Dialect): Scene {
  const index = SCENES.findIndex((s) => s.title === scene.title);
  if (index === -1) return scene;
  const options = dialect === "en" ? [SCENES[index].en, ALT_EN[index]] : [SCENES[index].ar, ALT_AR[index]];
  const [text, line] = options.find(([t]) => t !== scene.on_screen_text) ?? options[0];
  return { ...scene, on_screen_text: text, voiceover_line: line };
}

const ALT_AR: [string, string][] = [
  ["لسه بتبيع على الواتساب؟", "لسه بتبيع على الواتساب وبتضيّع أوردرات؟"],
  ["لينك واحد = متجر", "لينك واحد بس، ومتجرك يبقى جاهز."],
  ["منتوج", "منتوج. بيع أسهل."],
  ["الصفحة بتكتب نفسها", "الصفحة بتتكتب وتتصمم لوحدها بالذكاء الاصطناعي."],
  ["إعلانك جاهز", "إعلان تيك توك جاهز من غير تصوير."],
  ["جرّب ببلاش", "جرّب أول شهر ببلاش."],
  ["ابدأ النهارده", "ابدأ النهارده على منتوج دوت كوم."],
];

const ALT_EN: [string, string][] = [
  ["Still selling over DMs?", "Still selling over DMs and losing orders?"],
  ["One link = one store", "One link, and your store is ready."],
  ["Mantoog", "Mantoog. Selling made simple."],
  ["Pages that write themselves", "Pages written and designed by AI."],
  ["Your ad is ready", "A TikTok ad, ready without a shoot."],
  ["Try it free", "Try your first month free."],
  ["Start today", "Start today at mantoog.com."],
];

/** Largest-remainder split of whole seconds, at least 1 s per scene. */
function splitDuration(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map((r) => Math.max(1, Math.floor(r)));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i]++;
  return out;
}
