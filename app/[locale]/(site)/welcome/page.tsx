import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { todayKey } from "@/lib/dates";
import { upcomingSeasons } from "@/lib/market/seasons";
import { BrandDemo, CalendarDemo, CostCalc, Drift, EditDemo, FeedDemo, Phone, PostDemo, SiteDemo, SizesDemo, ThemeCycle, VideoDemo, VoiceDemo } from "@/components/site/demos";
import { publicPrice } from "@/lib/billing";
import { DEMO_TEXT } from "@/components/site/demo-text";
import { Reveal } from "./parts";

const C = {
  ar: {
    kicker: "استوديو محتوى بيعرف براندك", h1a: "براندك", h1b: "يستاهل يتشاف.", lead: "من أول براند لأول فيديو. احكيلنا، وشوف شغلك بيتعمل قدامك، بألوانك وصوتك وسوقك.", start: "ابدأ دلوقتي", prices: "الأسعار",
    tape: ["فيديوهات", "بوستات", "ستوريز", "لوجوهات", "مواقع", "خطط محتوى", "كاروسيل", "أغلفة"],
    pillars: ["سهل", "ذكي", "مفيد", "فعّال", "موفّر"],
    easyK: "سهل", easyT: "لو تعرف تحكي عن شغلك، تعرف تستخدمه.", easyD: "مفيش برامج تتعلمها ولا فريق تنسق معاه. جملة واحدة منك، والباقي علينا.",
    smartK: "ذكي", smartT: "بيعرف براندك وسوقك من غير ما تشرح.", smartD: "بيقرا هويتك مرة واحدة ويفتكرها في كل قطعة. وبيعرف مواسم بلدك وترند مجالك، وبيتكلم لهجة عميلك.",
    usefulK: "مفيد", usefulT: "كل اللي براندك بينزله، من مكان واحد.", usefulD: "فيديو، بوست، ستوري، غلاف، خطة شهر كامل، وحتى البراند نفسه لو لسه بتبدأ.",
    effectK: "فعّال", effectT: "براندك يفضل ظاهر كل أسبوع، وبنفس الشكل.", effectD: "الناس بتفتكر البراند اللي بتشوفه كتير وشكله ثابت. جدولك مليان، كل قطعة بألوانك وصوتك، وكل موسم في ميعاده.", effects: ["هوية واحدة في كل قطعة", "محتوى في مواعيد مواسم سوقك", "لهجة عميلك، مش ترجمة", "شاشاتك الحقيقية في الفيديوهات"],
    costK: "موفّر", costT: "احسبها بنفسك.", costD: "من غير اشتراك ولا عقد شهري. حرّك الأرقام، وقارنها باللي بتدفعه النهاردة.",
    calc: { posts: "بوستات في الشهر", videos: "فيديوهات في الشهر", today: "بتدفع كام في الشهر دلوقتي؟ (اختياري)", todayHint: "مثلًا لوكالة أو فريلانسر", month: "تكلفتك المتوقعة في الشهر", save: "ممكن توفر حوالي", noCommit: "بتدفع على اللي بتعمله بس، وتوقف في أي وقت.", fine: "تقدير من أسعارنا المعتادة. السعر النهائي لكل قطعة حسب اللي احتاجته." }, money: "ج.م",
    doorsT: "من أي مكان تبدأ منه.", doorA: "عندك موقع؟", doorAd: "حط اللينك. بنقرا لوجوك وألوانك وخطوطك وصوتك، وكل قطعة بعد كده بتطلع بهوية براندك.", doorB: "لسه بتبدأ؟", doorBd: "احكي عن شغلك، واختار اتجاه، وخد براند كامل: لوجو وموقع وصور وملفات جاهزة لأدوات الذكاء الاصطناعي.", doorC: "ابدأ من هنا",
    sizesT: "كل المقاسات", sizesD: "فيد وستوري وغلاف، من فكرة واحدة.", calT: "شهر كامل", calD: "أفكار موزعة على الجدول، تتعمل بضغطة.", calL: ["بوست", "فيديو", "ستوري"], editT: "عدّل بكلامك", editD: "قول عايز إيه، والقطعة بتتغير.", voiceT: "بيتكلم زي عميلك", voiceD: "صوت بلهجة سوقك، مش فصحى مترجمة.", voices: ["مصري", "سعودي", "إنجليزي"],
    marketT: "مواسم سوقك، قبل ما تفوتك.", marketD: "اختار مجالك والدول اللي شغال فيها. بنفكرك بكل موسم وترند، ونكتبلك فكرة تناسب براندك.", now: "دلوقتي", inDays: "بعد {n} يوم",
    endT: "أول قطعة ليك مستنية.", endD: "من غير اشتراك. بتدفع على اللي بتعمله بس.", 
  },
  en: {
    kicker: "The content studio that knows your brand", h1a: "Your brand", h1b: "deserves to be seen.", lead: "From your first brand to your first video. Tell us about it, and watch your work get made in front of you, in your colours, your voice and your market.", start: "Get started", prices: "Pricing",
    tape: ["Videos", "Posts", "Stories", "Logos", "Websites", "Content plans", "Carousels", "Covers"],
    pillars: ["Easy", "Smart", "Useful", "Effective", "Cost-efficient"],
    easyK: "Easy", easyT: "If you can describe your business, you can use it.", easyD: "No software to learn and no team to coordinate. One sentence from you, and the rest is on us.",
    smartK: "Smart", smartT: "It knows your brand and market without being told.", smartD: "It reads your identity once and remembers it in every piece. It knows your country's seasons and your field's trends, and speaks your customer's dialect.",
    usefulK: "Useful", usefulT: "Everything your brand publishes, in one place.", usefulD: "Videos, posts, stories, covers, a whole month's plan, and even the brand itself if you're just starting.",
    effectK: "Effective", effectT: "Your brand shows up every week, looking like itself.", effectD: "People remember brands they see often and that stay consistent. Your calendar stays full, every piece is in your colours and voice, and every season lands on time.", effects: ["One identity across every piece", "Content on your market's dates", "Your customer's dialect, not a translation", "Your real screens in your videos"],
    costK: "Cost-efficient", costT: "Work it out yourself.", costD: "No subscription and no monthly contract. Move the numbers and compare them with what you pay today.",
    calc: { posts: "Posts a month", videos: "Videos a month", today: "What do you pay a month now? (optional)", todayHint: "e.g. for an agency or freelancer", month: "Your expected monthly cost", save: "You could save about", noCommit: "Pay only for what you make, and stop any time.", fine: "An estimate from our typical prices. Each piece's final price depends on what it took." }, money: "EGP",
    doorsT: "Start from wherever you are.", doorA: "Have a website?", doorAd: "Paste the link. We read your logo, colours, fonts and voice, and everything after that comes out in your brand.", doorB: "Just starting?", doorBd: "Tell us about your business, choose a direction, and get a whole brand: logo, website, photos, and files ready for AI tools.", doorC: "Start here",
    sizesT: "Every size", sizesD: "Feed, story and cover, from one idea.", calT: "A whole month", calD: "Ideas across your calendar, a click from being made.", calL: ["Post", "Video", "Story"], editT: "Change it in words", editD: "Say what you want, and the piece changes.", voiceT: "Sounds like your customer", voiceD: "A voice in your market's dialect, not translated formal Arabic.", voices: ["Egyptian", "Saudi", "English"],
    marketT: "Your market's seasons, before you miss them.", marketD: "Choose your industry and the countries you work in. We remind you of every season and trend, and draft an idea that fits your brand.", now: "now", inDays: "in {n} days",
    endT: "Your first piece is waiting.", endD: "No subscription. Pay only for what you make.",
  },
};

