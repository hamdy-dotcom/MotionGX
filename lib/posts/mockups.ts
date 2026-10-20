/* eslint-disable */
// @ts-nocheck — ported verbatim from the approved Posts Studio prototype (HTML strings for each platform's real feed
// layout, on a phone or in a desktop browser). Everything interpolated is escaped (esc) or a trusted URL / number.
// Rendered by app/[locale]/(app)/posts/[id]/platform-preview.tsx.

export type MockBrand = { name: string; handle: string; logo: string | null; dark: boolean; tagline?: string | null; palette?: { primary?: string } | null };
export type MockPost = { text: string; tags: string[]; image: string | null };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const logoImg = (b, size) => (b.logo ? `<img src="${esc(b.logo)}" style="width:${size};height:${size};object-fit:contain" alt="">` : `<span style="font:700 15px var(--ui);color:${b.dark ? "#fff" : "#1d1f4a"}">${esc((b.name || "?").trim().charAt(0).toUpperCase())}</span>`);
// ── frames ─────────────────────────────────────────────────────────────────────────────────────────────
const HOST = { instagram: "instagram.com", facebook: "facebook.com", tiktok: "tiktok.com/foryou", linkedin: "linkedin.com/feed", x: "x.com/home" };
function phone(inner, dark) {
  const c = dark ? "#fff" : "#000";
  return `<div class="phone"><div class="screen-in" style="background:${dark ? "#000" : "#fff"}"><div class="island"></div>
    <div class="status" style="color:${c}"><span>9:41</span><span style="display:flex;gap:6px;align-items:center">${svg(`<path d="M2 17h3v3H2zM7 13h3v7H7zM12 9h3v11h-3zM17 5h3v15h-3z" fill="${c}"/>`, 17)}${svg(`<path d="M12 18.5a1.5 1.5 0 1 0 0 .01M5 11.5a10 10 0 0 1 14 0M8 14.5a6 6 0 0 1 8 0M2 8.5a14.5 14.5 0 0 1 20 0" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`, 17)}<span style="width:26px;height:12px;border-radius:4px;border:1.5px solid ${c};display:inline-block;position:relative"><span style="position:absolute;inset:1.5px;width:70%;background:${c};border-radius:2px"></span></span></span></div>
    <div class="app">${inner}</div><div class="home-ind" style="background:${dark ? "#fff" : "#111"}"></div></div></div>`;
}
function browser(inner, host) {
  return `<div class="browser"><div class="chrome"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span class="url">🔒 ${host}</span></div><div class="page">${inner}</div></div>`;
}
const svg = (d, s = 24, extra = "") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" ${extra}>${d}</svg>`;
const st = (d, s = 24, w = 1.9, c = "currentColor") => svg(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`, s);
const P = {
  heart: "M12 20.5S3.5 15.4 3.5 9.3A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.5 2.4c0 6.1-8.5 11.2-8.5 11.2z",
  comment: "M20.7 11.7a8.4 8.4 0 0 1-12.4 7.5L3.5 20.5l1.4-4.4a8.4 8.4 0 1 1 15.8-4.4z",
  send: "M21.5 3 9.8 14.3M21.5 3l-7 18.5-4.7-7.2L2.5 9.7z",
  save: "M18.5 21 12 15.8 5.5 21V4.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1z",
  repost: "M3.5 12V9a3 3 0 0 1 3-3h13l-3-3M20.5 12v3a3 3 0 0 1-3 3h-13l3 3",
  share: "M12 3v12M7.5 7.5 12 3l4.5 4.5M4.5 13v6.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V13",
  dots: "M5.5 12h.01M12 12h.01M18.5 12h.01",
  home: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z",
  search: "M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6zM16 16l4.5 4.5",
  plus: "M12 7v10M7 12h10M6 3.5h12a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z",
  reels: "M3.5 8h17M9 3.5l3 4.5M15 3.5l3 4.5M10.2 11.5v5l4.3-2.5zM6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  mail: "M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7",
  like: "M7 10.5v10H3.5v-10zM7 10.5l4-7.5c1.6 0 2.6 1.2 2.2 2.8l-.8 3.7H19a2 2 0 0 1 2 2.3l-1.3 7a2 2 0 0 1-2 1.7H7",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20.5a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6.5 6.5 0 0 1 3.5 6",
  bag: "M5 7.5h14l-1 13H6zM9 7.5V6a3 3 0 0 1 6 0v1.5",
  views: "M4 20.5V11M9.3 20.5V4M14.6 20.5v-7M20 20.5v-11",
  music: "M9 18.5V6l11-2.5V16M9 18.5a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 18.5zM20 16a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 20 16z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
};
const ICON = {
  instagram: (s) => svg(`<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/>`, s),
  facebook: (s) => svg(`<path d="M14 21v-7.5h2.6l.4-3H14V8.6c0-.9.3-1.5 1.6-1.5H17V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8.3v3h2.6V21z" fill="currentColor"/>`, s),
  tiktok: (s) => svg(`<path d="M16.5 3c.4 2.2 1.8 3.6 4 3.8v3c-1.5 0-2.8-.4-4-1.2v6.2a5.6 5.6 0 1 1-5.6-5.6h.6v3.1a2.6 2.6 0 1 0 2 2.5V3z" fill="currentColor"/>`, s),
  linkedin: (s) => svg(`<rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor"/><path d="M7.5 10v6.5M7.5 7.3v.1M11 16.5V10m0 3.2c0-1.8 1-3.2 2.7-3.2 1.6 0 2.4 1.1 2.4 3.1v3.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`, s),
  x: (s) => svg(`<path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z" fill="currentColor"/>`, s),
};
const av = (b, size, ring) => { const inner = `<span style="width:${size}px;height:${size}px;border-radius:50%;background:${b.dark ? "#15161c" : "#fff"};display:grid;place-items:center;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.08)">${logoImg(b, "72%")}</span>`; return ring ? `<span style="padding:2px;border-radius:50%;background:conic-gradient(#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75);display:inline-grid"><span style="padding:2px;border-radius:50%;background:#fff;display:inline-grid">${inner}</span></span>` : inner; };
function caption(text, tags, cut, moreLabel, tagColor, prefix = "", clamp = 0) {
  const all = `${text}${tags.length ? `\n\n${tags.map((t) => "#" + t).join(" ")}` : ""}`;
  const color = (s) => esc(s).replace(/(#[^\s#]+)/g, `<span style="color:${tagColor}">$1</span>`);
  const short = cut && all.length > cut ? all.slice(0, cut).replace(/\s+\S*$/, "") : null;
  if (clamp) return `<div data-capbox><div data-short class="${clamp === 2 ? "clamp2" : "clamp3"} ar" dir="auto" style="white-space:pre-wrap">${prefix}${color(all)}</div><button data-more style="border:0;background:none;padding:0;color:inherit;opacity:.6;font:inherit">${moreLabel}</button><div data-full hidden class="ar" dir="auto" style="white-space:pre-wrap">${prefix}${color(all)}</div></div>`;
  return `<div data-capbox><div data-short class="ar" dir="auto" style="white-space:pre-wrap">${prefix}${color(short ?? all)}${short ? `… <button data-more style="border:0;background:none;padding:0;color:#737373;font:inherit">${moreLabel}</button>` : ""}</div><div data-full hidden class="ar" dir="auto" style="white-space:pre-wrap">${prefix}${color(all)}</div></div>`;
}
const media = (img, ratio, extra = "") => (img ? `<div style="position:relative;width:100%;aspect-ratio:${ratio};background:#000;overflow:hidden;${extra}"><img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>` : "");

// ── the platforms ──────────────────────────────────────────────────────────────────────────────────────
function platform(p, device, post, b) { return ({ instagram: ig, facebook: fb, linkedin: li, tiktok: tt, x: xx })[p](device, post, b); }

function ig(device, post, b) {
  const head = `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px">${av(b, 32, true)}<div style="line-height:1.2"><div style="font-weight:600;font-size:14px">${b.handle}</div><div style="font-size:12px;color:#737373">Original audio</div></div><span style="margin-left:auto">${st(P.dots, 22, 2.6)}</span></div>`;
  const actions = `<div style="display:flex;align-items:center;gap:14px;padding:10px 14px 6px">${st(P.heart)}${st(P.comment)}${st(P.repost)}${st(P.send)}<span style="margin-left:auto">${st(P.save)}</span></div>`;
  const cap = `<div style="padding:0 14px;font-size:14px;line-height:1.45">${caption(post.text, post.tags, 125, "more", "#00376b", `<b style="font-family:var(--ui);margin-right:6px">${b.handle}</b>`)}</div>`;
  if (device === "mobile") return `<div class="pf">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 14px 8px">${st(P.plus, 26)}<span style="font-family:var(--grand),cursive;font-size:30px;line-height:1">Instagram</span>${st(P.heart, 26)}</div>
    <div style="flex:1;overflow:hidden">${head}${media(post.image, "4/5")}${actions}<div style="padding:0 14px 4px;font-size:14px;font-weight:600">Be the first to like this</div>${cap}<div style="padding:6px 14px;color:#737373;font-size:13px">View all comments</div><div style="padding:0 14px;color:#737373;font-size:12px">1 minute ago</div></div>
    <div style="display:flex;justify-content:space-around;align-items:center;padding:10px 0 26px;border-top:1px solid #efefef">${st(P.home, 26, 2.2)}${st(P.search, 26)}${st(P.plus, 26)}${st(P.reels, 26)}${av(b, 26)}</div></div>`;
  const nav = [["Home", P.home], ["Search", P.search], ["Explore", P.globe], ["Reels", P.reels], ["Messages", P.send], ["Notifications", P.heart], ["Create", P.plus]];
  return `<div class="pf" style="flex-direction:row;background:#fff">
    <aside style="width:244px;border-right:1px solid #dbdbdb;padding:26px 12px">
      <div style="font-family:var(--grand),cursive;font-size:30px;padding:0 12px 26px">Instagram</div>
      ${nav.map(([l, d], i) => `<div style="display:flex;align-items:center;gap:16px;padding:12px;font-size:16px;${i === 0 ? "font-weight:700" : ""}">${st(d, 26, i === 0 ? 2.4 : 1.9)}${l}</div>`).join("")}
      <div style="display:flex;align-items:center;gap:16px;padding:12px;font-size:16px">${av(b, 26)}Profile</div></aside>
    <main style="flex:1;display:flex;justify-content:center;gap:64px;padding:24px 0;overflow:hidden">
      <div style="width:470px">
        <div style="display:flex;gap:16px;padding:0 4px 18px;border-bottom:1px solid #efefef;margin-bottom:12px">${[0, 1, 2, 3, 4, 5].map((i) => `<div style="text-align:center;font-size:12px;color:#262626">${i === 0 ? av(b, 56, true) : `<span style="display:inline-block;width:66px;height:66px;border-radius:50%;background:#efefef"></span>`}<div style="margin-top:4px">${i === 0 ? b.handle : "&nbsp;"}</div></div>`).join("")}</div>
        <div style="border-bottom:1px solid #dbdbdb;padding-bottom:16px">${head.replace("padding:10px 12px", "padding:6px 0 12px")}<div style="border-radius:4px;overflow:hidden;border:1px solid #dbdbdb">${media(post.image, "4/5")}</div>${actions.replace("padding:10px 14px 6px", "padding:10px 0 6px")}<div style="font-size:14px;font-weight:600;padding-bottom:6px">Be the first to like this</div>${cap.replace("padding:0 14px", "padding:0")}<div style="color:#737373;font-size:14px;padding-top:8px">Add a comment…</div></div>
      </div>
      <div style="width:320px;padding-top:12px;font-size:14px">
        <div style="display:flex;align-items:center;gap:12px">${av(b, 44)}<div><b>${b.handle}</b><div style="color:#737373">${esc(b.name)}</div></div><span style="margin-left:auto;color:#0095f6;font-size:12px;font-weight:600">Switch</span></div>
        <div style="display:flex;justify-content:space-between;color:#737373;font-weight:600;margin:24px 0 12px"><span>Suggested for you</span><span style="color:#000;font-size:12px">See All</span></div>
        ${[0, 1, 2].map(() => `<div style="display:flex;align-items:center;gap:12px;padding:8px 0"><span style="width:44px;height:44px;border-radius:50%;background:#efefef"></span><div style="flex:1"><div style="height:10px;width:110px;background:#efefef;border-radius:5px"></div><div style="height:8px;width:70px;background:#f5f5f5;border-radius:4px;margin-top:6px"></div></div><span style="color:#0095f6;font-size:12px;font-weight:600">Follow</span></div>`).join("")}
      </div>
    </main></div>`;
}

function fb(device, post, b) {
  const card = (w) => `<div style="background:#fff;${w ? "border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,.2);" : ""}">
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px 8px">${av(b, 40)}<div style="line-height:1.25"><div style="font-weight:600;font-size:15px;color:#050505">${esc(b.name)}</div><div style="font-size:13px;color:#65676b;display:flex;align-items:center;gap:4px">Just now · ${st(P.globe, 12, 2)}</div></div><span style="margin-left:auto;color:#65676b">${st(P.dots, 22, 2.6)}</span></div>
    <div style="padding:0 16px 12px;font-size:15px;color:#050505;line-height:1.35">${caption(post.text, post.tags, 0, "See more", "#0064d1", "", 3)}</div>
    ${media(post.image, "4/5")}
    <div style="display:flex;justify-content:space-between;padding:10px 16px;font-size:14px;color:#65676b;border-bottom:1px solid #ced0d4;margin:0 0">${"<span>Be the first to react</span>"}<span>0 comments</span></div>
    <div style="display:flex;justify-content:space-around;padding:4px 8px;color:#65676b;font-weight:600;font-size:15px">${[["Like", P.like], ["Comment", P.comment], ["Share", P.share]].map(([l, d]) => `<span style="display:flex;align-items:center;gap:6px;padding:8px">${st(d, 20)}${l}</span>`).join("")}</div></div>`;
  if (device === "mobile") return `<div class="pf" style="background:#c9ccd1">
    <div style="background:#fff;display:flex;align-items:center;justify-content:space-between;padding:4px 14px 6px"><span style="font:700 30px/1 var(--ui);color:#0866ff;letter-spacing:-1px">facebook</span><span style="display:flex;gap:10px">${[P.plus, P.search, P.send].map((d) => `<span style="width:36px;height:36px;border-radius:50%;background:#e4e6eb;display:grid;place-items:center">${st(d, 20, 2.2)}</span>`).join("")}</span></div>
    <div style="background:#fff;display:flex;justify-content:space-around;padding:6px 0 8px;border-bottom:1px solid #ced0d4;color:#65676b">${[P.home, P.reels, P.people, P.bag, P.bell].map((d, i) => `<span style="color:${i === 0 ? "#0866ff" : "#65676b"}">${st(d, 26, 2)}</span>`).join("")}</div>
    <div style="flex:1;overflow:hidden;margin-top:8px">${card(false)}</div></div>`;
  return `<div class="pf" style="background:#f0f2f5">
    <div style="height:56px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.1);display:flex;align-items:center;padding:0 16px;gap:8px;flex:none"><span style="width:40px;height:40px;border-radius:50%;background:#0866ff;color:#fff;display:grid;place-items:center">${ICON.facebook(26)}</span><span style="background:#f0f2f5;border-radius:999px;padding:10px 14px;color:#65676b;width:240px;display:flex;gap:8px">${st(P.search, 16)}Search Facebook</span>
      <span style="flex:1;display:flex;justify-content:center;gap:70px;color:#65676b">${[P.home, P.reels, P.bag, P.people].map((d, i) => `<span style="color:${i === 0 ? "#0866ff" : "#65676b"};${i === 0 ? "border-bottom:3px solid #0866ff;padding-bottom:12px;margin-top:15px" : ""}">${st(d, 28, 2)}</span>`).join("")}</span>
      <span style="display:flex;gap:8px">${[P.dots, P.send, P.bell].map((d) => `<span style="width:40px;height:40px;border-radius:50%;background:#e4e6eb;display:grid;place-items:center">${st(d, 20, 2.2)}</span>`).join("")}${av(b, 40)}</span></div>
    <div style="flex:1;display:flex;gap:32px;padding:16px;overflow:hidden">
      <aside style="width:300px;font-size:15px;color:#050505">${[["Friends", P.people], ["Marketplace", P.bag], ["Reels", P.reels], ["Memories", P.globe]].map(([l, d]) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 8px"><span style="color:#0866ff">${st(d, 26, 2)}</span>${l}</div>`).join("")}</aside>
      <main style="width:500px;margin:0 auto">${card(true)}</main>
      <aside style="width:300px;color:#65676b;font-size:15px;font-weight:600">Sponsored<div style="height:110px;background:#e4e6eb;border-radius:8px;margin:10px 0 20px"></div>Contacts${[0, 1, 2, 3].map(() => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0"><span style="width:36px;height:36px;border-radius:50%;background:#dfe1e5"></span><span style="height:10px;width:120px;border-radius:5px;background:#dfe1e5"></span></div>`).join("")}</aside>
    </div></div>`;
}

function li(device, post, b) {
  const card = (w) => `<div style="background:#fff;${w ? "border-radius:8px;box-shadow:0 0 0 1px rgba(140,140,140,.2);" : ""}">
    <div style="display:flex;align-items:flex-start;gap:8px;padding:12px 16px 4px"><span style="width:48px;height:48px;border-radius:4px;overflow:hidden;background:${b.dark ? "#15161c" : "#fff"};display:grid;place-items:center;box-shadow:0 0 0 1px rgba(0,0,0,.08)">${logoImg(b, "76%")}</span><div style="line-height:1.3;flex:1"><div style="font-weight:600;font-size:14px;color:rgba(0,0,0,.9)">${esc(b.name)}</div><div style="font-size:12px;color:rgba(0,0,0,.6)">1,240 followers</div><div style="font-size:12px;color:rgba(0,0,0,.6);display:flex;align-items:center;gap:4px">Now · ${st(P.globe, 12, 2)}</div></div><span style="color:#0a66c2;font-weight:600;font-size:14px">+ Follow</span></div>
    <div style="padding:6px 16px 10px;font-size:14px;color:rgba(0,0,0,.9);line-height:1.45">${caption(post.text, post.tags, 0, "…see more", "#0a66c2", "", 3)}</div>
    ${media(post.image, "4/5")}
    <div style="padding:8px 16px;font-size:12px;color:rgba(0,0,0,.6);border-bottom:1px solid #e8e8e8">Be the first to react</div>
    <div style="display:flex;justify-content:space-around;padding:4px 8px;color:rgba(0,0,0,.6);font-weight:600;font-size:14px">${[["Like", P.like], ["Comment", P.comment], ["Repost", P.repost], ["Send", P.send]].map(([l, d]) => `<span style="display:flex;${w ? "flex-direction:row;gap:6px" : "flex-direction:column;gap:2px;font-size:12px"};align-items:center;padding:10px 6px">${st(d, 20)}${l}</span>`).join("")}</div></div>`;
  if (device === "mobile") return `<div class="pf" style="background:#f4f2ee">
    <div style="background:#fff;display:flex;align-items:center;gap:10px;padding:6px 14px 10px">${av(b, 32)}<span style="flex:1;background:#edf3f8;border-radius:4px;padding:8px 10px;color:rgba(0,0,0,.6);font-size:14px;display:flex;gap:6px">${st(P.search, 16)}Search</span>${st(P.comment, 24)}</div>
    <div style="flex:1;overflow:hidden;margin-top:8px">${card(false)}</div>
    <div style="background:#fff;display:flex;justify-content:space-around;padding:8px 0 26px;font-size:11px;color:rgba(0,0,0,.6);border-top:1px solid #e8e8e8">${[["Home", P.home], ["My Network", P.people], ["Post", P.plus], ["Notifications", P.bell], ["Jobs", P.bag]].map(([l, d], i) => `<span style="display:flex;flex-direction:column;align-items:center;gap:2px;color:${i === 0 ? "#000" : "rgba(0,0,0,.6)"}">${st(d, 24)}${l}</span>`).join("")}</div></div>`;
  return `<div class="pf" style="background:#f4f2ee">
    <div style="height:52px;background:#fff;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;justify-content:center;gap:8px;flex:none"><span style="color:#0a66c2">${ICON.linkedin(36)}</span><span style="background:#edf3f8;border-radius:4px;padding:8px 10px;color:rgba(0,0,0,.6);width:280px;display:flex;gap:6px">${st(P.search, 16)}Search</span><span style="width:240px"></span>${[["Home", P.home], ["My Network", P.people], ["Jobs", P.bag], ["Messaging", P.comment], ["Notifications", P.bell]].map(([l, d], i) => `<span style="display:flex;flex-direction:column;align-items:center;font-size:12px;width:80px;color:${i === 0 ? "#000" : "rgba(0,0,0,.6)"}">${st(d, 24)}${l}</span>`).join("")}</div>
    <div style="flex:1;display:flex;justify-content:center;gap:24px;padding:24px;overflow:hidden">
      <aside style="width:225px"><div style="background:#fff;border-radius:8px;box-shadow:0 0 0 1px rgba(140,140,140,.2);overflow:hidden"><div style="height:56px;background:${b.palette?.primary ?? "#a0b4b7"}"></div><div style="padding:0 12px 14px;margin-top:-28px">${av(b, 56)}<div style="font-weight:600;margin-top:8px">${esc(b.name)}</div><div style="font-size:12px;color:rgba(0,0,0,.6)">${esc(b.tagline ?? "")}</div></div></div></aside>
      <main style="width:555px">${card(true)}</main>
      <aside style="width:300px"><div style="background:#fff;border-radius:8px;box-shadow:0 0 0 1px rgba(140,140,140,.2);padding:12px;font-size:14px"><b>LinkedIn News</b>${[0, 1, 2, 3].map(() => `<div style="padding:10px 0"><div style="height:10px;width:200px;border-radius:5px;background:#eef0f2"></div><div style="height:8px;width:110px;border-radius:4px;background:#f3f4f6;margin-top:6px"></div></div>`).join("")}</div></aside>
    </div></div>`;
}

function tt(device, post, b) {
  const rail = (s) => `<div style="display:flex;flex-direction:column;align-items:center;gap:${s * 0.6}px;color:#fff;font-size:12px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.3)">
    <div style="position:relative">${av(b, s * 1.25)}<span style="position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;background:#fe2c55;display:grid;place-items:center;font-size:16px;line-height:1">+</span></div>
    ${[["0", P.heart], ["0", P.comment], ["0", P.save], ["Share", P.share]].map(([n, d]) => `<span style="display:flex;flex-direction:column;align-items:center;gap:2px">${svg(`<path d="${d}" fill="#fff" stroke="#fff" stroke-width="1"/>`, s)}${n}</span>`).join("")}
    <span style="width:${s}px;height:${s}px;border-radius:50%;background:#222;border:6px solid #444"></span></div>`;
  const cap = `<div style="color:#fff;font-size:14px;line-height:1.4;text-shadow:0 1px 2px rgba(0,0,0,.4)"><div style="font-weight:700;font-size:16px;margin-bottom:4px">${b.handle}</div>${caption(post.text, post.tags, 0, "more", "#fff", "", 2)}<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:13px">${st(P.music, 14, 2, "#fff")}original sound - ${b.handle}</div></div>`;
  if (device === "mobile") return `<div class="pf" style="background:#000;position:relative">
    <div style="position:absolute;inset:0">${media(post.image, "auto", "height:100%")}</div>
    <div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:center;gap:18px;padding:6px 0;color:rgba(255,255,255,.7);font-weight:600;font-size:16px;text-shadow:0 1px 2px rgba(0,0,0,.4)"><span>Following</span><span style="color:#fff;border-bottom:2px solid #fff;padding-bottom:4px">For You</span><span style="position:absolute;right:14px">${st(P.search, 24, 2.2, "#fff")}</span></div>
    <div style="position:absolute;right:10px;bottom:150px">${rail(34)}</div>
    <div style="position:absolute;left:0;right:70px;bottom:80px;padding:0 12px">${cap}</div>
    <div style="position:absolute;left:0;right:0;bottom:0;background:#000;display:flex;justify-content:space-around;align-items:center;padding:8px 0 24px;color:#fff;font-size:10px">${[["Home", P.home], ["Friends", P.people]].map(([l, d]) => `<span style="display:flex;flex-direction:column;align-items:center">${st(d, 24, 2, "#fff")}${l}</span>`).join("")}<span style="width:44px;height:30px;border-radius:8px;background:#fff;color:#000;display:grid;place-items:center;font-size:22px;box-shadow:-3px 0 0 #25f4ee,3px 0 0 #fe2c55">+</span>${[["Inbox", P.mail], ["Profile", P.people]].map(([l, d]) => `<span style="display:flex;flex-direction:column;align-items:center">${st(d, 24, 2, "#fff")}${l}</span>`).join("")}</div></div>`;
  return `<div class="pf" style="background:#121212;color:#fff;flex-direction:row">
    <aside style="width:240px;padding:18px 16px;font-size:17px;font-weight:600">${["For You", "Explore", "Following", "Friends", "LIVE", "Messages", "Profile"].map((l, i) => `<div style="padding:12px 8px;color:${i === 0 ? "#fe2c55" : "#fff"}">${l}</div>`).join("")}</aside>
    <main style="flex:1;display:flex;justify-content:center;align-items:center;gap:20px;padding:20px">
      <div style="height:700px;aspect-ratio:9/16;border-radius:14px;overflow:hidden;position:relative">${media(post.image, "auto", "height:100%")}<div style="position:absolute;left:0;right:0;bottom:0;padding:60px 16px 18px;background:linear-gradient(transparent,rgba(0,0,0,.7))">${cap}</div></div>
      <div>${rail(42)}</div>
    </main></div>`;
}

function xx(device, post, b) {
  const tweet = `<div style="display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid #eff3f4">${av(b, 40)}<div style="flex:1;min-width:0">
    <div style="display:flex;gap:4px;align-items:center;font-size:15px"><b style="color:#0f1419">${esc(b.name)}</b><span style="color:#536471">@${b.handle} · 1m</span><span style="margin-left:auto;color:#536471">${st(P.dots, 18, 2.6)}</span></div>
    <div style="font-size:15px;line-height:1.35;color:#0f1419;margin-top:2px">${caption(post.text, post.tags, 0, "", "#1d9bf0")}</div>
    ${post.image ? `<div style="margin-top:12px;border-radius:16px;overflow:hidden;border:1px solid #cfd9de">${media(post.image, "16/9")}</div>` : ""}
    <div style="display:flex;justify-content:space-between;margin-top:12px;color:#536471;font-size:13px;max-width:425px">${[P.comment, P.repost, P.heart, P.views].map((d) => `<span style="display:flex;align-items:center;gap:4px">${st(d, 18, 1.8)}0</span>`).join("")}<span style="display:flex;gap:12px">${st(P.save, 18)}${st(P.share, 18)}</span></div></div></div>`;
  if (device === "mobile") return `<div class="pf" style="background:#fff;position:relative">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 16px 8px">${av(b, 32)}<span>${ICON.x(26)}</span><span style="width:32px"></span></div>
    <div style="display:flex;border-bottom:1px solid #eff3f4;font-size:15px;font-weight:600"><span style="flex:1;text-align:center;padding:12px 0;position:relative">For you<span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:56px;height:4px;border-radius:2px;background:#1d9bf0"></span></span><span style="flex:1;text-align:center;padding:12px 0;color:#536471">Following</span></div>
    <div style="flex:1;overflow:hidden">${tweet}</div>
    <span style="position:absolute;right:16px;bottom:96px;width:56px;height:56px;border-radius:50%;background:#1d9bf0;color:#fff;display:grid;place-items:center;font-size:30px;box-shadow:0 4px 12px rgba(0,0,0,.2)">+</span>
    <div style="display:flex;justify-content:space-around;padding:12px 0 26px;border-top:1px solid #eff3f4">${[P.home, P.search, P.people, P.bell, P.mail].map((d) => st(d, 26, 2)).join("")}</div></div>`;
  return `<div class="pf" style="background:#fff;flex-direction:row;justify-content:center">
    <aside style="width:275px;padding:8px 12px;font-size:20px">${`<div style="padding:12px">${ICON.x(30)}</div>`}${[["Home", P.home], ["Explore", P.search], ["Notifications", P.bell], ["Messages", P.mail], ["Communities", P.people], ["Profile", P.people]].map(([l, d], i) => `<div style="display:flex;align-items:center;gap:18px;padding:12px;${i === 0 ? "font-weight:700" : ""}">${st(d, 26, i === 0 ? 2.4 : 1.9)}${l}</div>`).join("")}<div style="margin-top:16px;background:#0f1419;color:#fff;border-radius:999px;text-align:center;padding:15px;font-weight:700;font-size:17px">Post</div></aside>
    <main style="width:600px;border-left:1px solid #eff3f4;border-right:1px solid #eff3f4">
      <div style="display:flex;border-bottom:1px solid #eff3f4;font-size:15px;font-weight:600"><span style="flex:1;text-align:center;padding:16px 0;position:relative">For you<span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:56px;height:4px;border-radius:2px;background:#1d9bf0"></span></span><span style="flex:1;text-align:center;padding:16px 0;color:#536471">Following</span></div>
      ${tweet}</main>
    <aside style="width:350px;padding:8px 24px"><div style="background:#eff3f4;border-radius:999px;padding:12px 18px;color:#536471;display:flex;gap:10px">${st(P.search, 18)}Search</div><div style="border:1px solid #eff3f4;border-radius:16px;margin-top:16px;padding:14px 16px"><b style="font-size:20px">What’s happening</b>${[0, 1, 2].map(() => `<div style="padding:12px 0"><div style="height:8px;width:90px;border-radius:4px;background:#eff3f4"></div><div style="height:12px;width:200px;border-radius:6px;background:#e7ecee;margin-top:8px"></div></div>`).join("")}</div></aside></div>`;
}


/** the post as a platform shows it: its feed layout inside a phone (mobile) or a desktop browser */
export function mockupHtml(p, device, post, brand) {
  const b = { ...brand, name: brand.name, handle: esc(brand.handle) };
  const inner = platform(p, device, { ...post, image: post.image ? esc(post.image) : "" }, b);
  return device === "mobile" ? phone(inner, p === "tiktok") : browser(inner, HOST[p]);
}
export const PLATFORM_ICON = (p, size = 16) => ICON[p](size);
