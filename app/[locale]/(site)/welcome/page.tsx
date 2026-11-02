import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { todayKey } from "@/lib/dates";
import { upcomingSeasons } from "@/lib/market/seasons";
import { Reveal } from "./parts";

const C = {
  ar: {
    kicker: "استوديو محتوى بيعرف براندك",
    h1: ["براندك يستاهل", "يتشاف كل يوم."],
    lead: "حط لينك موقعك أو ابدأ من الصفر، وخد فيديوهات وبوستات بألوانك وصوتك وسوقك. من غير ما تشرح براندك كل مرة.",
    start: "ابدأ دلوقتي", prices: "شوف الأسعار",
    doorsT: "من أي مكان تبدأ منه.",
    doors: [{ t: "عندك موقع؟", d: "حط اللينك، وبنقرا لوجوك وألوانك وخطوطك وصوتك وشاشاتك الحقيقية. كل قطعة بعد كده بتطلع بهوية براندك." , c: "حط لينك موقعك" }, { t: "لسه بتبدأ؟", d: "احكي عن شغلك. بنسألك الأسئلة الصح، ونوريك اتجاهات مختلفة، وتخرج ببراند كامل: لوجو وموقع وصور وملفات جاهزة لأدوات الذكاء الاصطناعي.", c: "اعمل براندك" }],
    makeK: "اللي بتعمله هنا", makeT: "كل اللي براندك بينزله، من مكان واحد.",
    make: [{ t: "فيديوهات موشن", d: "قصة كاملة بصوت بلهجتك وموسيقى، وشاشاتك الحقيقية في المشاهد." }, { t: "بوستات وكاروسيل وستوريز", d: "بالمقاس الصح لكل منصة، ومكتوبة بكلام براندك." }, { t: "خطة وجدول نشر", d: "أفكار الشهر كله، موزعة على أيام الأسبوع، وتتعمل بضغطة." }],
    brandK: "براند من الصفر", brandT: "مش لوجو وبس. براند تقدر تشوفه في الواقع.", brandD: "كل براند بياخد موقع متصمم مخصوص، وصور في الأماكن اللي شغله فعلًا بيتشاف فيها. والذكاء الاصطناعي بيختار اللي يناسب شغلك: اللي يناسب مخبز غير اللي يناسب شركة مدفوعات.",
    sample: "براندات تجريبية اتعملت بـ MotionGX. الصور منتجة بالذكاء الاصطناعي.",
    siteL: "موقع متصمم للبراند",
    marketK: "بيعرف سوقك", marketT: "مواسم وترندات بلدك، قبل ما تفوتك.", now: "دلوقتي", inDays: "بعد {n} يوم", marketD: "اختار مجالك والدول اللي شغال فيها. بنفكرك برمضان والأعياد والأيام الوطنية وترند مجالك النهارده، ونكتبلك فكرة تناسب براندك. والصوت بيتكلم مصري أو سعودي زي عميلك.",
    howT: "تلات خطوات.", how: [["عرّفنا ببراندك", "لينك موقعك، أو كلمنا عن شغلك."], ["قول عايز إيه", "فيديو أو بوست أو خطة شهر كامل، وشوف السعر المتوقع قبل ما تبدأ."], ["عدّل وانشر", "اطلب أي تغيير بكلامك، ونزّل شغلك وحطه في الجدول."]],
    priceT: "ادفع على اللي بتعمله بس.", priceD: "من غير اشتراك ولا باقات. اشحن رصيدك، وكل قطعة ليها سعرها.", priceC: "الأسعار بالتفصيل",
    endT: "براندك جاهز. ابدأ أول قطعة.", 
  },
  en: {
    kicker: "The content studio that knows your brand",
    h1: ["Your brand deserves", "to be seen every day."],
    lead: "Paste your website or start from nothing, and get videos and posts in your colours, your voice and your market, without explaining your brand every time.",
    start: "Get started", prices: "See pricing",
    doorsT: "Start from wherever you are.",
    doors: [{ t: "Have a website?", d: "Paste the link. We read your logo, colours, fonts, voice and real screens, so everything after that comes out in your brand.", c: "Paste your link" }, { t: "Just starting?", d: "Tell us about your business. We ask the right questions, show you different directions, and you leave with a whole brand: logo, website, photos, and files ready for AI tools.", c: "Create your brand" }],
    makeK: "What you make here", makeT: "Everything your brand publishes, in one place.",
    make: [{ t: "Motion videos", d: "A whole story, with a voice in your dialect, music, and your real screens in the scenes." }, { t: "Posts, carousels and stories", d: "The right size for each platform, written in your brand's words." }, { t: "A plan and a calendar", d: "A month of ideas across the week, each one a click away from being made." }],
    brandK: "A brand from nothing", brandT: "Not just a logo. A brand you can see in the real world.", brandD: "Each brand gets its own designed website, and photos in the places its business really shows up. The AI chooses what fits: what a bakery brands isn't what a payments company brands.",
    sample: "Sample brands made with MotionGX. Images are AI-generated.",
    siteL: "A website designed for the brand",
    marketK: "It knows your market", marketT: "Your country's seasons and trends, before you miss them.", now: "now", inDays: "in {n} days", marketD: "Choose your industry and the countries you work in. We remind you of Ramadan, holidays, national days and today's trends in your field, and draft an idea that fits your brand. And the voice speaks Egyptian or Saudi, like your customer.",
    howT: "Three steps.", how: [["Introduce your brand", "Your website link, or tell us about your business."], ["Say what you want", "A video, a post or a whole month's plan. See the expected price before you start."], ["Change it and publish", "Ask for any change in your own words, then download it and put it on the calendar."]],
    priceT: "Pay only for what you make.", priceD: "No subscription, no plans. Top up your balance, and each piece has its price.", priceC: "Pricing in detail",
    endT: "Your brand is ready. Start your first piece.",
  },
};
const PHOTOS = ["storefront", "booth", "card", "uniform", "packaging", "billboard", "tshirt"];

