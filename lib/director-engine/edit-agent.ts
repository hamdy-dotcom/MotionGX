// The edit room's helper inside the composition frame (a sandboxed iframe: it shares nothing with the app). The room
// talks to it with postMessage: seek the timeline, find each scene's elements (at a settled pose), measure them, and
// apply the client's edits live — the same CSS / text block that bakeEdits() writes for the re-render.
import { EDITS_MARK, SET_TEXT_JS } from "./edits";

export const EDIT_AGENT_JS = `(() => {
  const setText = ${SET_TEXT_JS};
  const reply = (id, data) => parent.postMessage({ mgx: 1, id, ...data }, "*");
  let style = document.querySelector("style[${EDITS_MARK}]");
  if (!style) { style = document.createElement("style"); style.setAttribute("${EDITS_MARK}", ""); document.head.append(style); }
  const W = () => document.documentElement.clientWidth || innerWidth, H = () => document.documentElement.clientHeight || innerHeight;
  const seek = async (t) => { try { await window.__seek?.(t); } catch {} };
  const SKIP = /^(SCRIPT|STYLE|LINK|META|HEAD|TITLE|NOSCRIPT|TEMPLATE|BR|DEFS|CLIPPATH|LINEARGRADIENT|RADIALGRADIENT|STOP)$/i;
  const visible = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      o *= +cs.opacity;
    }
    return o > 0.08;
  };
  const okId = (id) => /^[A-Za-z][\\w-]*$/.test(id) && document.querySelectorAll("#" + id).length === 1;
  const selOf = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.id && okId(n.id)) { parts.unshift("#" + n.id); return parts.join(" > "); }
      parts.unshift(n.tagName.toLowerCase() + ":nth-child(" + ([...n.parentElement.children].indexOf(n) + 1) + ")");
    }
    return "body > " + parts.join(" > ");
  };
  const ownText = (el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) || !!el.querySelector(":scope > .w, :scope > span.w");
  const kindOf = (el) => {
    if (el.matches("[data-clone]") || el.querySelector("[data-clone]")) return "ui";
    if (el.matches("img, svg, picture, video, canvas") || (!el.textContent.trim() && el.querySelector("img, svg"))) return /logo|plate|corner|mark|wm/i.test(el.id + " " + el.className + " " + (el.querySelector("img")?.src || "")) ? "logo" : "img";
    if (el.textContent.trim() && el.querySelectorAll("*").length < 40 && !el.querySelector("img, svg")) return "text";
    return "box";
  };
  const meaningful = (el) => el.id || el.matches("[data-clone], img, svg, video, canvas, p, h1, h2, h3, h4, h5, button, a, li, .pill, .plate, .box, .card, .cta") || ownText(el);
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  function scan() {
    const out = [], area = W() * H();
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIP.test(el.tagName) || el.closest("[data-mgx-agent]")) continue;
      if (out.some((o) => o.el.contains(el))) continue;
      if (el.parentElement?.closest("[data-clone], svg")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 14 || (r.width * r.height) / area > 0.8) continue;
      if (r.right < 0 || r.bottom < 0 || r.left > W() || r.top > H()) continue;
      if (!meaningful(el) || !visible(el)) continue;
      out.push({ el });
    }
    return out.map(({ el }) => { const kind = kindOf(el); return { sel: selOf(el), kind, text: kind === "text" ? el.textContent.replace(/\\s+/g, " ").trim().slice(0, 300) : "", id: el.id || "", box: box(el) }; });
  }
  addEventListener("message", async (e) => {
    if (e.source !== parent || !e.data || e.data.mgx !== 1) return;
    const m = e.data;
    if (m.op === "seek") { await seek(m.t); reply(m.id, {}); }
    else if (m.op === "scan") {
      // found as the director made them: the edits are lifted while looking (a hidden element is still listed)
      const css = style.textContent; style.textContent = "";
      const scenes = []; for (const t of m.poses) { await seek(t); scenes.push(scan()); }
      style.textContent = css; await seek(m.back ?? 0); reply(m.id, { scenes });
    }
    else if (m.op === "apply") { style.textContent = m.css || ""; if (m.texts?.length) setText(m.texts); reply(m.id, {}); }
    else if (m.op === "boxes") { reply(m.id, { boxes: m.sels.map((s) => { let el = null; try { el = document.querySelector(s); } catch {} return el && visible(el) ? box(el) : null; }) }); }
  });
  (async () => {
    try { await window.__ready; } catch {}
    let edits = {};
    try { edits = JSON.parse(document.getElementById("mgx-edits")?.textContent || "{}"); } catch {}
    parent.postMessage({ mgx: 1, op: "ready", duration: +window.__duration || 0, edits, w: W(), h: H(), seekable: typeof window.__seek === "function" }, "*");
  })();
})();`;
