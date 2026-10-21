// The client's manual edits of a director composition: moves, sizes, hides and text, made in the edit room. The same
// block is applied live in the editor and baked into video.src.html for the re-render, so what was seen is what renders.
// Moves and sizes use the CSS `translate` / `scale` properties, which compose with GSAP's `transform`: an element keeps
// its own animation and lands where the client put it.

export type ElementEdit = { sel: string; dx?: number; dy?: number; scale?: number; hidden?: boolean; text?: string };
export type CompositionEdits = Record<string, ElementEdit>;

export const EDITS_MARK = "data-mgx-edits";

export function editsCss(edits: CompositionEdits) {
  return Object.values(edits).map((e) => {
    const rules = [
      e.dx || e.dy ? `translate:${Math.round(e.dx ?? 0)}px ${Math.round(e.dy ?? 0)}px !important` : "",
      e.scale && Math.abs(e.scale - 1) > 0.001 ? `scale:${e.scale.toFixed(4)} !important;transform-origin:50% 50%` : "",
      e.hidden ? "visibility:hidden !important" : "",
    ].filter(Boolean);
    return rules.length ? `${e.sel}{${rules.join(";")}}` : "";
  }).filter(Boolean).join("\n");
}

/** the text replacements, run before the composition's own script (so its timeline targets the new text) */
export function editsScript(edits: CompositionEdits) {
  const texts = Object.values(edits).filter((e) => typeof e.text === "string").map((e) => [e.sel, e.text]);
  if (!texts.length) return "";
  return `(${SET_TEXT_JS})(${JSON.stringify(texts).replace(/</g, "\\u003c")});`;
}

/** a text kept word by word (<span class="w">…) stays word by word, so the composition's word animation still runs.
 *  Plain JS source: it runs inside the composition (baked in, and live in the edit room). */
export const SET_TEXT_JS = `function(texts){for(const [s,t] of texts){const el=s&&document.querySelector(s);if(!el||typeof t!=="string")continue;const w=el.querySelector(".w");if(!w){el.textContent=t;continue}const cls=w.className;el.textContent="";t.split(/\\s+/).filter(Boolean).forEach((word,i)=>{if(i)el.append(" ");const sp=document.createElement("span");sp.className=cls;sp.textContent=word;el.append(sp)})}}`;

/** video.src.html with the edits baked in (an earlier block is replaced, never stacked) */
export function bakeEdits(html: string, edits: CompositionEdits) {
  const clean = html.replace(new RegExp(`<(style|script)[^>]*\\b${EDITS_MARK}\\b[^>]*>[\\s\\S]*?</\\1>`, "g"), "");
  const css = editsCss(edits), js = editsScript(edits);
  // the edits themselves ride along, so the edit room (and a later re-render) starts from all of them
  const data = Object.keys(edits).length ? `<script type="application/json" id="mgx-edits" ${EDITS_MARK}>${JSON.stringify(edits).replace(/</g, "\\u003c")}</script>` : "";
  let out = clean.replace(/<\/head>/i, `<style ${EDITS_MARK}>\n${css}\n</style>${data}</head>`);
  if (js) {
    // before the composition's own (last) inline script; else at the end of the body
    const at = out.toLowerCase().lastIndexOf("<script>");
    out = at >= 0 ? `${out.slice(0, at)}<script ${EDITS_MARK}>${js}</script>${out.slice(at)}` : out.replace(/<\/body>/i, `<script ${EDITS_MARK}>${js}</script></body>`);
  }
  return out;
}
