import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicPrice } from "@/lib/billing";
import { SITE } from "@/lib/site";

const C = {
  ar: { kicker: "الأسعار", title: "ادفع على اللي بتعمله بس.", lead: "من غير اشتراكات ولا باقات ولا مقاعد. اشحن رصيدك، وكل قطعة بتشوف سعرها المتوقع قبل ما تبدأ.", cta: "ابدأ", cur: "ج.م", from: "حوالي", min: "أقل حاجة",
    range: "50–200", groups: [{ t: "فيديوهات", d: "إعلانات موشن بهويتك وصوت وموسيقى، والسعر حسب الطول والتعقيد." }, { t: "بوستات", d: "صور وكاروسيل وستوريز جاهزة للنشر." }, { t: "هوية البراند", d: "لو لسه بتبدأ أو عندك موقع." }],
    items: { p1: "بوست صورة", p5: "كاروسيل 5 شرائح", tx: "بوست نص فقط", pack: "براند كامل: لوجو وموقع وصور وملفات", read: "قراءة موقعك الحالي" },
    freeT: "مجانًا دايمًا", free: ["الأشكال المبدئية للبراند الجديد", "تنزيل وتصدير شغلك", "أي حاجة تفشل من عندنا"],
    howT: "إزاي الدفع بيشتغل", how: [["اشحن رصيدك", "بالمبلغ اللي يناسبك، ورصيدك ما بينتهيش."], ["شوف السعر المتوقع", "قبل كل قطعة، وبنحجزه من رصيدك لحد ما تخلص."], ["ادفع السعر النهائي", "حسب اللي القطعة احتاجته، وممكن يكون أعلى أو أقل من المتوقع، والباقي بيرجع."]],
    note: "الأسعار تقريبية وبتتغير حسب طول القطعة وتعقيدها. السعر المتوقع بيظهر قبل ما تبدأ.", qT: "أسئلة", q: [["فيه اشتراك؟", "لأ. مفيش التزام شهري ولا رسوم ثابتة."], ["رصيدي بينتهي؟", "لأ، طول ما حسابك مفتوح. وتفاصيل الاسترداد في سياسة الاسترداد."], ["لو النتيجة ماعجبتنيش؟", "تطلب تعديل، وكل طلب له سعر بتشوفه قبل ما توافق. لو القطعة فيها عيب، راسلنا وهنصلحها أو نرد قيمتها."]], policies: "اقرأ الشروط وسياسة الاسترداد" },
  en: { kicker: "Pricing", title: "Pay only for what you make.", lead: "No subscriptions, no plans, no seats. Top up your balance, and see the expected price of every piece before you start.", cta: "Get started", cur: "EGP", from: "about", min: "from",
    range: "50–200", groups: [{ t: "Videos", d: "Motion ads in your brand, with voice and music. The price depends on length and complexity." }, { t: "Posts", d: "Images, carousels and stories, ready to publish." }, { t: "Brand identity", d: "Whether you're starting out or already have a site." }],
    items: { p1: "Image post", p5: "5-slide carousel", tx: "Text-only post", pack: "A complete brand: logo, website, photos and files", read: "Reading your existing website" },
    freeT: "Always free", free: ["Previews for a new brand", "Downloading and exporting your work", "Anything that fails on our side"],
    howT: "How paying works", how: [["Top up your balance", "Any amount that suits you. Your balance doesn't expire."], ["See the expected price", "Before every piece. We reserve it from your balance until it's done."], ["Pay the final price", "Based on what the piece took, which can be above or below the estimate. The rest is released."]],
    note: "Prices are approximate and vary with length and complexity. You see the expected price before you start.", qT: "Questions", q: [["Is there a subscription?", "No. No monthly commitment and no fixed fees."], ["Does my balance expire?", "No, not while your account is open. Refund details are in our Refund Policy."], ["What if I don't like the result?", "Ask for a change. Each request shows its price before you agree. If a piece is defective, write to us and we'll fix it or return its charge."]], policies: "Read the terms and refund policy" },
};

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = C[locale === "ar" ? "ar" : "en"];
  const [p1, p5, tx, pack, read] = await Promise.all([publicPrice({ kind: "post", type: "single" }), publicPrice({ kind: "post", type: "carousel", slides: 5 }), publicPrice({ kind: "post", type: "text" }), publicPrice({ kind: "brand" }), publicPrice({ kind: "capture" })]);
  const row = (k: keyof typeof c.items, v: number) => <li key={k}><span>{c.items[k]}</span><b><small>{c.from}</small> <span dir="ltr">{v.toLocaleString("en")}</span> {c.cur}</b></li>;
  const lists = [[<li key="v" className="range"><span dir="ltr"><b>{c.range}</b> {c.cur}</span></li>], [row("p1", p1), row("p5", p5), row("tx", tx)], [row("pack", pack), row("read", read)]];
  return (
    <div className="s-price">
      <section className="hero"><p className="s-label plain">{c.kicker} · {SITE.name}</p><h1>{c.title}</h1><p>{c.lead}</p><Link href="/login" className="s-btn lit">{c.cta}</Link></section>
      <section className="cards">{c.groups.map((g, i) => <div key={g.t} className="card"><h2>{g.t}</h2><p>{g.d}</p><ul>{lists[i]}</ul></div>)}</section>
      <p className="note">{c.note}</p>
      <section className="split">
        <div className="free"><h2>{c.freeT}</h2><ul>{c.free.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><h2>{c.howT}</h2><ol>{c.how.map(([h, d], i) => <li key={h}><i>{i + 1}</i><div><b>{h}</b><p>{d}</p></div></li>)}</ol></div>
      </section>
      <section className="faq"><h2>{c.qT}</h2>{c.q.map(([h, d]) => <div key={h}><b>{h}</b><p>{d}</p></div>)}<Link href="/terms" className="link">{c.policies}</Link></section>
    </div>
  );
}
