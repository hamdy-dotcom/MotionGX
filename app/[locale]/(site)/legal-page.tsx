import { LEGAL } from "@/lib/legal/content";
import { SITE } from "@/lib/site";

const FILL: Record<string, { ar: string; en: string }> = { email: { ar: "نموذج التواصل داخل حسابك", en: "the contact option in your account" }, payments: { ar: "مقدم خدمة الدفع", en: "our payment provider" } };

export function LegalPage({ page, locale }: { page: "terms" | "privacy" | "refunds"; locale: string }) {
  const L = locale === "ar" ? "ar" : "en", doc = LEGAL[L][page];
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k === "name" ? SITE.name : (SITE.legal as Record<string, string>)[k] || FILL[k]?.[L] || k));
  return (
    <article className="s-legal">
      <p className="s-label plain">{L === "ar" ? "آخر تحديث" : "Last updated"} · <span dir="ltr">{SITE.updated}</span></p>
      <h1>{doc.title}</h1>
      <p className="lead">{fill(doc.intro)}</p>
      {doc.sections.map((s) => <section key={s.h}><h2>{s.h}</h2>{s.p.map((x) => <p key={x.slice(0, 40)}>{fill(x)}</p>)}</section>)}
    </article>
  );
}
