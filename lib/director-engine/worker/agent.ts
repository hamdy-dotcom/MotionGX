// The director agent: an Anthropic tool loop working the /brag method (method.ts) on one job.
// Tools are sandboxed: the capture folder is read-only (never auth.json, _private or env files), writes go to the job's
// work dir only; the renderer runs locally with no network. Every model call is booked on the job's ledger (tokens, $)
// and the run stops with a clear error once it passes the cost cap. The transcript is saved after every turn so an
// edit ("Edit lines" / "Request a change") resumes the same agent with its plan and work dir.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Ledger } from "../../live-engine/worker/claude";
import { makeMusic } from "../../live-engine/worker/steps/music";
import { clipFrames } from "../../live-engine/worker/steps/clips";
import { prepare, renderVideo, Session, SIZES, smallJpeg } from "./renderer";

export type Ctx = {
  brandDir: string; workDir: string; runDir: string; root: string;
  layout: string; length: number; identity: string[];
  ledger: Ledger; model: string; maxUsd: number;
  log: (l: string) => void; stage: (s: "script" | "build" | "music" | "qa" | "render") => Promise<unknown>;
};

const DENY = /(^|\/)(auth\.json|_private|\.env[^/]*|.*\.pem|.*\.key|secrets?|credentials?)(\/|$)/i;
const TEXT_MAX = 60_000, WRITE_MAX = 2_000_000;
const IMG = /\.(jpe?g|png|webp)$/i;

/** a path inside a root (no escapes through .. or symlinks out of it); capture paths never reach secrets */
function inside(root: string, rel: string, write = false) {
  const p = path.resolve(root, String(rel || ".").replace(/^\/+/, ""));
  const real = fs.existsSync(p) ? fs.realpathSync(p) : path.join(fs.realpathSync(fs.existsSync(path.dirname(p)) ? path.dirname(p) : root), path.basename(p));
  const base = fs.realpathSync(root);
  // the composition's capture/ and sfx/ links are read-only views of the capture / the engine's CC0 sounds
  if (!real.startsWith(base) && !(write === false && /\/(composition)\/(capture|sfx)(\/|$)/.test(p))) throw new Error(`path outside the ${write ? "work" : "allowed"} folder: ${rel}`);
  if (DENY.test(path.relative(root, p))) throw new Error(`not allowed: ${rel}`);
  return p;
}

