// Approval gate: a tinted "human approval" box (8% fill, 50% border, mono header) waits with "Approval pending"
// pulsing 1 → .5 → 1; on its moment (a spoken word, else ~45% in) the border brightens to full in 0.18 s, the check
// draws itself (stroke-dashoffset, 0.3 s), the status label rolls up (old 0 → −100%, new 100% → 0, 0.25 s power3.out),
// the audit metric "1 approval pending" rolls to 0 and the downstream action node turns active. Denied / rollback
// outcomes swap the tone, icon, labels and what the next node does.
// Source: MengTo/Skills web-design/operational-enterprise-ai demo (.approval / .approvalHead / .audit / .node, MIT).
ML.define({
  id: "ui.approval-gate",
  category: "ui",
  name: "Approval gate releases",
  does: "A tinted human-approval box waits with a pulsing pending label, then flips to approved and the next action unlocks.",
  says: ["trust", "precision", "relief"],
  energy: 2,
  targets: ["card", "label", "number"],
  duration: [1.2, 4],
  params: {
    outcome: { type: "choice", options: ["approved", "denied", "rollback"], default: "approved" },
    owner: { type: "text", default: "" },
    metric: { type: "bool", default: true },
    next_node: { type: "bool", default: true },
    pending_pulse: { type: "number", range: [0.5, 1.2], default: 0.8, unit: "s" },
    word: { type: "text", default: "" },
  },
  pairs: ["ui.checklist-tick", "ui.cursor-glide-click"],
  avoid: ["playful", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click.confirm",
  source: { from: "MengTo/Skills:web-design/operational-enterprise-ai", license: "MIT" },
  setup(ctx) {
    const { p, at, end, rtl, f } = ctx;
    const doc = document;
    const mk = (tag, css, html, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.append(e); return e; };
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const L = rtl
      ? { gate: "بوابة موافقة بشرية", pending: "مستنية الموافقة", approved: "اتوافق عليها", denied: "اترفضت", rollback: "اترجعت", owner: "المالية", body: (o) => `مفيش تنفيذ قبل ما ${o} يراجع المبلغ والمورّد والدليل.`, checks: "فحوصات اتسجّلت", waiting: "موافقة مستنية", next: "التالي · تحويل الدفعة", nextOn: { approved: "شغّال", denied: "متوقّف", rollback: "رجع زي ما كان" }, nextOff: "مقفول" }
      : { gate: "Human approval gate", pending: "Approval pending", approved: "Approved", denied: "Denied", rollback: "Rolled back", owner: "Finance ops", body: (o) => `Release is blocked until ${o} reviews amount, vendor and evidence.`, checks: "Checks recorded", waiting: "Approval pending", next: "Next · Release payment", nextOn: { approved: "Running", denied: "Blocked", rollback: "Restored" }, nextOff: "Locked" };
    const tone = p.outcome === "denied" ? "var(--x-bad)" : p.outcome === "rollback" ? "var(--x-accent)" : "var(--x-good)";
    const icon = p.outcome === "denied" ? "M6.5 6.5l11 11M17.5 6.5l-11 11" : p.outcome === "rollback" ? "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" : "M5 12.5l4.5 4.5L19 7.5";
    let host = ctx.el;
    const own = host ? host.textContent.trim() : "";
    if (host) host.replaceChildren();
    else host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
    const owner = p.owner || L.owner;
    const fs = ML.clamp(Math.min(f.W, f.H) * 0.028, 16, 34);
    const wrap = mk("div", `width:${ctx.el ? "100%" : Math.min((host.clientWidth || f.pic.w) * 0.94, f.W * 0.84).toFixed(0) + "px"};font-size:${fs}px;display:grid;gap:0.8em;color:var(--x-ink);font-family:var(--x-body-font)`, null, host);
    const gate = mk("div", `border:var(--x-edge) solid;border-radius:calc(var(--x-radius) * 0.35);padding:0.9em 1em;background:color-mix(in srgb, ${tone} 8%, var(--x-panel))`, null, wrap);
    // a label that rolls: both texts stacked in one grid cell (the box is as wide as the wider), clipped to one line
    const roll = (a, b, css) => {
      const box = mk("span", `display:inline-grid;overflow:hidden;vertical-align:bottom;height:1.25em;line-height:1.25em;${css || ""}`);
      const A = mk("span", "grid-area:1 / 1;white-space:nowrap", esc(a), box), B = mk("span", "grid-area:1 / 1;white-space:nowrap", esc(b), box);
      return { box, A, B };
    };
    const head = mk("div", `display:flex;justify-content:space-between;align-items:center;gap:1em;font-family:var(--x-label-font);font-weight:var(--x-label-weight);text-transform:var(--x-label-case);letter-spacing:${rtl ? 0 : "0.08em"};font-size:0.62em;color:${tone}`, null, gate);
    mk("span", "white-space:nowrap", esc(L.gate), head);
    const status = roll(L.pending, L[p.outcome]);
    status.box.style.justifyItems = "end";
    head.append(status.box);
    const row = mk("div", "display:flex;align-items:flex-start;gap:0.7em;margin-top:0.75em", null, gate);
    const ic = mk("span", `flex:none;display:flex;width:1.5em;height:1.5em;border-radius:50%;align-items:center;justify-content:center;border:var(--x-edge) solid color-mix(in srgb, ${tone} 50%, transparent);color:${tone}`, `<svg viewBox="0 0 24 24" style="width:1em;height:1em" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>`, row);
    const path = ic.querySelector("path");
    const len = path.getTotalLength ? path.getTotalLength() || 40 : 40;
    path.style.strokeDasharray = `${len}`;
    mk("p", "margin:0;line-height:1.45;font-size:0.82em", esc(own || L.body(owner)), row);
    let metric = null;
    if (p.metric) {
      const audit = mk("div", "display:grid;grid-template-columns:1fr 1fr;border-top:var(--x-edge) solid var(--x-line)", null, wrap);
      const m1 = mk("div", "padding:0.6em 0.2em", `<strong style="display:block;font-size:1.3em;font-variant-numeric:tabular-nums">4 / 4</strong><span style="font-size:0.55em;color:var(--x-dim);text-transform:var(--x-label-case);font-family:var(--x-label-font);letter-spacing:${rtl ? 0 : "0.08em"}">${esc(L.checks)}</span>`, audit);
      const m2 = mk("div", "padding:0.6em 0.2em 0.6em 1em;border-inline-start:var(--x-edge) solid var(--x-line)", null, audit);
      if (rtl) m2.style.padding = "0.6em 1em 0.6em 0.2em";
      metric = roll("1", "0", "font-size:1.3em;font-weight:700;font-variant-numeric:tabular-nums");
      m2.append(metric.box);
      mk("span", `display:block;font-size:0.55em;color:var(--x-dim);text-transform:var(--x-label-case);font-family:var(--x-label-font);letter-spacing:${rtl ? 0 : "0.08em"}`, esc(L.waiting), m2);
      void m1;
    }
    let node = null;
    if (p.next_node) {
      node = mk("div", `display:flex;align-items:center;gap:0.7em;padding:0.7em 0.9em;border:var(--x-edge) solid var(--x-line);border-radius:calc(var(--x-radius) * 0.25);background:var(--x-panel)`, null, wrap);
      node.innerHTML = `<i style="flex:none;width:0.5em;height:0.5em;border-radius:50%;background:var(--x-dim)"></i><span style="flex:1;font-size:0.8em;font-weight:600">${esc(L.next)}</span>`;
      const st = roll(L.nextOff, L.nextOn[p.outcome], "font-family:var(--x-mono-font);font-size:0.62em;color:var(--x-dim)");
      node.append(st.box);
      node.st = st;
    }
    const fb = at + ML.clamp((end - at) * 0.45, 0.8, 2.2);
    const R = Math.min(end - 0.7, Math.max(at + 0.5, p.word ? ctx.word(p.word, fb) : fb));
    ctx.sfx(R, p.outcome === "denied" ? "snap" : p.outcome === "rollback" ? "whoosh.soft" : "click.confirm", 0.5);
    if (node) ctx.sfx(R + 0.45, "tap", 0.25);
    const p3 = (t, a) => ML.out(t, a, a + 0.25);
    const rollAt = (r, t, a) => { const u = p3(t, a); r.A.style.translate = `0 ${(-u * 100).toFixed(2)}%`; r.B.style.translate = `0 ${((1 - u) * 100).toFixed(2)}%`; };
    return {
      draw(t) {
        const vis = ML.show(wrap, t, at, end - 0.25);
        void vis;
        const b = ML.lin(t, R, R + 0.18);
        gate.style.borderColor = `color-mix(in srgb, ${tone} ${(50 + 50 * b).toFixed(1)}%, transparent)`;
        // the pending pulse until release, then steady
        const pulse = t < R ? 0.75 + 0.25 * Math.cos((2 * Math.PI * Math.max(0, t - at)) / p.pending_pulse) : 1;
        status.A.style.opacity = pulse.toFixed(4);
        rollAt(status, t, R);
        const d = ML.out(t, R, R + 0.3);
        path.style.strokeDashoffset = (len * (1 - d)).toFixed(2);
        path.style.opacity = d > 0.001 ? "1" : "0";
        ic.style.background = `color-mix(in srgb, ${tone} ${(d * 14).toFixed(1)}%, transparent)`;
        if (metric) rollAt(metric, t, R + 0.15);
        if (node) {
          const n = ML.ease(t, R + 0.45, R + 0.75);
          node.style.opacity = (0.45 + 0.55 * n).toFixed(4);
          node.style.borderColor = `color-mix(in srgb, ${tone} ${(n * 100).toFixed(1)}%, var(--x-line))`;
          node.firstChild.style.background = `color-mix(in srgb, ${tone} ${(n * 100).toFixed(1)}%, var(--x-dim))`;
          rollAt(node.st, t, R + 0.45);
          node.st.B.style.color = tone;
        }
      },
    };
  },
});
