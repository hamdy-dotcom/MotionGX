import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { todayKey } from "@/lib/dates";
import { upcomingSeasons } from "@/lib/market/seasons";
import { CalendarDemo, CostCalc, Drift, EditDemo, FeedDemo, LookbookDemo, Phone, SiteDemo, SizesDemo, BrandStage, VoiceDemo } from "@/components/site/demos";
import { publicPrice } from "@/lib/billing";
import { LiveBrand, LivePost, LiveVideo } from "@/components/site/live-demos";
import { DEMO_TEXT, LIVE_TEXT } from "@/components/site/demo-text";
import { Reveal, StoryNav } from "./parts";

const C = {
  ar: {
    kicker: "فريق المحتوى والتصميم بتاع براندك", h1a: "فريق محتوى وتصميم كامل", h1b: "بـ1% من التكلفة.", lead: "مش لازم تعيّن كاتب ومصمم ومونتير لبراندك. استخدم فريقنا، وشوف بنفسك الجودة وثبات شكل البراند في كل قطعة.", start: "ابدأ دلوقتي", prices: "الأسعار",
    tape: ["فيديوهات", "بوستات", "ستوريز", "لوجوهات", "ملفات براند", "خطط محتوى", "كاروسيل", "أغلفة"],
    how: "وبيمشي كده، خطوة بخطوة.",
    nav: ["براندك", "اللوك بوك", "أول قطعة", "التعديل", "شهرك", "كويس تعرف", "الحساب", "أسئلة"],
    s1K: "الخطوة 1 · سهل", s1T: "ابدأ ببراندك.", s1D: "عندك موقع؟ حط اللينك. لسه بتبدأ؟ احكيلنا عن شغلك. مفيش برامج تتعلمها ولا فريق تنسق معاه.",
    s2K: "الخطوة 2", s2T: "راجع اللوك بوك بتاعك.", s2D: "لكل براند لوك بوك خاص بيه: الشعار والألوان والخطوط والصوت والجمهور والمزايا في مكان واحد. كل قطعة بتتعمل منه، وأي تعديل فيه كل اللي بعده بيتبعه.",
    s3K: "الخطوة 3 · مفيد", s3T: "اطلب أول قطعة بجملة.", s3D: "فيديو أو بوست أو كاروسيل أو ستوري أو غلاف. قول عايز إيه، وتابعها بتتعمل قدامك.",
    s4K: "الخطوة 4", s4T: "راجعها، وعدّلها بكلامك.", s4D: "كل قطعة بتتفحص قبل ما توصلك. شوف بنفسك الجودة وثبات شكل البراند، ولو عايز تغيير قوله.", frames: "وفي الفيديو، كل إطار في كل مشهد",
    s5K: "الخطوة 5 · ذكي", s5T: "خطط شهرك كله مرة واحدة.", s5D: "اختار مجالك والدول اللي شغال فيها. بيعرف مواسم بلدك وترند مجالك، ويوزع الأفكار على جدولك.",
    resultK: "النتيجة · فعّال",
    knowK: "كويس تعرف", knowT: "وكمان، عشان تبقى عارف.", know: [["من غير اشتراك", "بتدفع على اللي بتعمله بس، وتوقف في أي وقت."], ["اللي يفشل مش عليك", "أي حاجة تفشل من عندنا مش بتتحسب عليك."], ["التحميل ببلاش", "كل شغلك تنزله وتصدّره من غير مصاريف زيادة."], ["بلهجة عميلك", "مصري وسعودي وخليجي وشامي وفصحى وإنجليزي."], ["22 دولة عربية", "المواسم والتنبيهات ماشية على بلدك ومجالك."], ["شاشاتك الحقيقية", "فيديوهاتك بتظهر فيها واجهة منتجك الحقيقية."]],
    faqK: "أسئلة", faqT: "أسئلة بتتسأل كتير.", faq: [
      ["MotionGX بيعمل إيه بالظبط؟", "بيعمل اللي فريق المحتوى والتصميم بيعمله لبراندك: نصوص وبوستات وكاروسيل وستوريز وأغلفة وفيديوهات وخطة شهرية، كلها بهوية براندك."],
      ["لازم يكون عندي موقع أو براند جاهز؟", "لأ. لو عندك موقع بنقرا هويتك منه. ولو لسه بتبدأ، بتحكيلنا عن شغلك ونعمل البراند معاك."],
      ["بتبنوا مواقع؟", "لأ. مع البراند الجديد بتاخد موك أب لموقعك بكوده وملفات البراند كاملة، تبدأ منها لو مطور، أو تستخدمها كمرجع مع أدوات زي Codex وClaude Code."],
      ["إيه هو اللوك بوك؟", "المكان اللي فيه هوية براندك: الشعار والألوان والخطوط والصوت والجمهور والمزايا. كل قطعة بتتعمل منه، وتقدر تعدله في أي وقت."],
      ["الـ 1% دي جاية منين؟", "من مقارنة 12 بوست و4 فيديوهات في الشهر بفريق من كاتب ومصمم ومونتير تكلفته حوالي 60,000 ج.م. ده مثال، وتقدر تحط أرقامك في الحاسبة فوق."],
      ["فيه اشتراك؟", "لأ. بتشحن رصيد وبتدفع على اللي بتعمله بس، والرصيد مش بينتهي طول ما حسابك مفتوح."],
      ["بدفع إمتى وكام؟", "بتشوف السعر المتوقع قبل ما تبدأ. لما القطعة تتعمل بيتخصم سعرها النهائي من رصيدك، وممكن يختلف عن المتوقع حسب اللي احتاجته. واللي يفشل من عندنا مش بتدفعه."],
      ["لو النتيجة ماعجبتنيش؟", "اطلب تعديل بكلامك، وكل طلب بتشوف سعره قبل ما توافق. لو القطعة فيها عيب، راسلنا وهنصلحها أو نرد قيمتها."],
      ["لازم أراجع الشغل قبل ما أنشره؟", "أيوه. كل قطعة بتتفحص، بس الذكاء الاصطناعي ممكن يغلط، فالقرار الأخير ليك."],
      ["الشغل بياخد وقت قد إيه؟", "البوست حوالي دقيقة، والفيديو والبراند الكامل في دقايق. وبتتابع كل خطوة وهي بتتعمل."],
      ["الشغل اللي بيطلع ملك مين؟", "ملكك وتقدر تستخدمه تجاريًا. ولأن الأسماء واللوجوهات اقتراحات، راجع العلامة التجارية في سوقك قبل ما تعتمد عليها."],
      ["بتدربوا الذكاء الاصطناعي بتاعكم على شغلي؟", "لأ. مش بنستخدم محتواك في تدريب نماذج خاصة بينا. والتفاصيل في سياسة الخصوصية."],
    ],
    teamK: "إحنا بنعمل إيه", teamT: "كل اللي فريق المحتوى والتصميم بيعمله لبراندك.", teamD: "بدل ما تعيّن فريق وتتابعه كل يوم، بتطلب اللي محتاجه وبيتعمل بهوية براندك.", team: [["كاتب محتوى", "نص لكل منصة، بلهجة عميلك وصوت براندك."], ["مصمم جرافيك", "بوستات وكاروسيل وستوريز وأغلفة، بمقاس كل منصة."], ["مونتير وموشن", "فيديوهات لحد 60 ثانية، بصوت وموسيقى وحركة."], ["مخطط محتوى", "خطة شهر كامل على مواسم بلدك ومجالك."], ["مراجع جودة", "كل قطعة بتتفحص قبل ما توصلك: الإملاء والشعار وكل إطار."]],
    docsK: "ملفات البراند", docsT: "لو لسه بتبدأ، براندك بييجي بملفاته كاملة.", docsD: "مش بنبني موقعك. بنديك موك أب للموقع وكل ملفات البراند اللي تبني عليها.", docs: [["لو مطور", "ابدأ منها على طول: الألوان والخطوط جاهزة كـ tokens وCSS وTailwind، ومعاها موك أب الموقع بكوده."], ["لو بتبني موقعك بالذكاء الاصطناعي", "حط الملفات في مشروعك كمرجع لأدوات زي Codex وClaude Code، فاللي تبنيه يطلع ماشي على البراند."]],
                effectK: "فعّال", effectT: "براندك يفضل ظاهر كل أسبوع، وبنفس الشكل.", effectD: "الناس بتفتكر البراند اللي بتشوفه كتير وشكله ثابت. جدولك مليان، كل قطعة بألوانك وصوتك، وكل موسم في ميعاده.", effects: ["هوية واحدة في كل قطعة", "محتوى في مواعيد مواسم سوقك", "لهجة عميلك، مش ترجمة", "شاشاتك الحقيقية في الفيديوهات"],
    costK: "الحساب · موفّر", costT: "1% من تكلفة الفريق. احسبها بنفسك.", costD: "الفريق مرتبات كل شهر، حتى لو مفيش شغل. هنا بتدفع على كل قطعة بس، من غير اشتراك ولا عقد.",
    calc: { posts: "بوستات في الشهر", videos: "فيديوهات في الشهر", today: "تكلفة فريقك في الشهر", todayHint: "مرتبات أو وكالة", month: "تكلفتك المتوقعة في الشهر", save: "ممكن توفر حوالي", noCommit: "بتدفع على اللي بتعمله بس، وتوقف في أي وقت.", fine: "مثال لكاتب ومصمم ومونتير؛ غيّره لرقمك. تقدير من أسعارنا المعتادة، والسعر النهائي لكل قطعة حسب اللي احتاجته.", share: "يعني حوالي" }, money: "ج.م",
    doorA: "عندك موقع؟", doorAd: "حط اللينك. بنقرا لوجوك وألوانك وخطوطك وصوتك، وكل قطعة بعد كده بتطلع بهوية براندك.", doorB: "لسه بتبدأ؟", doorBd: "احكي عن شغلك، واختار اتجاه، وخد براند كامل: لوجو ودليل براند وصور وموك أب لموقعك وملفات تبني عليها.", doorC: "ابدأ من هنا",
    sizesT: "كل المقاسات", sizesD: "فيد وستوري وغلاف، من فكرة واحدة.", calT: "شهر كامل", calD: "أفكار موزعة على الجدول، تتعمل بضغطة.", calL: ["بوست", "فيديو", "ستوري"], editT: "عدّل بكلامك", editD: "قول عايز إيه، والقطعة بتتغير.", voiceT: "بيتكلم زي عميلك", voiceD: "صوت بلهجة سوقك، مش فصحى مترجمة.", voices: ["مصري", "سعودي", "إنجليزي"],
    marketT: "مواسم سوقك، قبل ما تفوتك.", marketD: "اختار مجالك والدول اللي شغال فيها. بنفكرك بكل موسم وترند، ونكتبلك فكرة تناسب براندك.", now: "دلوقتي", inDays: "بعد {n} يوم",
    endT: "أول قطعة ليك مستنية.", endD: "من غير اشتراك. بتدفع على اللي بتعمله بس.", 
  },
  en: {
    kicker: "The content and design team for your brand", h1a: "A full content and design team", h1b: "for 1% of the cost.", lead: "You don't have to hire a writer, a designer and a video editor for your brand. Use ours, and check the quality and brand consistency for yourself.", start: "Get started", prices: "Pricing",
    tape: ["Videos", "Posts", "Stories", "Logos", "Brand docs", "Content plans", "Carousels", "Covers"],
    how: "Here's how it goes, step by step.",
    nav: ["Your brand", "Lookbook", "First piece", "Changes", "Your month", "Good to know", "The cost", "Questions"],
    s1K: "Step 1 · Easy", s1T: "Start with your brand.", s1D: "Have a website? Paste the link. Just starting? Tell us about your business. No software to learn and no team to coordinate.",
    s2K: "Step 2", s2T: "Review your lookbook.", s2D: "Every brand gets its own lookbook: logo, colours, fonts, voice, audience and features in one place. Every piece is made from it, and when you change it, everything after follows.",
    s3K: "Step 3 · Useful", s3T: "Ask for your first piece in a sentence.", s3D: "A video, post, carousel, story or cover. Say what you want, and watch it get made in front of you.",
    s4K: "Step 4", s4T: "Review it, and change it in words.", s4D: "Every piece is checked before it reaches you. See the quality and brand consistency for yourself, and if you want a change, just say so.", frames: "And in videos, every frame of every scene",
    s5K: "Step 5 · Smart", s5T: "Plan your whole month at once.", s5D: "Choose your industry and the countries you work in. It knows your country's seasons and your field's trends, and spreads the ideas across your calendar.",
    resultK: "The result · Effective",
    knowK: "Good to know", knowT: "And a few more things.", know: [["No subscription", "Pay only for what you make, and stop any time."], ["Failures aren't on you", "Anything that fails on our side isn't charged."], ["Free downloads", "Download and export all your work at no extra cost."], ["In your customer's dialect", "Egyptian, Saudi, Gulf, Levantine, formal Arabic and English."], ["22 Arab countries", "Seasons and reminders follow your country and field."], ["Your real screens", "Your videos show your product's real interface."]],
    faqK: "Questions", faqT: "Questions people often ask.", faq: [
      ["What does MotionGX do, exactly?", "What a content and design team does for your brand: copy, posts, carousels, stories, covers, videos and a monthly plan, all in your brand."],
      ["Do I need a website or a brand already?", "No. If you have a website, we read your identity from it. If you're just starting, tell us about your business and we create the brand with you."],
      ["Do you build websites?", "No. A new brand comes with a website mockup and its code, plus the full brand docs. Start from them if you're a developer, or use them as a reference with tools like Codex and Claude Code."],
      ["What is the lookbook?", "Where your brand's identity lives: logo, colours, fonts, voice, audience and features. Every piece is made from it, and you can change it any time."],
      ["Where does the 1% come from?", "From comparing 12 posts and 4 videos a month with a writer, a designer and an editor costing about EGP 60,000. That's an example, and you can put your own numbers in the calculator above."],
      ["Is there a subscription?", "No. You top up a balance and pay only for what you make, and it doesn't expire while your account is open."],
      ["When do I pay, and how much?", "You see the expected price before you start. When the piece is made, its final price comes out of your balance, and it can differ from the estimate depending on what it took. Anything that fails on our side isn't charged."],
      ["What if I don't like the result?", "Ask for a change in words, and each request shows its price before you agree. If a piece is defective, write to us and we'll fix it or return its charge."],
      ["Do I need to review before publishing?", "Yes. Every piece is checked, but AI can make mistakes, so the final decision is yours."],
      ["How long does it take?", "A post takes about a minute, and a video or a full brand takes minutes. You can follow each step as it happens."],
      ["Who owns what gets made?", "You do, and you can use it commercially. Names and logos are proposals, so check trademarks in your market before relying on them."],
      ["Do you train your AI on my work?", "No. We don't use your content to train our own models. The details are in our Privacy Policy."],
    ],
    teamK: "What we do", teamT: "Everything a content and design team does for your brand.", teamD: "Instead of hiring a team and managing it every day, you ask for what you need and it gets made in your brand.", team: [["Content writer", "Copy for each platform, in your customer's dialect and your brand's voice."], ["Graphic designer", "Posts, carousels, stories and covers, in each platform's size."], ["Video and motion editor", "Videos up to 60 seconds, with voice, music and motion."], ["Content planner", "A whole month's plan, on your country's and field's seasons."], ["Quality reviewer", "Every piece is checked before it reaches you: spelling, the logo and every frame."]],
    docsK: "Brand docs", docsT: "Just starting? Your brand comes with all its docs.", docsD: "We don't build your website. We give you a website mockup and every brand file to build on.", docs: [["If you're a developer", "Start from it right away: colours and fonts ready as tokens, CSS and Tailwind, plus the website mockup with its code."], ["If you're building your website with AI", "Put the files in your project as a reference for tools like Codex and Claude Code, so what you build stays on brand."]],
                effectK: "Effective", effectT: "Your brand shows up every week, looking like itself.", effectD: "People remember brands they see often and that stay consistent. Your calendar stays full, every piece is in your colours and voice, and every season lands on time.", effects: ["One identity across every piece", "Content on your market's dates", "Your customer's dialect, not a translation", "Your real screens in your videos"],
    costK: "The cost · Cost-efficient", costT: "1% of a team's cost. Work it out yourself.", costD: "A team is salaries every month, with or without work. Here you pay per piece only, with no subscription and no contract.",
    calc: { posts: "Posts a month", videos: "Videos a month", today: "Your team's monthly cost", todayHint: "Salaries or an agency", month: "Your expected monthly cost", save: "You could save about", noCommit: "Pay only for what you make, and stop any time.", fine: "An example for a writer, a designer and an editor; change it to your number. An estimate from our typical prices, and each piece's final price depends on what it took.", share: "That is about" }, money: "EGP",
    doorA: "Have a website?", doorAd: "Paste the link. We read your logo, colours, fonts and voice, and everything after that comes out in your brand.", doorB: "Just starting?", doorBd: "Tell us about your business, choose a direction, and get a whole brand: logo, brand guide, photos, a website mockup and docs to build on.", doorC: "Start here",
    sizesT: "Every size", sizesD: "Feed, story and cover, from one idea.", calT: "A whole month", calD: "Ideas across your calendar, a click from being made.", calL: ["Post", "Video", "Story"], editT: "Change it in words", editD: "Say what you want, and the piece changes.", voiceT: "Sounds like your customer", voiceD: "A voice in your market's dialect, not translated formal Arabic.", voices: ["Egyptian", "Saudi", "English"],
    marketT: "Your market's seasons, before you miss them.", marketD: "Choose your industry and the countries you work in. We remind you of every season and trend, and draft an idea that fits your brand.", now: "now", inDays: "in {n} days",
    endT: "Your first piece is waiting.", endD: "No subscription. Pay only for what you make.",
  },
};