const TOOLS: Anthropic.Tool[] = [
  { name: "list_files", description: "List a folder. root 'capture' = the product capture (read-only), 'work' = your work dir (composition/, brag-plan.md …).", input_schema: { type: "object", required: ["root"], properties: { root: { type: "string", enum: ["capture", "work"] }, path: { type: "string", description: "folder inside the root (default: the root)" }, depth: { type: "integer", description: "1 (default) or 2" } } } },
  { name: "read_file", description: "Read a file. Text comes back as text (long files are cut; use offset to page). Images (.jpg/.png/.webp) come back as an image you can look at.", input_schema: { type: "object", required: ["root", "path"], properties: { root: { type: "string", enum: ["capture", "work"] }, path: { type: "string" }, offset: { type: "integer", description: "character offset for long text files" } } } },
  { name: "inspect_clone", description: "What a live clone (real captured UI) holds, compactly: its size, its blocks (part:N with box and text), its keys (kN: role, box, text — fields, buttons, stats, titles, images, rows; acted = what the capture did), whether it is a flow's before/after, and its screenshot. Use this, not the raw clone file: the renderer pastes the real UI in by id. Box = [x, y, w, h] in the clone's own px.", input_schema: { type: "object", required: ["id"], properties: { id: { type: "string", description: "clone id, e.g. 03-ai-generated-landing-page, …-before, …-mobile, …-p05" } } } },
  { name: "edit_file", description: "Edit a text file in your work dir by exact replacement — the way to fix the composition after its first version (a few hundred characters instead of resending the whole file). Each find must match exactly once (whitespace included); edits apply in order. Fails without changing the file if any find doesn't match.", input_schema: { type: "object", required: ["path", "edits"], properties: { path: { type: "string" }, edits: { type: "array", items: { type: "object", required: ["find", "replace"], properties: { find: { type: "string" }, replace: { type: "string" } } } } } } },
  { name: "write_file", description: "Write a text file in your work dir (brag-plan.md, composition/video.src.html, composition/*.js|css …). Overwrites.", input_schema: { type: "object", required: ["path", "content"], properties: { path: { type: "string" }, content: { type: "string" } } } },
  { name: "clip_frames", description: "Turn a captured flow clip (capture/clips/<id>.mp4, listed in the inventory) into an image sequence: composition/clipframes/<id>/0001.jpg … at the given fps. Returns the frame count, fps, size and duration.", input_schema: { type: "object", required: ["id"], properties: { id: { type: "string", description: "the screen id whose clip to use" }, fps: { type: "integer", description: "default 15" } } } },
  { name: "set_storyboard", description: "Commit the storyboard from brag-plan.md: writes the studio's script (one entry per scene, with its on-screen headline / sub) and makes the music bed. Durations must sum to the brief's duration. Returns the beat grid and the music's drops. Call again if the storyboard changes.", input_schema: { type: "object", required: ["idea", "mood", "scenes"], properties: {
    idea: { type: "string", description: "the creative angle in one line (the video's title in the studio)" },
    mood: { type: "string", enum: ["driving", "uplifting", "tense-then-release", "chill"], description: "the music bed's mood" },
    scenes: { type: "array", items: { type: "object", required: ["name", "duration", "purpose", "headline"], properties: { name: { type: "string" }, duration: { type: "number", description: "seconds" }, purpose: { type: "string", enum: ["hook", "problem", "reveal", "feature", "proof", "how-it-works", "offer", "cta"] }, headline: { type: "string", description: "the main on-screen line, exactly as shown" }, sub: { type: "string" }, visual: { type: "string", description: "what is shown (captured material ids)" } } } },
  } } },
  { name: "snapshot", description: "Render stills of the composition at the given times (seconds) and look at them; each comes with the automatic check's findings for that frame. Use it on every scene AND mid-transition before the full render. Max 8 times per call.", input_schema: { type: "object", required: ["times"], properties: { times: { type: "array", items: { type: "number" } } } } },
  { name: "check", description: "The gate before render: validates the contract (__duration, __seek, __ready, __sfx) and checks frames across every scene and transition for text off the frame, outside the safe margins, too small, low contrast, overlapping, unblurred personal data, and blank frames. Fix every error and run again.", input_schema: { type: "object", properties: {} } },
  { name: "render_video", description: "Render the full video (every frame at 30fps, the music bed and your SFX mixed) and bake the poster (a settled, postable frame at poster_time) as frame 0. Only after check passes, unless you explain in accept_remaining why a remaining error cannot be fixed.", input_schema: { type: "object", required: ["poster_time"], properties: { poster_time: { type: "number" }, accept_remaining: { type: "string" } } } },
  { name: "finish", description: "Deliver: the share copy (1–3 sentences, postable as-is, in the brief's language) and one sentence on the creative angle. Only after render_video.", input_schema: { type: "object", required: ["share_copy", "angle"], properties: { share_copy: { type: "string" }, angle: { type: "string" } } } },
];

type Block = Anthropic.ContentBlockParam;
const imageBlock = (buf: Buffer): Block => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } });

export class Director {
  messages: Anthropic.MessageParam[] = [];
  done: { share_copy: string; angle: string } | null = null;
  lastCheck: { passed: boolean; errors: number; warnings: number; at: string } | null = null;
  rendered = false;
  private session: Session | null = null;
  private sessionFor = "";
  private client = new Anthropic({ maxRetries: 0 });
  constructor(private c: Ctx, private system: string) {}

  get compDir() { return path.join(this.c.workDir, "composition"); }
  get transcriptFile() { return path.join(this.c.workDir, "transcript.json"); }

