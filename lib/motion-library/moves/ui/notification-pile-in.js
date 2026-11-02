// Notifications pile in at angles: message / email / task notifications (a 260×56 white card, radius 10, soft shadow
// 0 6px 16px, a 20 px app icon, a bold title and two 9 px lines) slide in one after another from y +30 px, opacity
// 0 → 1, their rotation settling to ±2–4° on back.out(1.4) in 0.45 s, a 0.25 s stagger, resting in a loose diagonal
// stair (top-left, middle-right, bottom-left) or a messy stack, then drift ±2 px while they wait. Every size is a share
// of the card (scaled from the source's 260 px), every colour a look variable; RTL mirrors the stair and the rows.
// When it targets a list, the list's items become the notification titles. Every frame is a function of t.
// Source: prompt-motion wozu-co "the prompt I used" (reference only — our own code).
ML.define({
  id: "ui.notification-pile-in",
  category: "ui",
  name: "Notifications pile in at angles",
  does: "Message, email or task notifications slide in one after another and rest at slight tilts in a loose stair, showing requests piling up.",
  says: ["problem", "list", "urgency"],
  energy: 2,
  targets: ["card", "list"],
  duration: [1.2, 3],
  params: {
    count: { type: "number", range: [2, 6], default: 3 },
    source: { type: "choice", options: ["messages", "emails", "tasks"], default: "messages" },
    layout: { type: "choice", options: ["stair", "stack"], default: "stair" },
    stagger: { type: "number", range: [0.15, 0.5], default: 0.25, unit: "s" },
    tilt: { type: "number", range: [0, 6], default: 3, unit: "deg" },
    drift: { type: "bool", default: true },
    items: { type: "text" }, // "Title|line; Title|line" — overrides the sample notifications
  },
  pairs: ["ui.notification-stack", "text-in.punchline", "ui.incoming-call-card"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:wozu-co-the-prompt-i-used", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    if (el && el.clientWidth > 420 && el.clientHeight > 320) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }

    // what the notifications say
    const SAMPLES = {
      messages: {
        en: [["Sara", "Hey, can you send the invoice today?", "The client keeps asking."], ["Omar", "Did you see my last message?", "Need an answer before 5."], ["Lina", "Quick favour — can you check the deck?", "It's due tomorrow."], ["Karim", "Are we still on for the call?", "Moving it to 3 pm?"], ["Nour", "Sent you the files again", "Let me know if they open."], ["Team", "3 new messages", "Who's handling the order?"]],
        ar: [["سارة", "ممكن تبعت الفاتورة النهارده؟", "العميل بيسأل تاني."], ["عمر", "شفت رسالتي الأخيرة؟", "محتاج رد قبل الخمسة."], ["لينا", "ممكن تراجع العرض بسرعة؟", "مطلوب بكرة."], ["كريم", "لسه المكالمة في معادها؟", "نخليها الساعة ٣؟"], ["نور", "بعتلك الملفات تاني", "قولّي لو فتحت."], ["الفريق", "٣ رسائل جديدة", "مين ماسك الطلب؟"]],
      },
      emails: {
        en: [["Re: Invoice #1042", "Following up on the payment", "from last week's order."], ["Action needed", "Your report is overdue", "Please submit by Friday."], ["Meeting request", "Can we sync on Q3 plans?", "Proposed: Tue 10:00."], ["Customer complaint", "Order arrived damaged", "Requesting a refund."], ["Contract review", "Please sign the attached", "before the deadline."], ["Weekly digest", "12 unread threads", "4 marked urgent."]],
        ar: [["رد: فاتورة ١٠٤٢", "متابعة بخصوص الدفع", "عن طلب الأسبوع اللي فات."], ["مطلوب إجراء", "التقرير متأخر", "سلّمه قبل الجمعة."], ["طلب اجتماع", "نتكلم عن خطة الربع الجاي؟", "المقترح: التلات ١٠."], ["شكوى عميل", "الطلب وصل مكسور", "عايز يسترد فلوسه."], ["مراجعة عقد", "وقّع المرفق", "قبل آخر معاد."], ["ملخص الأسبوع", "١٢ رسالة مش مقروءة", "٤ منهم عاجلين."]],
      },
      tasks: {
        en: [["Due today", "Send the quote to Acme", "Assigned to you."], ["Overdue", "Update the price list", "2 days late."], ["Reminder", "Call the supplier back", "At 4:30 pm."], ["New task", "Approve the new design", "From the design team."], ["Due tomorrow", "Prepare the stock report", "Shared with 3 people."], ["Blocked", "Waiting on the payment", "Follow up with finance."]],
        ar: [["مطلوب النهارده", "ابعت عرض السعر للعميل", "متكلّف بيها إنت."], ["متأخرة", "حدّث قائمة الأسعار", "متأخرة يومين."], ["تذكير", "كلّم المورّد تاني", "الساعة ٤:٣٠."], ["مهمة جديدة", "وافق على التصميم الجديد", "من فريق التصميم."], ["مطلوبة بكرة", "جهّز تقرير المخزون", "مشتركة مع ٣."], ["واقفة", "مستني الدفعة", "تابع مع الحسابات."]],
      },
    };
    const S = SAMPLES[p.source] || SAMPLES.messages;
    const n = Math.round(ML.clamp(+p.count || 3, 2, 6));
    let list = (rtl ? S.ar : S.en).slice();
    const given = String(p.items || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => { const [a, b, c] = x.split("|"); return [a || "", b || "", c || ""]; });
    if (given.length) list = given.concat(list.slice(given.length));
    else if (el && el.children.length > 1) [...el.children].slice(0, 6).forEach((c, i) => { const tx = (c.textContent || "").trim(); if (tx) list[i] = [tx, list[i][1], list[i][2]]; });
    else if (el && (el.textContent || "").trim().length <= 40 && el.textContent.trim()) list[0] = [el.textContent.trim(), list[0][1], list[0][2]];
    const items = Array.from({ length: n }, (_, i) => list[i % list.length]);
    // its words now ride on the cards: the target's own content steps aside, so nothing shows twice
    if (el) { if (host === el) { [...el.children].forEach((c) => { c.style.visibility = "hidden"; }); el.style.color = "transparent"; } else el.style.visibility = "hidden"; }

    // the card: 260 × 56 in the source; everything scales from it
    const cw = Math.min(R.w * (f.wide ? 0.5 : 0.66), R.h * 1.1, 620 * k);
    const u = cw / 260;
    const ICON = {
      messages: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="currentColor"/>',
      emails: '<path d="M3 6h18v12H3z" fill="currentColor"/><path d="M3.5 6.5 12 13l8.5-6.5" stroke="var(--x-panel)" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
      tasks: '<rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor"/><path d="M8 12.5l2.6 2.6L16.5 9" stroke="var(--x-panel)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    }[p.source] || "";
    const tint = p.source === "tasks" ? "var(--x-good)" : p.source === "emails" ? "var(--x-accent-2)" : "var(--x-accent)";
    const line = (size, weight, color) => `font:${weight} ${(size * u).toFixed(2)}px/1.3 var(--x-body-font);color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    const cards = items.map((it, i) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${cw.toFixed(1)}px;box-sizing:border-box;padding:${(9 * u).toFixed(2)}px ${(11 * u).toFixed(2)}px;display:flex;gap:${(9 * u).toFixed(2)}px;align-items:flex-start;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * ${((10 / 30) * u).toFixed(3)});box-shadow:0 ${(6 * u).toFixed(1)}px ${(16 * u).toFixed(1)}px color-mix(in srgb, var(--x-ink) 9%, transparent), var(--x-shadow);z-index:${6 + i};pointer-events:none;opacity:0;`, host);
      c.dir = rtl ? "rtl" : "ltr";
      const ic = mk("div", `flex:none;width:${(20 * u).toFixed(2)}px;height:${(20 * u).toFixed(2)}px;border-radius:calc(var(--x-radius) * ${((5.5 / 30) * u).toFixed(3)});background:color-mix(in srgb, ${tint} 14%, var(--x-panel));color:${tint};display:grid;place-items:center;`, c);
      ic.innerHTML = `<svg viewBox="0 0 24 24" width="70%" height="70%">${ICON}</svg>`;
      const tx = mk("div", "flex:1;min-width:0;display:flex;flex-direction:column;", c);
      const head = mk("div", `display:flex;justify-content:space-between;gap:${(6 * u).toFixed(2)}px;align-items:baseline;`, tx);
      mk("div", line(10.5, 700, "var(--x-ink)"), head, it[0]);
      mk("div", line(8, 400, "var(--x-dim)") + "flex:none;", head, rtl ? "الآن" : "now");
      mk("div", line(9, 400, "var(--x-ink)"), tx, it[1]);
      if (it[2]) mk("div", line(9, 400, "var(--x-dim)"), tx, it[2]);
      return c;
    });
    const ch = Math.max(...cards.map((c) => c.offsetHeight));

    // where each rests: a loose diagonal stair (start side, far side, start side …) or a messy stack
    const dir = rtl ? -1 : 1;
    const cx = R.x + R.w / 2 - cw / 2;
    const spread = Math.max(0, Math.min(R.w * 0.16, (R.w - cw) / 2 - 12 * k));
    let stepY, x0;
    if (p.layout === "stack") stepY = Math.min(ch * 0.42, (R.h - ch) / Math.max(1, n - 1));
    else stepY = Math.min(ch * 1.18, (R.h - ch) / Math.max(1, n - 1));
    const totalH = ch + stepY * (n - 1);
    const y0 = R.y + (R.h - totalH) / 2;
    const rest = cards.map((_, i) => {
      const side = i % 2 === 0 ? -1 : 1; // start side first
      const jitter = (ML.rnd(i + 1, 3) - 0.5) * 2;
      x0 = p.layout === "stack" ? cx + dir * jitter * Math.min(spread, R.w * 0.04) : cx + dir * side * spread * (0.85 + 0.15 * ML.rnd(i + 1, 5));
      const rot = (p.layout === "stack" ? jitter : side) * dir * p.tilt * (0.67 + 0.33 * ML.rnd(i + 1, 7));
      return { x: x0, y: y0 + i * stepY, rot };
    });
    // timing: one card per stagger, all in before the scene's last stretch
    const room = Math.max(0.2, end - at - 0.9);
    const st = Math.min(p.stagger, room / Math.max(1, n - 1));
    const T = cards.map((_, i) => at + 0.05 + i * st);
    T.forEach((t, i) => ctx.sfx(t, "pop", i === 0 ? 0.35 : 0.25));
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        cards.forEach((c, i) => {
          const r = rest[i], a = T[i];
          if (t < a) { c.style.opacity = "0"; c.style.visibility = "hidden"; return; }
          c.style.visibility = "visible";
          const e = ML.back(t, a, a + 0.45, 1.4); // back.out(1.4)
          const o = ML.lin(t, a, a + 0.18) * (1 - leave);
          const drift = p.drift ? 2 * u * Math.sin((t - a) * 2.4 + i * 1.7) * ML.lin(t, a + 0.45, a + 0.9) : 0;
          const rot = r.rot + (1 - e) * Math.sign(r.rot || 1) * 7;
          const y = r.y + (1 - e) * 30 * u + drift - leave * 12 * u;
          c.style.opacity = o.toFixed(4);
          c.style.transform = `translate(${r.x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
        });
      },
    };
  },
});