const STORY = ["s1", "s2", "s3", "s4", "s5", "know", "cost", "faq"];

/** the public homepage: what signed-out visitors get at the root */
export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale === "ar" ? "ar" : "en", c = C[L], d = DEMO_TEXT[L], live = LIVE_TEXT[L];
  const seasons = upcomingSeasons({ today: todayKey(), countries: ["EG"], industry: "other", within: 150 }).filter((s) => s.kind !== "payday").slice(0, 5);
  const tc = await getTranslations("posts.studio.checks");
  const checks = (["words", "logo", "ui", "real"] as const).map((k) => tc(k));
  const tape = [...c.tape, ...c.tape, ...c.tape];
  const [post, carousel, brandPrice] = await Promise.all([publicPrice({ kind: "post", type: "single" }), publicPrice({ kind: "post", type: "carousel", slides: 5 }), publicPrice({ kind: "brand" })]);
  return (
    <BrandStage className="s-lp">
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
            <div className="p side"><Phone label={live.video.title}><LiveVideo t={live} /></Phone></div>
            <div className="p mid"><Phone label={live.name}><LiveBrand t={live} price={brandPrice} /></Phone></div>
            <div className="p side"><Phone label={live.post.title}><LivePost t={live} price={post} /></Phone></div>
          </div>
        </Drift>
      </section>

      <div className="s-lp-tape" aria-hidden="true"><div>{tape.map((w, i) => <span key={i}>{w}<i /></span>)}</div></div>

      <div className="s-lp-light">
        <StoryNav label={c.how} items={c.nav.map((label, i) => ({ id: STORY[i], label }))} />

        <Reveal className="s-lp-sec"><p className="s-lp-pk">{c.teamK}</p><h2 className="s-lp-t">{c.teamT}</h2><p className="s-lp-d">{c.teamD}</p>
          <div className="s-lp-team">{c.team.map(([role, does]) => <article key={role}><b>{role}</b><p>{does}</p></article>)}</div>
        </Reveal>

        <h2 className="s-lp-how">{c.how}</h2>

        <Reveal className="s-lp-sec step"><span id="s1" className="anchor" /><p className="s-lp-pk">{c.s1K}</p><h2 className="s-lp-t">{c.s1T}</h2><p className="s-lp-d">{c.s1D}</p>
          <div className="s-lp-doors">
            <Link href="/signup" className="door"><h3>{c.doorA}</h3><p>{c.doorAd}</p><SiteDemo t={d.site} /><span>{c.doorC}</span></Link>
            <div className="door d1"><h3>{c.doorB}</h3><p>{c.doorBd}</p><div className="door-phone"><Phone label={live.name}><LiveBrand t={live} price={brandPrice} /></Phone></div><span>{c.doorC}</span><Link href="/signup" className="door-cover" aria-label={c.doorC} /></div>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec step"><span id="s2" className="anchor" /><p className="s-lp-pk">{c.s2K}</p><h2 className="s-lp-t">{c.s2T}</h2><p className="s-lp-d">{c.s2D}</p>
          <LookbookDemo t={d.look} />
        </Reveal>

        <Reveal className="s-lp-sec step"><span id="s3" className="anchor" /><p className="s-lp-pk">{c.s3K}</p><h2 className="s-lp-t">{c.s3T}</h2><p className="s-lp-d">{c.s3D}</p>
          <div className="s-lp-bento">
            <article className="b3"><SizesDemo /><h3>{c.sizesT}</h3><p>{c.sizesD}</p></article>
            <article className="b3"><VoiceDemo dialects={c.voices} /><h3>{c.voiceT}</h3><p>{c.voiceD}</p></article>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec step"><span id="s4" className="anchor" /><p className="s-lp-pk">{c.s4K}</p><h2 className="s-lp-t">{c.s4T}</h2><p className="s-lp-d">{c.s4D}</p>
          <div className="s-lp-bento">
            <article className="b5"><EditDemo t={d.edit} /><div><h3>{c.editT}</h3><p>{c.editD}</p><ul className="s-lp-checks">{[...checks, c.frames].map((x) => <li key={x}>{x}</li>)}</ul></div></article>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec step"><span id="s5" className="anchor" /><p className="s-lp-pk">{c.s5K}</p><h2 className="s-lp-t">{c.s5T}</h2><p className="s-lp-d">{c.s5D}</p>
          <div className="s-lp-bento">
            <article className="b3"><CalendarDemo labels={c.calL} /><h3>{c.calT}</h3><p>{c.calD}</p></article>
            <article className="b3"><ul className="s-lp-cal">{seasons.map((x) => <li key={x.id}><b dir="auto">{x.name[L]}</b><span>{x.ongoing ? c.now : c.inDays.replace("{n}", String(x.daysAway))}</span></li>)}</ul><h3>{c.marketT}</h3><p>{c.marketD}</p></article>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec s-lp-effect"><div><p className="s-lp-pk">{c.resultK}</p><h2 className="s-lp-t">{c.effectT}</h2><p className="s-lp-d">{c.effectD}</p><ul>{c.effects.map((x) => <li key={x}>{x}</li>)}</ul></div><FeedDemo /></Reveal>

        <Reveal className="s-lp-sec"><span id="know" className="anchor" /><p className="s-lp-pk">{c.knowK}</p><h2 className="s-lp-t">{c.knowT}</h2>
          <div className="s-lp-know">{c.know.map(([k, v]) => <article key={k}><b>{k}</b><p>{v}</p></article>)}</div>
          <div className="s-lp-docs-h"><p className="s-lp-pk">{c.docsK}</p><h3>{c.docsT}</h3><p className="s-lp-d">{c.docsD}</p></div>
          <div className="s-lp-docs">
            {c.docs.map(([k, v]) => <article key={k}><b>{k}</b><p>{v}</p></article>)}
            <ul dir="ltr">{["BRAND.md", "DESIGN.md", "CLAUDE.md", "AGENTS.md", "tokens.json", "theme.css", "tailwind.config.js", "guidelines.pdf", "logo/", "website/index.html"].map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        </Reveal>

        <Reveal className="s-lp-sec"><span id="cost" className="anchor" /><p className="s-lp-pk">{c.costK}</p><h2 className="s-lp-t">{c.costT}</h2><p className="s-lp-d">{c.costD}</p>
          <CostCalc t={c.calc} post={post} carousel={carousel} video={[50, 200]} money={c.money} team={60000} />
        </Reveal>

        <Reveal className="s-lp-sec"><span id="faq" className="anchor" /><p className="s-lp-pk">{c.faqK}</p><h2 className="s-lp-t">{c.faqT}</h2>
          <div className="s-lp-faq">{c.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </Reveal>
      </div>

      <section className="s-lp-final">
        <i className="glow" aria-hidden="true" />
        <h2>{c.endT}</h2><p>{c.endD}</p>
        <div className="cta"><Link href="/signup" className="s-btn lit">{c.start}</Link><Link href="/pricing" className="s-btn ghost">{c.prices}</Link></div>
      </section>
    </BrandStage>
  );
}