  /** a saved run (an edit) — its conversation, minus images */
  resume() {
    if (!fs.existsSync(this.transcriptFile)) return false;
    const t = JSON.parse(fs.readFileSync(this.transcriptFile, "utf8"));
    this.messages = t.messages ?? []; this.lastCheck = null; this.rendered = false;
    return this.messages.length > 0;
  }
  private save() {
    const strip = (m: any) => (Array.isArray(m.content) ? { ...m, content: m.content.map((b: any) => (b.type === "image" ? { type: "text", text: "[image]" } : b.type === "tool_result" && Array.isArray(b.content) ? { ...b, content: b.content.map((x: any) => (x.type === "image" ? { type: "text", text: "[image]" } : x)) } : b)) } : m);
    fs.writeFileSync(this.transcriptFile, JSON.stringify({ model: this.c.model, messages: collapse(this.messages.map(strip)) }, null, 0));
  }
  /** a user turn (merged into the previous one when it is also the user's: the API needs alternating roles) */
  addUser(content: Block[]) {
    const last = this.messages[this.messages.length - 1];
    if (last?.role === "user") last.content = [...(Array.isArray(last.content) ? last.content : [{ type: "text", text: String(last.content) }]), ...content] as any;
    else this.messages.push({ role: "user", content });
  }

  // ── the loop ──
  async run(maxTurns = 70) {
    let nudges = 0;
    for (let turn = 0; turn < maxTurns && !this.done; turn++) {
      if (this.c.ledger.total() >= this.c.maxUsd) throw new Error(`director: cost cap reached — $${this.c.ledger.total().toFixed(2)} of $${this.c.maxUsd} (DIRECTOR_MAX_USD); stopped before the next model call`);
      const res = await this.call();
      this.messages.push({ role: "assistant", content: res.content as any });
      const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      for (const b of res.content) if (b.type === "text" && b.text.trim()) this.c.log(`  ✎ ${b.text.trim().replace(/\s+/g, " ").slice(0, 220)}`);
      if (!uses.length) {
        if (++nudges > 3) throw new Error("director: the agent stopped without calling finish");
        this.addUser([{ type: "text", text: "Continue the run with your tools; call finish when the video is rendered." }]);
        this.save(); continue;
      }
      const results: Block[] = [];
      for (const u of uses) {
        let content: string | Block[];
        let isError = false;
        try { content = await this.tool(u.name, u.input as any); }
        catch (e) { content = `error: ${e instanceof Error ? e.message : String(e)}`.slice(0, 2000); isError = true; }
        this.c.log(`  🛠 ${u.name}${isError ? " ✗" : ""} ${summarize(u.name, u.input)}`);
        results.push({ type: "tool_result", tool_use_id: u.id, content: content as any, ...(isError ? { is_error: true } : {}) });
      }
      this.addUser(results);
      this.save();
      if (this.c.ledger.total() > this.c.maxUsd) throw new Error(`director: cost cap passed — $${this.c.ledger.total().toFixed(2)} of $${this.c.maxUsd} (DIRECTOR_MAX_USD)`);
    }
    if (!this.done) throw new Error(`director: no finish after ${maxTurns} turns`);
    await this.session?.close();
    return this.done;
  }