/** the public homepage: what signed-out visitors get at the root */
export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = C[locale === "ar" ? "ar" : "en"];
  const L = locale === "ar" ? "ar" : "en";
  // the real calendar, for one market, so visitors see what "it knows your market" means
  const seasons = upcomingSeasons({ today: todayKey(), countries: ["EG"], industry: "other", within: 120 }).filter((s) => s.kind !== "payday").slice(0, 4);
  return (
    <div className="s-lp">
      <section className="s-lp-hero">
        <div className="s-lp-aurora" aria-hidden="true"><i /><i /></div>
        <p className="s-lp-k">{c.kicker}</p>
        <h1><span>{c.h1[0]}</span> <span className="lit">{c.h1[1]}</span></h1>
        <p className="lead">{c.lead}</p>
        <div className="cta"><Link href="/signup" className="s-btn lit">{c.start}</Link><Link href="/pricing" className="s-btn ghost">{c.prices}</Link></div>
        <div className="s-lp-shots" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="a" src="/landing/post.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="b" src="/landing/website.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="c" src="/landing/bakery-storefront.webp" alt="" />
        </div>
      </section>

      <Reveal className="s-lp-sec"><h2 className="s-lp-t">{c.doorsT}</h2>
        <div className="s-lp-doors">{c.doors.map((d, i) => <Link key={d.t} href="/signup" className={`door d${i}`}><h3>{d.t}</h3><p>{d.d}</p><span>{d.c} <i aria-hidden="true">←</i></span></Link>)}</div>
      </Reveal>

      <Reveal className="s-lp-sec"><p className="s-lp-k">{c.makeK}</p><h2 className="s-lp-t">{c.makeT}</h2>
        <div className="s-lp-make">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="art"><img src="/landing/post.webp" alt="" loading="lazy" /></div>
          <ol>{c.make.map((m, i) => <li key={m.t}><i>0{i + 1}</i><div><h3>{m.t}</h3><p>{m.d}</p></div></li>)}</ol>
        </div>
      </Reveal>

      <section className="s-lp-dark"><Reveal className="in-dark">
        <p className="s-lp-k">{c.brandK}</p><h2 className="s-lp-t">{c.brandT}</h2><p className="s-lp-d">{c.brandD}</p>
        <div className="s-lp-gallery">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <figure className="site"><img src="/landing/website.webp" alt={c.siteL} loading="lazy" /><figcaption>{c.siteL}</figcaption></figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {PHOTOS.map((p) => <figure key={p}><img src={`/landing/bakery-${p}.webp`} alt="" loading="lazy" /></figure>)}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <figure><img src="/landing/fintech.webp" alt="" loading="lazy" /></figure>
        </div>
        <p className="s-lp-fine">{c.sample}</p>
      </Reveal></section>

      <Reveal className="s-lp-sec s-lp-market"><div><p className="s-lp-k">{c.marketK}</p><h2 className="s-lp-t">{c.marketT}</h2><p className="s-lp-d">{c.marketD}</p></div><ul className="s-lp-cal">{seasons.map((x) => <li key={x.id}><b dir="auto">{x.name[L]}</b><span>{x.ongoing ? c.now : c.inDays.replace("{n}", String(x.daysAway))}</span></li>)}</ul></Reveal>

      <Reveal className="s-lp-sec"><h2 className="s-lp-t">{c.howT}</h2><ol className="s-lp-how">{c.how.map(([h, d], i) => <li key={h}><i>{i + 1}</i><h3>{h}</h3><p>{d}</p></li>)}</ol></Reveal>

      <Reveal className="s-lp-sec s-lp-end">
        <div className="price"><h2>{c.priceT}</h2><p>{c.priceD}</p><Link href="/pricing" className="link">{c.priceC}</Link></div>
        <div className="final"><h2>{c.endT}</h2><Link href="/signup" className="s-btn">{c.start}</Link></div>
      </Reveal>
    </div>
  );
}
