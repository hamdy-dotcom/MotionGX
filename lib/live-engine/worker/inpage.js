// In-page functions, run inside the browser (page.evaluate). Extracted byte-for-byte from video-sandbox:
//   PROBE, MARK, REGIONS, OBJECTS, NAV, BUSY, HUMAN, REFUSED, NAVBTNS, CONSENT, SETTLE ← steps/capture.mjs · SNAPSHOT ← lib/snapshot.mjs · QA_PROBE, QA_CAMS ← steps/qa.mjs (its PROBE, CAMS).
// Kept as plain JS text (installed with addInitScript, called by name) because the TypeScript runner
// injects __name() helpers into transpiled functions, which don't exist inside the page.
/* eslint-disable */
window.__mgx = {
  PROBE: () => {
  const area = (el) => { const r = el.getBoundingClientRect(); return Math.max(0, r.width) * Math.max(0, r.height); };
  const bg = {}, ink = {}, btn = {}, fonts = {};
  const add = (o, k, w) => { if (!k || k === "rgba(0, 0, 0, 0)" || k === "transparent") return; o[k] = (o[k] || 0) + w; };
  const els = [...document.querySelectorAll("body *")].slice(0, 4000);
  for (const el of els) {
    const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") continue;
    const a = area(el); if (!a) continue;
    add(bg, cs.backgroundColor, a);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) { add(ink, cs.color, Math.min(a, 40000)); fonts[cs.fontFamily] = (fonts[cs.fontFamily] || 0) + 1; }
    if (el.matches("button, a[class*=btn], a[class*=button], [role=button], input[type=submit]")) add(btn, cs.backgroundColor, a);
    if (cs.backgroundImage.includes("gradient")) add(bg, "GRADIENT " + cs.backgroundImage.slice(0, 200), a);
  }
  add(bg, getComputedStyle(document.body).backgroundColor, innerWidth * innerHeight);
  const logos = [];
  document.querySelectorAll("header img, nav img, header svg, nav svg, img[alt*=logo i], img[src*=logo i], img[class*=logo i], [class*=logo i] img, [class*=logo i] svg, a[href='/'] img, a[href='/'] svg").forEach((el) => {
    const r = el.getBoundingClientRect(); if (r.width < 16 || r.height < 12 || r.top > 300) return;
    logos.push({ tag: el.tagName.toLowerCase(), src: el.currentSrc || el.getAttribute("src") || null, svg: el.tagName.toLowerCase() === "svg" ? el.outerHTML.slice(0, 60000) : null, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) });
  });
  const icons = [...document.querySelectorAll("link[rel*=icon], meta[property='og:image']")].map((l) => l.href || l.content).filter(Boolean);
  const cssVars = {};
  for (const sh of [...document.styleSheets]) { try { for (const r of sh.cssRules) if (r.selectorText && /:root|html|body/.test(r.selectorText)) for (const p of r.style) if (p.startsWith("--")) cssVars[p] = r.style.getPropertyValue(p).trim(); } catch (e) {} }
  const links = [...document.querySelectorAll("a[href]")].map((a) => ({ href: a.href, text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 60), inNav: !!a.closest("header, nav, footer") }));
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, weight: Math.round(v) }));
  return {
    title: document.title, lang: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.body).direction,
    description: document.querySelector("meta[name=description]")?.content || "",
    colors: { backgrounds: top(bg, 12), text: top(ink, 8), buttons: top(btn, 6) }, fonts: top(fonts, 6), cssVars, logos: logos.slice(0, 6), icons, links,
    images: [...document.images].filter((im) => im.naturalWidth >= 120 && im.naturalHeight >= 80).slice(0, 60).map((im) => ({ src: im.currentSrc || im.src, alt: im.alt || "", w: im.naturalWidth, h: im.naturalHeight, shownW: Math.round(im.getBoundingClientRect().width) })),
    headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 40),
    text: document.body.innerText.replace(/\n{2,}/g, "\n").slice(0, 6000),
  };
},
  MARK: () => {
  document.querySelectorAll("[data-mgx]").forEach((e) => e.removeAttribute("data-mgx"));
  const clean = (t, n) => Array.from(String(t || "").trim().replace(/\s+/g, " ")).slice(0, n).join("");
  const out = []; let i = 0;
  for (const el of document.querySelectorAll("a, button, input, select, textarea, [role=button], [role=tab], [role=link], [role=menuitem], [role=checkbox], [role=switch], [role=radio], [onclick], label, [contenteditable=true]")) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.tagName === "LABEL" && el.control) continue; // its input is listed with the label text
    el.setAttribute("data-mgx", ++i);
    const tag = el.tagName.toLowerCase();
    const label = clean([...(el.labels || [])].map((l) => l.innerText).join(" ") || (el.getAttribute("aria-labelledby") && document.getElementById(el.getAttribute("aria-labelledby"))?.innerText) || el.getAttribute("aria-label") || "", 50);
    const text = clean(tag === "input" || tag === "textarea" ? "" : el.innerText || el.title, 70);
    const val = tag === "input" || tag === "textarea" || tag === "select" ? (el.type === "password" ? (el.value ? "••••" : "") : clean(el.value, 40)) : "";
    // checkbox / radio / switch: say whether it is on, so it is never toggled off again
    const toggle = (tag === "input" && (el.type === "checkbox" || el.type === "radio")) || /^(checkbox|switch|radio)$/.test(el.getAttribute("role") || "");
    const state = toggle ? ((tag === "input" ? el.checked : el.getAttribute("aria-checked") === "true") ? " checked" : " unchecked") : "";
    out.push(`[${i}] <${tag}${el.type && tag !== "button" ? " type=" + el.type : ""}${el.name ? " name=" + el.name : ""}${el.required ? " required" : ""}${el.disabled ? " disabled" : ""}${state}>${label ? ` label="${label}"` : ""}${el.placeholder ? ` placeholder="${clean(el.placeholder, 40)}"` : ""}${val ? ` value="${val}"` : ""} ${text}`);
    if (i >= 140) break;
  }
  return out.join("\n");
},
  REGIONS: () => {
  document.querySelectorAll("[data-part]").forEach((e) => e.removeAttribute("data-part"));
  const W = document.documentElement.clientWidth, docH = document.documentElement.scrollHeight;
  const clean = (t, n) => Array.from(String(t || "").trim().replace(/\s+/g, " ")).slice(0, n).join("");
  const looksBoxed = (el, cs) => cs.boxShadow !== "none" || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderRadius) >= 6 || (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== getComputedStyle(el.parentElement || el).backgroundColor);
  const cands = [];
  for (const el of document.querySelectorAll("section, article, form, table, aside, [role=dialog], [role=region], main > div, div, img, canvas, svg")) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.5) continue;
    const area = r.width * r.height, text = clean(el.innerText, 400);
    if (r.width < 160 || r.height < 70 || r.width > W * 0.98 && r.height > 2600 || area < 25000) continue;
    if (!text && !el.querySelector("canvas, svg, img, video")) continue;
    const tag = el.tagName.toLowerCase(), boxed = looksBoxed(el, cs);
    if (tag === "div" && !boxed) continue;
    if (["img", "canvas", "svg"].includes(tag) && (r.width < 300 || r.height < 150)) continue;
    const kind = el.querySelector("canvas") || el.querySelector("svg path[d]") && /chart|recharts|apex|graph/i.test(el.innerHTML.slice(0, 4000)) ? "chart" : el.querySelector("table, [role=table], [role=grid]") ? "table" : el.querySelector("input, textarea, select") ? "form" : el.querySelector("img, video") && text.length < 120 ? "media" : tag === "section" ? "section" : "card";
    const heading = clean(el.querySelector("h1,h2,h3,h4,h5,[class*=title i],strong,b")?.innerText || el.getAttribute("aria-label") || text, 60);
    cands.push({ el, r: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }, area, kind, heading, text: clean(el.innerText, 220) });
  }
  // prefer the smallest meaningful blocks: a candidate that contains 2+ other candidates is a layout container, not an object
  const filtered = cands.filter((c) => cands.filter((o) => o !== c && c.el.contains(o.el)).length < 2);
  cands.length = 0; cands.push(...filtered);
  // then mid-sized first; drop near-duplicates (a block almost the same box as one already kept)
  cands.sort((a, b) => Math.abs(Math.log(a.area / (W * 400))) - Math.abs(Math.log(b.area / (W * 400))));
  const kept = [];
  for (const c of cands) {
    if (kept.some((k) => { const ix = Math.max(0, Math.min(k.r.x + k.r.w, c.r.x + c.r.w) - Math.max(k.r.x, c.r.x)), iy = Math.max(0, Math.min(k.r.y + k.r.h, c.r.y + c.r.h) - Math.max(k.r.y, c.r.y)); return ix * iy > 0.6 * Math.min(k.area, c.area); })) continue;
    kept.push(c); if (kept.length >= 16) break;
  }
  kept.sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x);
  return kept.map((c, i) => { c.el.setAttribute("data-part", i); return { i, kind: c.kind, heading: c.heading, text: c.text, w: Math.round(c.r.w), h: Math.round(c.r.h), y: Math.round(c.r.y) }; });
},
  OBJECTS: () => {
  const clean = (t, n = 80) => Array.from(String(t || "").trim().replace(/\s+/g, " ")).slice(0, n).join("");
  const vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.1; };
  const hex = (c) => { const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < 0.15)) return null; return "#" + [m[1], m[2], m[3]].map((x) => Math.round(+x).toString(16).padStart(2, "0")).join(""); };
  const NUM = /^[+\-]?[\d٠-٩][\d٠-٩.,٫٬\s]*\s*(%|٪|k|K|M|x|X|ج\.?م|EGP|SAR|ر\.?س|ريال|جنيه|\$|USD|SYP)?$|^(EGP|SAR|USD|SYP|\$)\s?[\d٠-٩.,]+$/;
  const out = [];
  for (const el of document.querySelectorAll("[data-part]")) {
    const cs = getComputedStyle(el), o = { part: +el.getAttribute("data-part") };
    o.title = clean(el.querySelector("h1,h2,h3,h4,h5,h6,[class*=title i],[class*=heading i]")?.innerText, 90);
    o.style = { bg: hex(cs.backgroundColor), ink: hex(cs.color), radius: parseFloat(cs.borderTopLeftRadius) || 0, border: parseFloat(cs.borderTopWidth) ? hex(cs.borderTopColor) : null, shadow: cs.boxShadow !== "none" };
    // stats: short numeric text with its nearest label
    o.stats = [];
    for (const n of el.querySelectorAll("*")) {
      if (!vis(n) || n.children.length > 1) continue;
      const t = clean(n.innerText, 24); if (!t || !NUM.test(t)) continue;
      const box = n.parentElement?.parentElement || n.parentElement; const label = clean(box?.innerText.replace(n.innerText, ""), 40);
      o.stats.push({ value: t, label, color: hex(getComputedStyle(n).color) }); if (o.stats.length >= 8) break;
    }
    o.buttons = [...el.querySelectorAll("button, a[class*=btn i], a[class*=button i], [role=button], input[type=submit]")].filter(vis).slice(0, 6).map((b) => { const bs = getComputedStyle(b); return { text: clean(b.innerText || b.value || b.getAttribute("aria-label"), 40), bg: hex(bs.backgroundColor), ink: hex(bs.color), radius: parseFloat(bs.borderTopLeftRadius) || 0, gradient: bs.backgroundImage.includes("gradient") ? bs.backgroundImage.slice(0, 160) : null }; }).filter((b) => b.text);
    o.fields = [...el.querySelectorAll("input:not([type=hidden]):not([type=submit]), textarea, select")].filter(vis).slice(0, 8).map((f) => ({ type: f.type || f.tagName.toLowerCase(), label: clean([...(f.labels || [])].map((l) => l.innerText).join(" ") || f.getAttribute("aria-label"), 40), placeholder: clean(f.placeholder, 50), value: f.type === "password" ? "" : clean(f.value || (f.tagName === "SELECT" ? f.options[f.selectedIndex]?.text : ""), 40) }));
    const rows = [...el.querySelectorAll("tr, [role=row]")].filter(vis).slice(0, 7).map((r) => [...r.querySelectorAll("th, td, [role=cell], [role=columnheader]")].slice(0, 7).map((c) => clean(c.innerText, 30)));
    if (rows.length) o.table = rows.filter((r) => r.some(Boolean));
    const items = [...el.querySelectorAll("li, [role=listitem], [role=option]")].filter(vis).slice(0, 10).map((li) => clean(li.innerText, 70)).filter(Boolean);
    if (items.length) o.list = items;
    o.chips = [...el.querySelectorAll("span, small, div")].filter((c) => { if (!vis(c) || c.children.length) return false; const st = getComputedStyle(c), t = clean(c.innerText, 30); return t && t.length <= 28 && parseFloat(st.borderTopLeftRadius) >= 8 && hex(st.backgroundColor); }).slice(0, 8).map((c) => ({ text: clean(c.innerText, 28), bg: hex(getComputedStyle(c).backgroundColor), ink: hex(getComputedStyle(c).color) }));
    o.images = [...el.querySelectorAll("img")].filter(vis).slice(0, 6).map((im) => ({ src: im.currentSrc || im.src, alt: clean(im.alt, 40), w: im.naturalWidth, h: im.naturalHeight }));
    o.chart = !!el.querySelector("canvas, svg path[d], [class*=chart i], [class*=recharts i]");
    // remaining plain texts (descriptions, labels) not already captured
    const used = new Set([o.title, ...o.stats.flatMap((x) => [x.value]), ...o.buttons.map((b) => b.text), ...o.chips.map((c) => c.text)]);
    o.texts = [...new Set([...el.querySelectorAll("p, span, div, label, small")].filter((n) => vis(n) && ![...n.children].some((ch) => ch.innerText)).map((n) => clean(n.innerText, 90)).filter((t) => t && !used.has(t)))].slice(0, 10);
    for (const k of ["stats", "buttons", "fields", "chips", "images", "texts"]) if (!o[k].length) delete o[k];
    out.push(o);
  }
  return out;
},
  SNAPSHOT: (opts) => {
  const { sel = null, mode = "el", maxEls = 2600, maxH = 4200 } = opts || {};
  const root = sel ? document.querySelector(sel) : document.body;
  if (!root) return null;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escA = (s) => esc(s).replace(/"/g, "&quot;");
  const clean = (t, n) => Array.from(String(t || "").trim().replace(/\s+/g, " ")).slice(0, n).join("");
  const R = (v) => Math.round(v * 10) / 10;
  const restore = []; restore.push([null, scrollX, scrollY]);
  if (mode === "page") scrollTo(0, 0);
  const rr = root.getBoundingClientRect();
  const OX = mode === "page" ? 0 : rr.left, OY = mode === "page" ? 0 : rr.top;
  let W = mode === "page" ? document.documentElement.clientWidth : Math.ceil(rr.width);
  let H = mode === "page" ? Math.max(document.documentElement.scrollHeight, innerHeight) : Math.ceil(rr.height);

  // dashboards often scroll an inner panel, not the page: unroll the biggest one so the whole screen is there
  const grow = new Map();
  if (mode === "page") {
    let best = null;
    for (const el of document.querySelectorAll("main, div, section")) {
      const cs = getComputedStyle(el);
      if (!/(auto|scroll)/.test(cs.overflowY) || el.scrollHeight < el.clientHeight + 150 || el.clientWidth < innerWidth * 0.4) continue;
      if (!best || el.clientWidth * el.scrollHeight > best.clientWidth * best.scrollHeight) best = el;
    }
    if (best) { restore.push([best, 0, best.scrollTop]); best.scrollTop = 0; const d = Math.min(best.scrollHeight - best.clientHeight, maxH); for (let e = best; e && e !== document.documentElement; e = e.parentElement) grow.set(e, d); H += d; }
  }
  H = Math.min(H, maxH + innerHeight);

  // ---------- pick the elements worth animating (keys) ----------
  const NUM = /^[+\-]?[\d٠-٩][\d٠-٩.,٫٬\s]*\s*(%|٪|k|K|M|x|X|ج\.?م|EGP|SAR|ر\.?س|ريال|جنيه|\$|USD)?$|^(EGP|SAR|USD|\$|ج\.?م|ر\.?س)\s?[\d٠-٩.,]+$/;
  const visible = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05 && r.width > 1 && r.height > 1; };
  const cand = [];
  const PRI = { acted: 0, field: 1, button: 2, stat: 3, title: 4, part: 5, tab: 6, row: 7, chart: 8, image: 9, item: 10, nav: 11 };
  for (const el of root.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const tag = el.tagName.toLowerCase(); let role = null;
    if (el.closest("svg") && tag !== "svg") continue;
    if (el.hasAttribute("data-part")) role = "part";
    else if (/^(input|textarea|select)$/.test(tag) && !/^(hidden|checkbox|radio|submit|button)$/.test(el.type)) role = "field";
    else if (el.getAttribute("role") === "tab") role = "tab";
    else if ((tag === "a" || tag === "button") && el.closest("nav, aside")) role = "nav";
    else if (tag === "button" || el.getAttribute("role") === "button" || (tag === "input" && /submit|button/.test(el.type)) || (tag === "a" && (getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)" || /btn|button/i.test(el.className)))) role = "button";
    else if (tag === "a" && el.closest("nav, aside, header")) role = "nav";
    else if (/^h[1-4]$/.test(tag)) role = "title";
    else if (tag === "tr" || el.getAttribute("role") === "row") role = "row";
    else if (tag === "li" || el.getAttribute("role") === "listitem" || el.getAttribute("role") === "option") role = "item";
    else if (tag === "canvas" || (tag === "svg" && el.getBoundingClientRect().width > 200)) role = "chart";
    else if (tag === "img" && el.getBoundingClientRect().width >= 48) role = "image";
    else if (!el.children.length && NUM.test(clean(el.textContent, 30)) && clean(el.textContent, 30)) role = "stat";
    if (!role) continue;
    const acted = el.getAttribute("data-acted");
    cand.push({ el, role, acted, pri: acted ? 0 : PRI[role] });
  }
  cand.sort((a, b) => a.pri - b.pri);
  const keyOf = new Map(); let kn = 0;
  for (const c of cand.slice(0, 110)) keyOf.set(c.el, { k: "k" + ++kn, ...c });

  // ---------- serialize ----------
  const INH = ["color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "direction", "text-transform", "white-space", "word-spacing", "-webkit-text-fill-color"];
  const DEF = { "background-color": "rgba(0, 0, 0, 0)", "background-image": "none", "box-shadow": "none", opacity: "1", filter: "none", "backdrop-filter": "none", "mix-blend-mode": "normal", "text-shadow": "none", "object-fit": "fill", "clip-path": "none", "z-index": "auto", "text-overflow": "clip", "-webkit-background-clip": "border-box", "background-clip": "border-box", "-webkit-line-clamp": "none", "vertical-align": "baseline", "text-decoration-line": "none" };
  const BG_MORE = ["background-size", "background-position", "background-repeat"];
  const out = []; let count = 0;
  const rootCs = getComputedStyle(root);
  const inhOf = (cs) => Object.fromEntries(INH.map((p) => [p, cs.getPropertyValue(p)]));
  const styleFor = (el, cs, pcs, extra = "") => {
    let s = "";
    for (const p of INH) { const v = cs.getPropertyValue(p); if (!pcs || pcs[p] !== v) s += `${p}:${v};`; }
    for (const p in DEF) { const v = cs.getPropertyValue(p); if (v && v !== DEF[p]) s += `${p}:${v};`; }
    if (cs.backgroundImage !== "none") for (const p of BG_MORE) s += `${p}:${cs.getPropertyValue(p)};`;
    for (const side of ["top", "right", "bottom", "left"]) { const w = parseFloat(cs.getPropertyValue(`border-${side}-width`)); if (w > 0 && cs.getPropertyValue(`border-${side}-style`) !== "none") s += `border-${side}:${w}px ${cs.getPropertyValue(`border-${side}-style`)} ${cs.getPropertyValue(`border-${side}-color`)};`; }
    const rad = ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => cs.getPropertyValue(`border-${c}-radius`));
    if (rad.some((r) => parseFloat(r) > 0)) s += `border-radius:${rad.join(" ")};`;
    if (cs.overflow !== "visible" && cs.overflow !== "") s += "overflow:hidden;";
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) s += `outline:${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor};outline-offset:${cs.outlineOffset};`;
    return (s + extra).replace(/"/g, "'");
  };
  const padOf = (cs) => ["top", "right", "bottom", "left"].map((d) => cs.getPropertyValue(`padding-${d}`)).join(" ");
  const isInline = (n) => n.nodeType === 3 || n.nodeType === 8 || (n.nodeType === 1 && (n.tagName === "BR" || (getComputedStyle(n).display === "inline" && !/^(img|svg|canvas|video|input|select|textarea|button|iframe)$/i.test(n.tagName) && [...n.childNodes].every(isInline))));
  const keyAttrs = (el) => { const k = keyOf.get(el); if (!k) return ""; return ` data-k="${k.k}" data-role="${k.role}"${k.acted ? ` data-acted="${k.acted}"` : ""}`; };
  const inlineHtml = (n, pcs) => {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.tagName === "BR") return "<br>";
    const cs = getComputedStyle(n); if (cs.display === "none") return "";
    const pad = padOf(cs) !== "0px 0px 0px 0px" ? `padding:${padOf(cs)};` : "";
    return `<span${keyAttrs(n)} style="${styleFor(n, cs, pcs, pad)}">${[...n.childNodes].filter((c) => c.nodeType !== 8).map((c) => inlineHtml(c, inhOf(cs))).join("")}</span>`;
  };
  const svgHtml = (svg, r) => {
    const c = svg.cloneNode(true); const src = [svg, ...svg.querySelectorAll("*")], dst = [c, ...c.querySelectorAll("*")];
    src.forEach((s, i) => { const cs = getComputedStyle(s), d = dst[i]; for (const p of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "stop-color", "stop-opacity"]) { const v = cs.getPropertyValue(p); if (v) d.style.setProperty(p, v); } d.removeAttribute("class"); });
    c.setAttribute("width", R(r.width)); c.setAttribute("height", R(r.height)); c.style.color = getComputedStyle(svg).color;
    if (!c.getAttribute("xmlns")) c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return c.outerHTML;
  };

  const walk = (el, px, py, pcs, depth) => {
    if (count > maxEls || depth > 60) return "";
    const tag = el.tagName.toLowerCase();
    if (/^(script|style|noscript|template|link|meta|head|title)$/.test(tag)) return "";
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.02) return "";
    if (el.id === "__flash" || el.hasAttribute("data-mgx-ignore")) return "";
    const r = el.getBoundingClientRect();
    const x = r.left - OX, y = r.top - OY;
    if (y > H || y + r.height < -2 || x > W + 40 || x + r.width < -40) return ""; // outside the captured area
    count++;
    const g = grow.get(el) || 0;
    const left = R(r.left - px), top = R(r.top - py), w = R(r.width), h = R(r.height + g);
    const pos = `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;box-sizing:border-box;margin:0;`;
    const my = inhOf(cs);
    const ka = keyAttrs(el);
    const pa = el.hasAttribute("data-part") ? ` data-part="${el.getAttribute("data-part")}"` : "";
    if (tag === "svg") return `<div${ka} style="${pos}">${svgHtml(el, r)}</div>`;
    if (tag === "img" || tag === "video") {
      const src = tag === "img" ? el.currentSrc || el.src : el.poster;
      if (!src) return `<div${ka} style="${pos}${styleFor(el, cs, pcs)}"></div>`;
      return `<img${ka} src="${escA(src)}" alt="" style="${pos}${styleFor(el, cs, pcs)}object-fit:${cs.objectFit};object-position:${cs.objectPosition};">`;
    }
    if (tag === "canvas") { let d = ""; try { d = el.toDataURL("image/png"); } catch {} return d ? `<img${ka} src="${d}" style="${pos}">` : `<div${ka} style="${pos}"></div>`; }
    if (tag === "iframe" && el.getAttribute("data-shot")) return `<img${ka} src="${escA(el.getAttribute("data-shot"))}" alt="" style="${pos}${styleFor(el, cs, pcs)}object-fit:cover;">`;
    if (tag === "iframe") return `<div${ka} style="${pos}${styleFor(el, cs, pcs)}background:#f2f2f2;"></div>`;
    if (tag === "input" && /^(checkbox|radio)$/.test(el.type)) return `<div${ka} style="${pos}${styleFor(el, cs, pcs)}"><input type="${el.type}"${el.checked ? " checked" : ""} disabled style="margin:0;width:100%;height:100%;accent-color:${cs.accentColor};opacity:1"></div>`;
    if (tag === "input" && el.type === "color") return `<div${ka} style="${pos}${styleFor(el, cs, pcs)}background:${el.value};"></div>`;
    if (/^(input|textarea|select)$/.test(tag)) {
      const val = tag === "select" ? el.options[el.selectedIndex]?.text || "" : el.type === "password" ? (el.value ? "••••••••" : "") : el.value;
      const ph = el.placeholder || "";
      const phColor = (() => { try { return getComputedStyle(el, "::placeholder").color; } catch { return cs.color; } })();
      const shown = val || ph;
      const align = tag === "textarea" ? "align-items:flex-start;" : "align-items:center;";
      return `<div${ka}${pa} data-ph="${escA(ph)}" data-val="${escA(val)}" data-ink="${cs.color}" data-phink="${phColor}" style="${pos}${styleFor(el, cs, pcs)}padding:${padOf(cs)};display:flex;${align}white-space:nowrap;overflow:hidden;"><span class="uv" style="color:${val ? cs.color : phColor};-webkit-text-fill-color:currentColor">${esc(shown)}</span>${tag === "select" ? `<span style="margin-inline-start:auto;opacity:.6">▾</span>` : ""}</div>`;
    }
    let inner = "";
    const kids = [...el.childNodes].filter((n) => n.nodeType === 1 || n.nodeType === 3);
    const textOnly = kids.length && kids.every(isInline) && kids.some((n) => n.textContent.trim());
    let st = styleFor(el, cs, pcs);
    if (cs.display === "list-item" && cs.listStyleType !== "none") st += `display:list-item;list-style:${cs.listStyleType} ${cs.listStylePosition};`;
    // inline text decorations (strike-through prices…) do not reach absolutely placed children: carry them over
    if (textOnly) {
      // pure text block: keep real text flow inside the exact box
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
      const contentH = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const oneLine = contentH < lh * 1.6;
      const flex = /flex|grid/.test(cs.display) ? `display:flex;align-items:${cs.alignItems === "normal" ? "stretch" : cs.alignItems};justify-content:${cs.justifyContent === "normal" ? "flex-start" : cs.justifyContent};` : "";
      inner = kids.map((n) => inlineHtml(n, my)).join("");
      return `<div${ka}${pa} style="${pos}${st}padding:${padOf(cs)};${flex}${oneLine ? "white-space:nowrap;" : ""}">${inner}</div>`;
    }
    const bx = r.left + parseFloat(cs.borderLeftWidth), by = r.top + parseFloat(cs.borderTopWidth);
    for (const n of kids) {
      if (n.nodeType === 3) {
        if (!n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const rects = [...rg.getClientRects()].filter((q) => q.width > 0); if (!rects.length) continue;
        const b = rg.getBoundingClientRect(); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
        const one = rects.length === 1 || b.height < lh * 1.6;
        const slack = one ? Math.max(6, b.width * 0.06) : 2;
        const rtl = cs.direction === "rtl";
        const lx = R(b.left - bx - (rtl ? slack : 0)), ty = R(one ? b.top - by : rects[0].top - by - (lh - rects[0].height) / 2);
        const deco = (() => { for (let e = el; e && e !== root.parentElement; e = e.parentElement) { const d = getComputedStyle(e).textDecorationLine; if (d && d !== "none") return `text-decoration:${d} ${getComputedStyle(e).textDecorationColor};`; if (getComputedStyle(e).display !== "inline") break; } return ""; })();
        inner += `<span style="position:absolute;left:${lx}px;top:${ty}px;width:${R(b.width + slack)}px;${one ? `height:${R(b.height)}px;line-height:${R(b.height)}px;white-space:nowrap;` : ""}text-align:${rtl ? "right" : "left"};${deco}">${esc(n.textContent.trim())}</span>`;
      } else if (n.nodeType === 1) inner += walk(n, bx, by, my, depth + 1);
    }
    // simple decorative ::before / ::after boxes (dots, badges, bars) — text icons are skipped
    for (const pe of ["::before", "::after"]) {
      const ps = getComputedStyle(el, pe); if (!ps || ps.content === "none" || ps.content === "normal" || ps.display === "none") continue;
      if (ps.position === "absolute" && parseFloat(ps.width) > 0 && parseFloat(ps.height) > 0 && (ps.backgroundColor !== "rgba(0, 0, 0, 0)" || ps.backgroundImage !== "none" || parseFloat(ps.borderTopWidth) > 0)) {
        const l = parseFloat(ps.left), t = parseFloat(ps.top);
        if (isNaN(l) || isNaN(t)) continue;
        inner += `<span style="position:absolute;left:${l}px;top:${t}px;width:${ps.width};height:${ps.height};${styleFor(el, ps, my)}"></span>`;
      }
    }
    return `<div${ka}${pa} style="${pos}${st}">${inner}</div>`;
  };

  // root box sits at 0,0
  let html;
  if (mode === "page") {
    const bodyCs = getComputedStyle(document.body), htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    const bg = bodyCs.backgroundColor !== "rgba(0, 0, 0, 0)" ? bodyCs.backgroundColor : htmlBg !== "rgba(0, 0, 0, 0)" ? htmlBg : "#ffffff";
    const kids = [...document.body.children].map((c) => walk(c, 0, 0, inhOf(bodyCs), 1)).join("");
    html = `<div style="${`position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;isolation:isolate;background:${bg};${bodyCs.backgroundImage !== "none" ? `background-image:${bodyCs.backgroundImage};` : ""}${INH.map((p) => `${p}:${bodyCs.getPropertyValue(p)}`).join(";")}`.replace(/"/g, "'")}">${kids}</div>`;
  } else {
    const pcs = root.parentElement ? inhOf(getComputedStyle(root.parentElement)) : null;
    const inner = walk(root, OX, OY, pcs, 0);
    html = `<div style="${`position:absolute;left:0;top:0;width:${W}px;height:${H}px;isolation:isolate;${INH.map((p) => `${p}:${(pcs || inhOf(rootCs))[p]}`).join(";")}`.replace(/"/g, "'")}">${inner}</div>`;
  }

  // key boxes in snapshot coordinates (for camera moves and taps)
  const keys = [];
  for (const [el, k] of keyOf) {
    const r = el.getBoundingClientRect(); const x = r.left - OX, y = r.top - OY;
    if (y > H || y + r.height < 0 || x > W || x + r.width < 0) continue;
    const text = /^(input|textarea|select)$/.test(el.tagName.toLowerCase()) ? clean(el.value || el.placeholder, 40) : clean(el.innerText || el.getAttribute("alt") || el.getAttribute("aria-label"), 40);
    keys.push({ k: k.k, role: k.role, ...(k.acted ? { acted: k.acted } : {}), ...(el.hasAttribute("data-part") ? { part: +el.getAttribute("data-part") } : {}), text, box: [Math.round(x), Math.round(y), Math.round(r.width), Math.round(r.height)] });
  }
  keys.sort((a, b) => +a.k.slice(1) - +b.k.slice(1));
  for (const [e, x, y] of restore) if (e) e.scrollTop = y; else scrollTo(x, y);
  return { w: Math.round(W), h: Math.round(H), dir: rootCs.direction, count, html, keys, title: document.title, url: location.href };
},
  QA_PROBE: () => {
  const stage = document.getElementById("stage"); const S = stage.getBoundingClientRect();
  const effOpacity = (el) => { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return 0; o *= +cs.opacity; } return o; };
  const sel = (el) => { if (el.id) return "#" + el.id; const parts = []; for (let e = el; e && e !== stage && parts.length < 4; e = e.parentElement) { parts.unshift(e.id ? "#" + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")); if (e.id) break; } return parts.join(" > "); };
  const texts = [];
  // text inside embedded live product screens is the real UI (small by nature, clipped by its window) — judge only our own layer
  const mine = [...stage.querySelectorAll("*")].filter((el) => !el.closest(".ui-clone"));
  for (const el of mine) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(); if (!own) continue;
    const o = effOpacity(el); if (o < 0.15) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    texts.push({ sel: sel(el), text: own.slice(0, 60), x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height, fs: parseFloat(getComputedStyle(el).fontSize), o: +o.toFixed(2) });
  }
  const els = [];
  for (const el of mine) { const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (own && effOpacity(el) >= 0.6) els.push(el); }
  const overlaps = [];
  for (let a = 0; a < els.length; a++) for (let b = a + 1; b < els.length; b++) {
    const A = els[a], B = els[b]; if (A.contains(B) || B.contains(A) || A.parentElement === B.parentElement) continue;
    const ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect();
    const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)), iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
    if (ix * iy > 0.3 * Math.min(ra.width * ra.height, rb.width * rb.height)) overlaps.push([A.textContent.trim().slice(0, 40), sel(A), B.textContent.trim().slice(0, 40), sel(B)]);
  }
  let media = 0; for (const el of stage.querySelectorAll("[data-clone], img, svg, canvas, [style*='background-image']")) { if (el.closest(".ui-clone")) continue; const r = el.getBoundingClientRect(); if (r.width * r.height > 20000 && effOpacity(el) > 0.3 && r.right > S.left && r.left < S.right && r.bottom > S.top && r.top < S.bottom) media++; }
  // the boxes that must stay inside the safe area (our layer: text blocks, chips, callouts, devices, pops, tiles, cards…), and
  // the main-visual boxes for density; full-bleed photos are exempt
  const boxes = [];
  for (const el of stage.querySelectorAll(".head, .card, .co, .cos, .stackcard, .tile, .pain, .pains, .bignum, .cta-btn, .url, .biglogo, .tick, .fakefield, .dev, .pop, .ui-lid, .ui-base, .ph.half")) {
    if (el.closest(".ui-clone") || effOpacity(el) < 0.2) continue; // a dimmed device behind a pop-out is still on screen
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    boxes.push({ sel: sel(el), cls: String(el.className || ""), x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height });
  }
  // images that failed to load (a broken-image block on screen)
  let broken = 0;
  for (const im of stage.querySelectorAll("img")) { const r = im.getBoundingClientRect(); if (im.complete && im.naturalWidth === 0 && r.width * r.height > 20000 && effOpacity(im) > 0.3 && r.right > S.left && r.left < S.right && r.bottom > S.top && r.top < S.bottom) broken++; }
  // live product screens actually on screen (a visible data-clone window)
  let clones = 0; for (const el of stage.querySelectorAll("[data-clone]")) { const r = el.getBoundingClientRect(); if (r.width * r.height > 20000 && effOpacity(el) > 0.3 && r.right > S.left && r.left < S.right && r.bottom > S.top && r.top < S.bottom) clones++; }
  return { texts, media, clones, boxes, broken, overlaps: overlaps.slice(0, 6), W: S.width, H: S.height };
},
  QA_CAMS: () => {
  const stage = document.getElementById("stage"); const S = stage.getBoundingClientRect();
  const effOpacity = (el) => { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return 0; o *= +cs.opacity; } return o; };
  return [...stage.querySelectorAll("[data-clone]")].filter((el) => el.querySelector(".ui-lid")).map((el) => {
    const r = el.getBoundingClientRect(), cam = el.querySelector(".ui-cam"), tf = cam ? getComputedStyle(cam).transform : "none";
    const vis = r.width * r.height > 20000 && effOpacity(el) > 0.3 && r.right > S.left && r.left < S.right && r.bottom > S.top && r.top < S.bottom;
    return { id: el.id || el.dataset.clone, vis, z: tf && tf !== "none" ? +new DOMMatrix(tf).a.toFixed(3) : 1 };
  });
},
  NAV: () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none"; };
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const skip = /log ?out|sign ?out|تسجيل الخروج|خروج|language|اللغة|english|عربي|help|مساعدة|support|الدعم|docs|privacy|terms|الشروط|الخصوصية|buy|upgrade|شراء|ترقية|رصيد|dark|night|light|الليل|النهار|اليوم/i;
  const links = [], tabs = [], seen = new Set();
  const scopes = "nav, aside, [role=navigation], [class*=sidebar i], [class*=sidenav i], [class*=side-nav i]";
  // menu items inside a nav / aside / sidebar, or links/buttons whose own class marks them as menu / nav items
  for (const el of document.querySelectorAll(`:is(${scopes}) :is(a[href], button, [role=link], [role=menuitem]), :is(a[href], button)[class*=menu i], :is(a[href], button)[class*=nav-item i], :is(a[href], button)[class*=nav-link i], :is(a[href], button)[class*=sidebar i]`)) {
    if (!vis(el)) continue;
    const text = clean(el.innerText || el.getAttribute("aria-label") || el.title); if (!text || skip.test(text)) continue;
    let href = null;
    if (el.matches("a[href]")) { let u; try { u = new URL(el.href); } catch { continue; } if (u.hostname !== location.hostname || /^(mailto|tel|javascript):/.test(el.href)) continue; href = u.origin + u.pathname; }
    const key = href ? href.replace(/\/$/, "").toLowerCase() : "nav:" + text; if (seen.has(key) || seen.has("nav:" + text)) continue; seen.add(key); seen.add("nav:" + text);
    links.push({ text, href }); // a menu button has no href: its URL is learned when it is clicked
  }
  for (const el of document.querySelectorAll("[role=tab]")) { if (!vis(el)) continue; const text = clean(el.innerText || el.getAttribute("aria-label")); if (text && !seen.has("tab:" + text)) { seen.add("tab:" + text); tabs.push({ text, selected: el.getAttribute("aria-selected") === "true" }); } }
  // settings that change how the customer-facing side looks (themes, branding, templates, appearance): sections too, wherever they are
  const LOOK = /theme|branding|brand kit|template|appearance|design|customi[sz]e|look ?& ?feel|colou?rs? ?& ?fonts|ثيم|ثيمات|قالب|قوالب|مظهر|المظهر|تصميم|الهوية|ألوان/i, looks = [];
  for (const el of document.querySelectorAll("a[href], button, [role=tab], [role=link], [role=menuitem]")) {
    if (!vis(el)) continue;
    const text = clean(el.innerText || el.getAttribute("aria-label") || el.title); if (!text || text.length > 40 || !LOOK.test(text) || skip.test(text) || seen.has("nav:" + text)) continue;
    let href = null;
    if (el.matches("a[href]")) { let u; try { u = new URL(el.href); } catch { continue; } if (u.hostname !== location.hostname) continue; href = u.origin + u.pathname; }
    seen.add("nav:" + text); looks.push({ text, href });
  }
  return { links: links.slice(0, 40), tabs: tabs.slice(0, 15), looks: looks.slice(0, 8) };
},
  BUSY: () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && +st.opacity > 0.05; };
  const spin = [...document.querySelectorAll("[aria-busy=true], [role=progressbar], progress, [class*=spinner i], [class*=spin i], [class*=loader i]")].filter(vis);
  const skel = [...document.querySelectorAll("[class*=skeleton i], [class*=shimmer i], [class*=placeholder-glow i]")].filter((e) => vis(e) && e.getBoundingClientRect().width > 40);
  // a "loading…" label — also when its dots / icon are separate child elements (short text, few children)
  const LOAD = /^[^\p{L}\d]{0,4}(loading|generating|processing|creating|importing|uploading|searching|analy[sz]ing|fetching|please wait|جار[ٍيٍ]?|جاري|يتم|انتظر|قيد ال)[^\n]{0,50}?(\.{2,}|…)?\s*$/iu;
  const label = [...document.querySelectorAll("body *")].find((e) => { if (e.querySelectorAll("*").length > 3 || !vis(e)) return false; const t = (e.innerText || "").replace(/\s+/g, " ").trim(); return t.length > 3 && t.length <= 80 && LOAD.test(t) && (/(\.{2,}|…)\s*$/.test(t) || [...e.querySelectorAll("*")].some((c) => /dot|pulse|ellipsis|typing|bounce/i.test(String(c.className || "")))); });
  const why = [...spin, ...skel].slice(0, 2).map((e) => String(e.className || e.tagName).slice(0, 40));
  if (label) why.push(`"${label.innerText.trim().slice(0, 40)}"`);
  // real result content already on the page (rows, cards, list items with text): a still-loading source next to it is partial
  const items = [...document.querySelectorAll("tr, li, article, [role=row], [role=listitem], [class*=card i], [class*=result i], [class*=item i]")].filter((e) => vis(e) && e.getBoundingClientRect().height > 30 && (e.innerText || "").trim().length > 12 && !e.closest("nav, aside, header, footer, [role=navigation]")).length;
  return { busy: why.length > 0, why: why.join(", "), items };
},
  HUMAN: () => {
  const re = /verify (that )?you are (a )?human|i'?m not a robot|security check|captcha|التحقق من أنك إنسان|لست برنامج روبوت|إكمال التحقق الأمني|التحقق الأمني/i;
  const hit = [...document.querySelectorAll("body *")].find((e) => !e.children.length && re.test(e.textContent || "") && e.getBoundingClientRect().height > 0);
  return hit ? (hit.textContent || "").trim().slice(0, 80) : "";
},
  REFUSED: () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none"; };
  return [...document.querySelectorAll("[role=alert], [aria-invalid=true], [class*=error i], [class*=invalid i], [class*=danger i]")].some((e) => vis(e) && (e.textContent || "").trim().length > 1);
},
  NAVBTNS: () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none"; };
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const skip = /log ?in|sign ?(in|up)|register|start|get started|try|demo|language|english|عربي|تسجيل|دخول|ابدأ|جرب|اشترك|حساب/i;
  const out = [], seen = new Set(); let i = 0;
  document.querySelectorAll("[data-mgx-nav]").forEach((e) => e.removeAttribute("data-mgx-nav"));
  for (const el of document.querySelectorAll("header button, nav button, footer button, [role=navigation] button, [class*=menu i] button, [role=menuitem], header [role=link], nav [role=link], footer [role=link], header a[href^='#'], nav a[href^='#'], footer a[href^='#'], a[href^='javascript']")) {
    const text = clean(el.innerText || el.getAttribute("aria-label")); if (!vis(el) || !text || skip.test(text) || seen.has(text)) continue;
    seen.add(text); el.setAttribute("data-mgx-nav", ++i); out.push({ i, text });
  }
  return out.slice(0, 12);
},
  CONSENT: () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && +st.opacity > 0.05; };
  const TXT = /cookie|consent|gdpr|privacy|الكوكيز|ملفات تعريف الارتباط|ملفات الارتباط|خصوصية|الخصوصية/i;
  const ACCEPT = /^\s*(accept( all| cookies)?|agree|i agree|allow( all)?|got it|ok|okay|أوافق|موافق|قبول|قبول الكل|اقبل|حسناً|حسنا|فهمت)\s*[!.]?\s*$/i;
  const overlays = [...document.querySelectorAll("body *")].filter((e) => { const p = getComputedStyle(e).position; return (p === "fixed" || p === "sticky") && vis(e) && !e.closest("header, nav") && TXT.test(e.innerText || "") && (e.innerText || "").length < 1500; });
  // the outermost fixed / sticky box of each banner
  const roots = overlays.filter((e) => !overlays.some((o) => o !== e && o.contains(e)));
  const done = [];
  for (const box of roots) {
    const btn = [...box.querySelectorAll("button, a, [role=button], input[type=button], input[type=submit]")].find((b) => vis(b) && ACCEPT.test(b.innerText || b.value || b.getAttribute("aria-label") || ""));
    if (btn) { btn.click(); done.push(`clicked "${(btn.innerText || btn.value || "").trim().slice(0, 20)}"`); }
    else { box.style.setProperty("display", "none", "important"); done.push("hid a cookie/privacy overlay"); }
  }
  return done.join(", ");
},
  SETTLE: async () => {
  document.documentElement.style.scrollBehavior = "auto"; scrollTo({ top: 0, left: 0, behavior: "instant" });
  const t0 = performance.now(), H = innerHeight, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < H && r.width > 1 && r.height > 1; };
  const pending = () => {
    let n = 0;
    for (const el of document.querySelectorAll("body *")) { if (!inView(el)) continue; const cs = getComputedStyle(el); if (cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity < 1) n++; }
    for (const a of document.getAnimations ? document.getAnimations() : []) { const t = a.effect && a.effect.target, it = a.effect && a.effect.getTiming ? a.effect.getTiming().iterations : 1; if (a.playState === "running" && it !== Infinity && t && t.getBoundingClientRect && inView(t)) n++; }
    return n;
  };
  while (performance.now() - t0 < 3000 && (pending() > 0 || scrollY > 0)) { if (scrollY > 0) scrollTo({ top: 0, behavior: "instant" }); await sleep(150); }
  // images (incl. <picture> / srcset: currentSrc) and CSS background images in the first viewport
  const left = () => Math.max(200, 3000 - (performance.now() - t0));
  const waits = [];
  for (const im of document.images) if (inView(im) && !(im.complete && im.naturalWidth)) waits.push(im.decode ? im.decode().catch(() => {}) : null);
  for (const el of document.querySelectorAll("body *")) {
    if (!inView(el)) continue;
    for (const m of getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) { if (m[1].startsWith("data:")) continue; const im = new Image(); im.src = m[1]; waits.push(im.decode ? im.decode().catch(() => {}) : null); }
  }
  await Promise.race([Promise.all(waits), sleep(left())]);
  return { ms: Math.round(performance.now() - t0), stillAnimating: pending() };
},
};