  /**
   * One model call. The history is copied (never mutated), with every cache_control stripped and images kept only in
   * the latest turn (older ones were reviewed). Then at most 4 cache breakpoints: the system prompt, the tools, and a
   * rolling one on the last block of the latest assistant turn (its text / tool_use) — plus the latest user turn's
   * last block only when that is plain text. Never on a tool_result or an image block.
   */
  private async call() {
    const n = this.messages.length;
    const clean = (b: any, keepImages: boolean): any => {
      const { cache_control: _drop, ...rest } = b ?? {};
      void _drop;
      if (rest.type === "image" && !keepImages) return { type: "text", text: "[image reviewed earlier]" };
      if (rest.type === "tool_result" && Array.isArray(rest.content)) return { ...rest, content: rest.content.map((x: any) => clean(x, keepImages)) };
      return rest;
    };
    const msgs: any[] = collapse(this.messages.map((m, i) => ({ role: m.role, content: Array.isArray(m.content) ? (m.content as any[]).map((b) => clean(b, i === n - 1)) : m.content })));
    const mark = (m: any, ok: (b: any) => boolean) => {
      if (!m || !Array.isArray(m.content) || !m.content.length) return false;
      const k = m.content.length - 1, b = m.content[k];
      if (!ok(b)) return false;
      m.content = m.content.map((x: any, j: number) => (j === k ? { ...x, cache_control: { type: "ephemeral" } } : x));
      return true;
    };
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
    mark(lastAssistant, (b) => b.type === "text" || b.type === "tool_use");
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg?.role === "user") mark(lastMsg, (b) => b.type === "text");
    const tools = TOOLS.map((t, i) => (i === TOOLS.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t)) as any;
    const waits = [2, 5, 15, 30];
    for (let i = 0; ; i++) {
      const t0 = Date.now();
      try {
        const res = await this.client.messages.stream({ model: this.c.model, max_tokens: 24000, system: [{ type: "text", text: this.system, cache_control: { type: "ephemeral" } }], tools, messages: msgs }).finalMessage();
        this.c.ledger.add("director", this.c.model, res.usage as any, Date.now() - t0);
        return res;
      } catch (e: any) {
        const st = e?.status, transient = st == null ? /connection|timed? ?out|ECONN|socket|fetch failed|overloaded/i.test(String(e?.message)) : st >= 500 || [408, 409, 429].includes(st);
        if (!transient || i >= waits.length) throw e;
        this.c.log(`  ↻ director: ${String(e?.message || e).split("\n")[0].slice(0, 90)} — retry ${i + 1}/${waits.length} in ${waits[i]} s`);
        await new Promise((r) => setTimeout(r, waits[i] * 1000));
      }
    }
  }

  // ── tools ──
  private async tool(name: string, a: any): Promise<string | Block[]> {
    const { brandDir, workDir } = this.c;
    const root = (r: string) => (r === "capture" ? brandDir : workDir);
    switch (name) {
      case "list_files": {
        const dir = inside(root(a.root), a.path || ".");
        const out: string[] = [];
        const walk = (d: string, depth: number) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name), rel = path.relative(root(a.root), p); if (DENY.test(rel) || e.name.startsWith(".")) continue; const st = fs.statSync(p); out.push(`${rel}${st.isDirectory() ? "/" : ` (${(st.size / 1024).toFixed(0)} KB)`}`); if (st.isDirectory() && depth > 1 && out.length < 300) walk(p, depth - 1); if (out.length >= 300) return; } };
        walk(dir, Math.min(2, Math.max(1, a.depth || 1)));
        return out.length ? out.join("\n") : "(empty)";
      }
      case "read_file": {
        const p = inside(root(a.root), a.path);
        if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) throw new Error(`no such file: ${a.path}`);
        if (IMG.test(p)) return [imageBlock(await smallJpeg(fs.readFileSync(p), 640)), { type: "text", text: a.path }]; // browsing: 640 px (your own stills come from snapshot)
        const cloneId = a.root === "capture" && /^clones\/[^/]+\.json$/.test(String(a.path).replace(/^\.?\//, "")) ? path.basename(p, ".json") : null;
        if (cloneId && cloneId !== "fonts") return cloneView(brandDir, cloneId);
        const text = fs.readFileSync(p, "utf8"), off = Math.max(0, a.offset || 0);
        return text.length - off > TEXT_MAX ? `${text.slice(off, off + TEXT_MAX)}\n…[cut: ${text.length} characters; read on with offset ${off + TEXT_MAX}]` : text.slice(off);
      }
      case "inspect_clone": return cloneView(brandDir, String(a.id || ""));
      case "edit_file": {
        const p = inside(workDir, a.path, true);
        if (!fs.existsSync(p)) throw new Error(`no such file: ${a.path} (write it first)`);
        let text = fs.readFileSync(p, "utf8");
        const edits = (a.edits || []) as { find: string; replace: string }[];
        if (!edits.length) throw new Error("no edits");
        edits.forEach((e, i) => {
          const n = text.split(String(e.find)).length - 1;
          if (!e.find || n !== 1) throw new Error(`edit ${i + 1}: find matches ${n} times (it must match exactly once) — nothing was changed`);
          text = text.replace(String(e.find), () => String(e.replace ?? ""));
        });
        if (text.length > WRITE_MAX) throw new Error("file too large (2 MB max)");
        fs.writeFileSync(p, text);
        if (/composition\/video\.src\.html$/.test(p)) await this.c.stage("build");
        return `edited ${path.relative(workDir, p)}: ${edits.length} change(s), now ${text.length} characters`;
      }
      case "write_file": {
        const p = inside(workDir, a.path, true), content = String(a.content ?? "");
        if (content.length > WRITE_MAX) throw new Error("file too large (2 MB max)");
        if (/(^|\/)(capture|sfx)(\/|$)/.test(path.relative(workDir, p)) && path.relative(workDir, p).startsWith("composition/")) throw new Error("composition/capture and composition/sfx are read-only");
        fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content);
        if (/composition\/video\.src\.html$/.test(p)) await this.c.stage("build");
        return `wrote ${path.relative(workDir, p)} (${content.length} characters)`;
      }
      case "clip_frames": {
        const brand = JSON.parse(fs.readFileSync(path.join(brandDir, "brand.json"), "utf8"));
        const clip = (brand.screens || []).find((s: any) => s.id === a.id)?.clones?.clip;
        if (!clip) throw new Error(`no clip for ${a.id} (see the inventory's clips)`);
        fs.mkdirSync(this.compDir, { recursive: true });
        const fr = clipFrames({ brandDir, runDir: this.compDir, clip, id: a.id, fps: Math.max(5, Math.min(30, a.fps || 15)) });
        if (!fr) throw new Error("the clip file is missing");
        return `composition/${fr.dir}/0001.jpg … ${String(fr.n).padStart(4, "0")}.jpg — ${fr.n} frames at ${fr.fps} fps (${(fr.n / fr.fps).toFixed(2)} s), ${clip.w}×${clip.h}. Show frame i at time t with img.src = "${fr.dir}/" + String(i).padStart(4, "0") + ".jpg" from __seek. Clip marks (clip seconds, clip px): ${JSON.stringify(clip.marks || []).slice(0, 1200)}`;
      }
      case "set_storyboard": {
        const scenes = (a.scenes || []) as any[], sum = scenes.reduce((x, s) => x + (+s.duration || 0), 0);
        if (!scenes.length) throw new Error("no scenes");
        if (Math.abs(sum - this.c.length) > 0.15) throw new Error(`the scene durations sum to ${sum.toFixed(2)} s; the brief's duration is ${this.c.length} s`);
        let t = 0;
        const script = { idea: String(a.idea || "").slice(0, 200), language: undefined, music: { mood: a.mood, drops: [] as number[] }, length: this.c.length, bpm: 120, engine: "director",
          scenes: scenes.map((s) => { const sc = { start: +t.toFixed(3), bars: +(s.duration / 2).toFixed(4), purpose: s.purpose, headline: String(s.headline || ""), ...(s.sub ? { sub: String(s.sub) } : {}), visual: { type: "director", detail: String(s.visual || s.name || "") }, name: s.name }; t += +s.duration; return sc; }) };
        // the music's drops: the reveal, the offer and the CTA
        script.music.drops = script.scenes.filter((s: any) => ["reveal", "offer", "cta"].includes(s.purpose) && s.start > 0).map((s: any) => Math.round(s.start * 2) / 2);
        fs.writeFileSync(path.join(this.c.runDir, "script.json"), JSON.stringify(script, null, 2));
        await this.c.stage("music");
        const m = makeMusic({ script, file: path.join(this.c.runDir, "music.wav") } as any) as any;
        this.c.log(`  ♪ music: ${a.mood}, 120 BPM, drops at ${(m?.drops || script.music.drops).join(", ")}s`);
        await this.c.stage("build");
        return `script + music written. Music: 120 BPM — a beat every 0.5 s, a bar every 2 s; drops (strongest hits) at ${(m?.drops || script.music.drops).join(", ")} s. Scenes: ${script.scenes.map((s: any) => `${s.name} ${s.start}–${(s.start + s.bars * 2).toFixed(2)}s`).join(" · ")}`;
      }
      case "snapshot": {
        const s = await this.open();
        const times = ((a.times || []) as number[]).slice(0, 8).map((x) => Math.max(0, Math.min(this.c.length - 0.01, +x)));
        const out: Block[] = [];
        for (const t of times) {
          const jpg = await s.still(t), issues = await s.analyze(t);
          fs.mkdirSync(path.join(this.c.workDir, "frames"), { recursive: true }); fs.writeFileSync(path.join(this.c.workDir, "frames", `t${t.toFixed(2)}.jpg`), jpg);
          out.push({ type: "text", text: `t=${t.toFixed(2)}s — ${issues.length ? issues.map((x) => `${x.sev} ${x.code}: ${x.msg}`).join(" | ") : "no findings"}` }, imageBlock(await smallJpeg(jpg)));
        }
        if (s.errors.length) out.push({ type: "text", text: `page errors: ${s.errors.slice(-5).join(" | ")}` });
        return out;
      }
      case "check": {
        await this.c.stage("qa");
        const s = await this.open(), k = await s.contract(), report: string[] = [];
        let errors = 0, warnings = 0;
        const err = (m: string) => { errors++; report.push(`error ${m}`); };
        if (typeof k.d !== "number" || Math.abs(k.d - this.c.length) > 0.05) err(`contract: window.__duration is ${k.d}; it must be ${this.c.length}`);
        if (k.seek !== "function") err("contract: window.__seek is not a function");
        for (const x of k.sfx) if (!fs.existsSync(path.resolve(this.compDir, String(x.src || "")))) err(`contract: sound effect not found: ${x.src}`);
        const script = fs.existsSync(path.join(this.c.runDir, "script.json")) ? JSON.parse(fs.readFileSync(path.join(this.c.runDir, "script.json"), "utf8")) : null;
        if (!script) err("no storyboard: call set_storyboard first");
        const times = new Set<number>([0.1, this.c.length - 0.2]);
        for (const sc of script?.scenes || []) { const e = sc.start + sc.bars * 2; times.add(+(sc.start + (e - sc.start) * 0.6).toFixed(2)); if (e < this.c.length - 0.1) times.add(+(e - 0.12).toFixed(2)); }
        for (const t of [...times].sort((x, y) => x - y)) for (const x of await s.analyze(t)) { if (x.sev === "error") errors++; else warnings++; report.push(`${x.sev} t=${t.toFixed(2)}s ${x.code}: ${x.msg}`); }
        if (s.errors.length) { errors++; report.push(`error page: ${s.errors.slice(-5).join(" | ")}`); }
        this.lastCheck = { passed: errors === 0, errors, warnings, at: new Date().toISOString() };
        fs.writeFileSync(path.join(this.c.runDir, "qa.json"), JSON.stringify({ engine: "director", shipped: "v0", errors, warnings, history: [{ tag: "check", errors, warnings, at: this.lastCheck.at }], issues: report.slice(0, 200).map((m) => ({ sev: m.startsWith("error") ? "error" : "warn", msg: m })) }, null, 2));
        this.c.log(`  ✓ check: ${errors} errors, ${warnings} warnings over ${times.size} frames`);
        return `${errors ? "NOT PASSED" : "PASSED"} — ${errors} errors, ${warnings} warnings over ${times.size} frames.\n${report.slice(0, 80).join("\n")}`;
      }
      case "render_video": {
        if (!this.lastCheck?.passed && !String(a.accept_remaining || "").trim()) throw new Error("check has not passed: fix its errors and run check again (or say in accept_remaining why a remaining error cannot be fixed)");
        await this.c.stage("render");
        this.html();
        await this.session?.close(); this.session = null; this.sessionFor = "";
        const musicFile = path.join(this.c.runDir, "music.wav");
        if (!fs.existsSync(musicFile)) throw new Error("no music bed: call set_storyboard first");
        const r = await renderVideo({ html: path.join(this.compDir, "video.html"), compDir: this.compDir, layout: this.c.layout, duration: this.c.length, musicFile, outFile: path.join(this.c.runDir, "video.mp4"), posterTime: +a.poster_time || 0, log: this.c.log });
        fs.copyFileSync(r.poster, path.join(this.c.workDir, "poster.jpg"));
        if (a.accept_remaining) this.c.log(`  ! rendered with remaining check errors: ${String(a.accept_remaining).slice(0, 200)}`);
        this.rendered = true;
        return [{ type: "text", text: `rendered video.mp4: ${r.frames} frames, ${r.sfx} sound effects mixed, poster baked as frame 0. The poster:` }, imageBlock(await smallJpeg(fs.readFileSync(r.poster)))];
      }
      case "finish": {
        if (!this.rendered) throw new Error("render_video first");
        this.done = { share_copy: String(a.share_copy || "").trim(), angle: String(a.angle || "").trim() };
        fs.writeFileSync(path.join(this.c.workDir, "share-copy.txt"), this.done.share_copy + "\n");
        return "delivered";
      }
    }
    throw new Error(`unknown tool ${name}`);
  }

  /** video.html from the current video.src.html (clones pasted, personal data blurred) */
  private html() {
    const r = prepare({ compDir: this.compDir, brandDir: this.c.brandDir, root: this.c.root, layout: this.c.layout, identity: this.c.identity });
    if (!r.ok) throw new Error(r.error);
  }
  /** a page on the current composition (re-opened whenever the composition changed) */
  private async open() {
    const src = path.join(this.compDir, "video.src.html");
    if (!fs.existsSync(src)) throw new Error("write composition/video.src.html first");
    const stamp = fs.readdirSync(this.compDir).filter((f) => /\.(html|js|css)$/.test(f)).map((f) => `${f}:${fs.statSync(path.join(this.compDir, f)).mtimeMs}`).join("|");
    if (this.session && stamp === this.sessionFor) return this.session;
    await this.session?.close();
    this.html();
    const [W, H] = SIZES[this.c.layout] || SIZES["9:16"];
    this.session = await Session.open(path.join(this.compDir, "video.html"), W, H);
    this.sessionFor = stamp;
    return this.session;
  }
}