/** the public homepage: what signed-out visitors get at the root */
export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale === "ar" ? "ar" : "en", c = C[L], d = DEMO_TEXT[L];
  const seasons = upcomingSeasons({ today: todayKey(), countries: ["EG"], industry: "other", within: 150 }).filter((s) => s.kind !== "payday").slice(0, 5);
  const tape = [...c.tape, ...c.tape, ...c.tape];
  const [post, carousel] = await Promise.all([publicPrice({ kind: "post", type: "single" }), publicPrice({ kind: "post", type: "carousel", slides: 5 })]);
  return (
    <ThemeCycle className="s-lp">
      <section className="s-lp-hero">
        <i className="glow" aria-hidden="true" />
        <p className="s-lp-k">{c.kicker}</p>
        <h1><span className="lit">{c.h1a}</span> <span>{c.h1b}</span></h1>
        <p className="lead">{c.lead}</p>
        <div className="cta"><Link href="/signup" className="s-btn lit">{c.start}</Link><Link href="/pricing" className="s-btn ghost">{c.prices}</Link></div>
        <Drift>
          <div className="fl-o o1" aria-hidden="true"><div className="o-post"><i /><b /><b className="s" /></div></div>
          <div className="fl-o o2" aria-hidden="true"><div className="o-play">▶</div></div>
          <div className="fl-o o3" aria-hidden="true"><div className="o-swatch"><i /><i /><i /><i /></div></div>
          <div className="fl-o o4" aria-hidden="true"><div className="o-time"><i /><i /><i /><u /></div></div>
          <div className="fl-o o5" aria-hidden="true"><div className="o-logo"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="var(--lp-a)" /><path d="M50 50 96 50A46 46 0 0 1 50 96Z" fill="var(--lp-b)" /></svg></div></div>
          <div className="fl-o o6" aria-hidden="true"><div className="o-aa">Aa أب</div></div>
          <div className="phones">
            <div className="p side"><Phone label={d.video.head}><VideoDemo t={d.video} /></Phone></div>
            <div className="p mid"><Phone label={d.brand.head}><BrandDemo t={d.brand} /></Phone></div>
            <div className="p side"><Phone label={d.post.head}><PostDemo t={d.post} /></Phone></div>
          </div>
        </Drift>
      </section>

      <div className="s-lp-tape" aria-hidden="true"><div>{tape.map((w, i) => <span key={i}>{w}<i /></span>)}</div></div>

      <div className="s-lp-light">
        <nav className="s-lp-pills" aria-label={c.kicker}>{c.pillars.map((p, i) => <a key={p} href={`#p${i}`}>{p}</a>)}</nav>

        <Reveal className="s-lp-sec" ><span id="p0" className="anchor" /><p className="s-lp-pk">{c.easyK}</p><h2 className="s-lp-t">{c.easyT}</h2><p className="s-lp-d">{c.easyD}</p>
          <div className="s-lp-doors">
            <Link href="/signup" className="door"><h3>{c.doorA}</h3><p>{c.doorAd}</p><SiteDemo t={d.site} /><span>{c.doorC}</span></Link>
            <Link href="/signup" className="door d1"><h3>{c.doorB}</h3><p>{c.doorBd}</p><div className="door-phone"><Phone label={d.brand.head}><BrandDemo t={d.brand} /></Phone></div><span>{c.doorC}</span></Link>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec"><span id="p1" className="anchor" /><p className="s-lp-pk">{c.smartK}</p><h2 className="s-lp-t">{c.smartT}</h2><p className="s-lp-d">{c.smartD}</p>
          <div className="s-lp-bento">
            <article className="b3"><VoiceDemo dialects={c.voices} /><h3>{c.voiceT}</h3><p>{c.voiceD}</p></article>
            <article className="b3"><ul className="s-lp-cal">{seasons.map((x) => <li key={x.id}><b dir="auto">{x.name[L]}</b><span>{x.ongoing ? c.now : c.inDays.replace("{n}", String(x.daysAway))}</span></li>)}</ul><h3>{c.marketT}</h3><p>{c.marketD}</p></article>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec"><span id="p2" className="anchor" /><p className="s-lp-pk">{c.usefulK}</p><h2 className="s-lp-t">{c.usefulT}</h2><p className="s-lp-d">{c.usefulD}</p>
          <div className="s-lp-bento">
            <article className="b1"><SizesDemo /><h3>{c.sizesT}</h3><p>{c.sizesD}</p></article>
            <article className="b2"><CalendarDemo labels={c.calL} /><h3>{c.calT}</h3><p>{c.calD}</p></article>
            <article className="b5"><EditDemo t={d.edit} /><div><h3>{c.editT}</h3><p>{c.editD}</p></div></article>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec s-lp-effect"><span id="p3" className="anchor" /><div><p className="s-lp-pk">{c.effectK}</p><h2 className="s-lp-t">{c.effectT}</h2><p className="s-lp-d">{c.effectD}</p><ul>{c.effects.map((x) => <li key={x}>{x}</li>)}</ul></div><FeedDemo /></Reveal>

        <Reveal className="s-lp-sec"><span id="p4" className="anchor" /><p className="s-lp-pk">{c.costK}</p><h2 className="s-lp-t">{c.costT}</h2><p className="s-lp-d">{c.costD}</p>
          <CostCalc t={c.calc} post={post} carousel={carousel} video={[50, 200]} money={c.money} />
        </Reveal>
      </div>

      <section className="s-lp-final">
        <i className="glow" aria-hidden="true" />
        <h2>{c.endT}</h2><p>{c.endD}</p>
        <div className="cta"><Link href="/signup" className="s-btn lit">{c.start}</Link><Link href="/pricing" className="s-btn ghost">{c.prices}</Link></div>
      </section>
    </ThemeCycle>
  );
}