/**
 * One copy of each file in the history: a read_file result is collapsed once the same file is read or written again
 * later; a write_file's content once the same file is written or read again later (edits after a write keep it — the
 * agent's edits need the text it wrote). Collapsed copies become one line; the latest version is always there.
 */
export function collapse(messages: any[]) {
  const key = (u: any) => (u.name === "read_file" ? `${u.input?.root}:${String(u.input?.path || "").replace(/^\.?\//, "")}` : ["write_file", "edit_file"].includes(u.name) ? `work:${String(u.input?.path || "").replace(/^\.?\//, "")}` : null);
  const uses = new Map<string, any>(), events: { pos: number; key: string; kind: string; id: string }[] = [];
  let pos = 0;
  for (const m of messages) if (Array.isArray(m.content)) for (const b of m.content) { pos++; if (b.type === "tool_use") { uses.set(b.id, b); const k = key(b); if (k) events.push({ pos, key: k, kind: b.name, id: b.id }); } }
  const laterFor = (e: { pos: number; key: string }, kinds: string[]) => events.some((x) => x.key === e.key && x.pos > e.pos && kinds.includes(x.kind));
  const staleRead = new Set(events.filter((e) => e.kind === "read_file" && laterFor(e, ["read_file", "write_file"])).map((e) => e.id));
  const staleWrite = new Set(events.filter((e) => e.kind === "write_file" && laterFor(e, ["read_file", "write_file"])).map((e) => e.id));
  if (!staleRead.size && !staleWrite.size) return messages;
  return messages.map((m) => (!Array.isArray(m.content) ? m : { ...m, content: m.content.map((b: any) => {
    if (b.type === "tool_use" && staleWrite.has(b.id)) return { ...b, input: { ...b.input, content: `[old version of ${b.input?.path} — ${String(b.input?.content || "").length} characters; a later version was written or read]` } };
    if (b.type === "tool_result" && staleRead.has(b.tool_use_id) && typeof b.content === "string" && b.content.length > 400) { const u = uses.get(b.tool_use_id); return { ...b, content: `[old copy of ${u?.input?.root}:${u?.input?.path} — the current version was read or written later]` }; }
    return b;
  }) }));
}

/** a clone, compactly: size, blocks, keys (what K.focus / K.typeInto / K.tap can target), flow role, screenshot */
export function cloneView(brandDir: string, id: string) {
  const f = path.join(brandDir, "clones", `${id}.json`);
  if (!/^[\w.-]+$/.test(id) || !fs.existsSync(f)) throw new Error(`no clone ${id} (see the inventory's clone ids)`);
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  const brand = fs.existsSync(path.join(brandDir, "brand.json")) ? JSON.parse(fs.readFileSync(path.join(brandDir, "brand.json"), "utf8")) : {};
  const screen = (brand.screens || []).find((s: any) => [s.id, `${s.id}-before`, `${s.id}-mobile`].includes(id) || id.startsWith(`${s.id}-p`));
  const part = (brand.parts || []).find((p: any) => p.id === id);
  const box = (b: number[]) => `[${(b || []).map((v) => Math.round(v)).join(",")}]`, t = (s: any, n = 60) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const keys = (c.keys || []) as any[], parts = keys.filter((k) => k.part != null);
  const lines = [
    `clone ${id}: ${c.w}×${c.h} px · ${c.label || ""}${c.action ? ` · flow before-screen (the capture did: ${t(c.action, 80)})` : ""}${c.leads_to ? ` → ${c.leads_to}` : ""}${c.dir ? ` · dir ${c.dir}` : ""}`,
    screen ? `screenshot: capture/${screen.view || screen.file} · shows: ${t(screen.shows, 120)}` : part ? `block image: capture/${part.file} · shows: ${t(part.shows, 120)}` : "",
    `blocks (${parts.length}): ${parts.slice(0, 40).map((p) => `part:${p.part} ${box(p.box)} «${t(p.text, 50)}»`).join(" · ") || "none"}`,
    `keys (${keys.length - parts.length}):`,
    ...keys.filter((k) => k.part == null).slice(0, 120).map((k) => `  ${k.k} ${k.role}${k.acted ? ` (acted: ${k.acted})` : ""} ${box(k.box)}${k.text ? ` «${t(k.text)}»` : ""}`),
  ];
  return lines.filter(Boolean).join("\n");
}

function summarize(name: string, a: any) {
  if (name === "write_file") return `${a.path} (${String(a.content || "").length} ch)`;
  if (name === "edit_file") return `${a.path} (${(a.edits || []).length} edits)`;
  if (name === "inspect_clone") return a.id;
  if (name === "read_file" || name === "list_files") return `${a.root}:${a.path || "."}`;
  if (name === "snapshot") return JSON.stringify(a.times);
  if (name === "set_storyboard") return `${(a.scenes || []).length} scenes · ${a.mood}`;
  if (name === "render_video") return `poster ${a.poster_time}s`;
  return name === "clip_frames" ? a.id : "";
}
