// Worker ↔ app: progress reports, signed-URL uploads/downloads, packed brand folders, the SMS-code wait.
// The worker never holds a Supabase key: every file goes through a URL the app signed for this job.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { JobFile, LedgerRow, Report, Step } from "../protocol";

const PART_BYTES = 45 * 1024 * 1024; // Supabase's default per-file limit is 50 MB
const WAITS = [2, 5, 15, 30]; // storage transfers: retries after these seconds (network errors, 5xx, 429)

export class Sync {
  private buffer: string[] = [];
  private timer: NodeJS.Timeout | null = null;
  constructor(
    private job: JobFile,
    private dirs: { root: string; brandDir: string; runDir: string },
  ) {}

  private queue: Promise<unknown> = Promise.resolve();
  /** reports that failed (after their own retries) back to back, and SMS-code polls that failed back to back */
  private failedInARow = 0;
  private pollsFailedInARow = 0;
  /** steps finished here, and the ones the app has acknowledged (a resume starts after the acknowledged ones) */
  private finished: Step[] = [];
  private acknowledged: Step[] = [];

  /**
   * The app is gone (dev server stopped, deployment down, or this job was relaunched and our token replaced):
   * stop instead of spending more. The app resumes the job from the last step it acknowledged.
   */
  private stopForGood(why: string): never {
    const state = { stoppedAt: new Date().toISOString(), why, jobId: this.job.jobId, finishedHere: this.finished, acknowledgedByApp: this.acknowledged, resumesAfter: this.acknowledged.at(-1) ?? null };
    try {
      fs.writeFileSync(path.join(this.dirs.root, "STOPPED.json"), JSON.stringify(state, null, 2));
    } catch {}
    console.error(`■ worker stopped: ${why} — state saved to STOPPED.json; the app resumes after ${state.resumesAfter ?? "the start"}`);
    process.exit(75);
  }

  /** reports go out one at a time, in order (the app appends log/ledger rows to the job row) */
  private post<T = unknown>(body: Report): Promise<T> {
    const next = this.queue.then(() => this.send<T>(body));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async send<T = unknown>(body: Report): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetch(this.job.callbackUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${this.job.token}` }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
        const out = (await r.json()) as T;
        this.failedInARow = 0;
        return out;
      } catch (err) {
        if (attempt >= 4) {
          // 3 reports in a row could not reach the app (each after its own 5 tries): the app is gone
          if (++this.failedInARow >= 3) this.stopForGood(`3 reports in a row failed (last: ${body.type}: ${err instanceof Error ? err.message : err})`);
          throw new Error(`callback ${body.type} failed: ${err instanceof Error ? err.message : err}`);
        }
        await new Promise((ok) => setTimeout(ok, 1500 * (attempt + 1)));
      }
    }
  }

  /** the sandbox's log(): printed, and sent to the app in small batches */
  log = (line: string) => {
    console.log(line);
    this.buffer.push(...String(line).split("\n"));
    this.timer ??= setTimeout(() => void this.flush(), 2000);
  };

  async flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const lines = this.buffer.splice(0);
    if (lines.length) await this.post({ type: "log", lines }).catch((e) => console.error(String(e)));
  }

  stage = (stage: Step) => this.post({ type: "stage", stage });
  ledgerRow = (row: LedgerRow) => this.post({ type: "ledger", row });
  stepDone = async (step: Step, info?: Record<string, unknown>) => {
    this.finished.push(step);
    await this.flush();
    await this.post({ type: "step_done", step, info });
    this.acknowledged.push(step);
  };
  done = async (summary: Record<string, unknown>) => {
    await this.flush();
    await this.post({ type: "done", summary });
  };
  failed = async (error: string) => {
    await this.flush().catch(() => {});
    await this.post({ type: "failed", error: error.slice(0, 2000) });
  };

  /** the sandbox's askCode: ask the human (the studio shows an input), wait up to 10 minutes */
  askCode = async (sentTo: string): Promise<string | null> => {
    await this.flush();
    await this.post({ type: "ask", sent_to: sentTo });
    const end = Date.now() + 10 * 60 * 1000;
    while (Date.now() < end) {
      await new Promise((ok) => setTimeout(ok, 3000));
      const r = await fetch(`${this.job.callbackUrl}?ask=1`, { headers: { authorization: `Bearer ${this.job.token}` } }).catch(() => null);
      // ~1 minute without the app while waiting for a code (polls every 3 s): the app is gone
      if (!r?.ok) {
        if (++this.pollsFailedInARow >= 20) this.stopForGood("the app stopped answering while waiting for the SMS code");
        continue;
      }
      this.pollsFailedInARow = 0;
      const j = (await r.json()) as { answered: boolean; answer: string | null };
      if (j.answered) return j.answer?.trim() || null;
    }
    return null;
  };

  /** a storage transfer (signed PUT / GET): retried on network errors, 5xx and 429 — 4 more tries after 2, 5, 15, 30 s, each
   *  logged as ↻; a 4xx answer is final. Throws a clear error once the tries are used up. */
  /** set after the first network error: a slow / unstable link gets one transfer at a time (parallel ones starve each other) */
  private oneAtATime = false;
  private async transfer(label: string, go: () => Promise<Response>): Promise<Response> {
    for (let i = 0; ; i++) {
      const r = await go().catch((e: Error) => e);
      if (!(r instanceof Error) && r.ok) return r;
      if (r instanceof Error && !this.oneAtATime) { this.oneAtATime = true; this.log("  ⇣ network trouble — transfers continue one at a time"); }
      const why = r instanceof Error ? `${r.message}${(r as Error & { cause?: { code?: string } }).cause?.code ? ` (${(r as Error & { cause?: { code?: string } }).cause!.code})` : ""}` : `${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`;
      const final = !(r instanceof Error) && r.status < 500 && r.status !== 429;
      if (final || i >= WAITS.length) throw new Error(`${label} failed after ${i + 1} tries: ${why}`);
      this.log(`  ↻ ${label}: ${why} — retry ${i + 1}/${WAITS.length} in ${WAITS[i]} s`);
      await new Promise((ok) => setTimeout(ok, WAITS[i] * 1000));
    }
  }

  /** local file for a logical path (brand/…, run/…, private/auth.json) */
  local(logical: string) {
    const [root, ...rest] = logical.split("/");
    const rel = rest.join("/");
    if (root === "brand") return path.join(this.dirs.brandDir, rel);
    if (root === "private") return path.join(this.dirs.brandDir, rel);
    if (root === "run") return path.join(this.dirs.runDir, rel);
    throw new Error(`bad logical path ${logical}`);
  }

  /** upload files: logical paths → signed upload URLs from the app → PUT */
  /**
   * upload files: logical paths → signed upload URLs from the app → PUT, up to 6 at once (each with retry/backoff).
   * One log line per phase: "upload: N files, X MB, Y s".
   */
  async upload(files: { logical: string; file: string }[], phase = "files") {
    if (!files.length) return;
    const t0 = Date.now();
    let bytes = 0;
    for (let i = 0; i < files.length; i += 40) {
      const batch = files.slice(i, i + 40);
      const { urls } = await this.post<{ urls: { path: string; url: string }[] }>({ type: "upload", paths: batch.map((f) => f.logical) });
      const jobs = batch.map((f) => {
        const u = urls.find((x) => x.path === f.logical);
        if (!u) throw new Error(`no upload URL for ${f.logical}`);
        return { f, url: u.url };
      });
      let next = 0;
      const worker = async (w: number) => {
        while (next < jobs.length) {
          if (this.oneAtATime && w > 0) return; // after a network error only the first lane keeps going
          const { f, url } = jobs[next++];
          const body = fs.readFileSync(f.file);
          bytes += body.length;
          // network blips must not lose a finished step: retried with backoff (a 4xx answer is final)
          await this.transfer(`upload ${f.logical}`, () => fetch(url, { method: "PUT", headers: { "content-type": contentType(f.file), "x-upsert": "true" }, body }));
        }
      };
      await Promise.all(Array.from({ length: Math.min(this.oneAtATime ? 1 : 6, jobs.length) }, (_, w) => worker(w)));
    }
    this.log(`  upload (${phase}): ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }

  /** upload run files by name (relative to runDir) that exist */
  uploadRun(names: string[]) {
    return this.upload(names.filter((n) => fs.existsSync(path.join(this.dirs.runDir, n))).map((n) => ({ logical: `run/${n}`, file: path.join(this.dirs.runDir, n) })), `run: ${names.join(", ")}`);
  }

  /** pack brand folders (one .tgz per top-level folder, split above 45 MB) + top-level files; auth.json goes private */
  async uploadBrand(onlyFolders?: string[], files: string[] = ["capture.json", "brand.json"], except: string[] = []) {
    const b = this.dirs.brandDir;
    const tmp = path.join(this.dirs.root, ".pack");
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const out: { logical: string; file: string }[] = [];
    const folders = fs.readdirSync(b, { withFileTypes: true }).filter((d) => d.isDirectory() && (!onlyFolders || onlyFolders.includes(d.name)) && !except.includes(d.name)).map((d) => d.name);
    for (const dir of folders) {
      const tgz = path.join(tmp, `${dir}.tgz`);
      execFileSync("tar", ["-czf", tgz, "-C", b, dir]);
      const size = fs.statSync(tgz).size;
      if (size <= PART_BYTES) out.push({ logical: `brand/_pack/${dir}.tgz`, file: tgz });
      else {
        const fd = fs.openSync(tgz, "r");
        for (let off = 0, n = 0; off < size; off += PART_BYTES, n++) {
          const len = Math.min(PART_BYTES, size - off);
          const buf = Buffer.alloc(len);
          fs.readSync(fd, buf, 0, len, off);
          const part = `${tgz}.part${String(n).padStart(2, "0")}`;
          fs.writeFileSync(part, buf);
          out.push({ logical: `brand/_pack/${dir}.tgz.part${String(n).padStart(2, "0")}`, file: part });
        }
        fs.closeSync(fd);
      }
    }
    for (const f of files) if (fs.existsSync(path.join(b, f))) out.push({ logical: `brand/${f}`, file: path.join(b, f) });
    if (!onlyFolders && fs.existsSync(path.join(b, "auth.json"))) out.push({ logical: "private/auth.json", file: path.join(b, "auth.json") });
    await this.upload(out, onlyFolders ? `brand packs: ${onlyFolders.join(", ")}` : "brand packs");
    fs.rmSync(tmp, { recursive: true, force: true });
    return out.map((o) => o.logical);
  }

  /**
   * The files the app shows, one by one (the packs stay the resume copy): the brand-files panel (logo, screen previews,
   * UI-block previews, image library, the agent's step screenshots + trace) and the brand card's homepage hero (its
   * live UI clone, fonts.css and the assets that clone uses). Nothing else.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async uploadDisplay(brand: any, manifest: any) {
    const b = this.dirs.brandDir;
    const rels = new Set<string>();
    const add = (r?: string | null) => r && rels.add(r);
    add(brand?.logo?.file);
    for (const s of brand?.screens ?? []) add(s.view);
    for (const p of brand?.parts ?? []) add(p.file);
    for (const im of brand?.images ?? []) add(im.file);
    const agent = path.join(b, "agent");
    if (fs.existsSync(agent)) for (const f of fs.readdirSync(agent)) if (/^\d+\.jpg$|^trace\.json$/.test(f)) add(`agent/${f}`);
    const hero = manifest?.pages?.[0]?.clones?.screen?.file;
    if (hero && fs.existsSync(path.join(b, hero))) {
      add(hero);
      add("clones/fonts.css");
      const used = fs.readFileSync(path.join(b, hero), "utf8") + (fs.existsSync(path.join(b, "clones/fonts.css")) ? fs.readFileSync(path.join(b, "clones/fonts.css"), "utf8") : "");
      for (const m of used.matchAll(/\{\{B\}\}\/([^"'()\s\\]+)/g)) add(m[1]);
    }
    // storage keys must be plain ASCII: a file named after an Arabic page title stays in the packs only
    const out = [...rels].filter((r) => /^[\w./ -]+$/.test(r) && fs.existsSync(path.join(b, r))).map((r) => ({ logical: `brand/${r}`, file: path.join(b, r) }));
    await this.upload(out, "brand files");
    return out.length;
  }

  /** fetch every download of the job; packed folders are re-joined and extracted into the brand folder */
  async downloadAll() {
    const packs = new Map<string, { n: number; file: string }[]>();
    const tmp = path.join(this.dirs.root, ".unpack");
    fs.mkdirSync(tmp, { recursive: true });
    for (const d of this.job.downloads) {
      const r = await this.transfer(`download ${d.path}`, () => fetch(d.url));
      const buf = Buffer.from(await r.arrayBuffer());
      const m = d.path.match(/^brand\/_pack\/(.+?\.tgz)(?:\.part(\d+))?$/);
      if (m) {
        const file = path.join(tmp, path.basename(d.path));
        fs.writeFileSync(file, buf);
        packs.set(m[1], [...(packs.get(m[1]) ?? []), { n: Number(m[2] ?? 0), file }]);
        continue;
      }
      const dest = this.local(d.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
    }
    fs.mkdirSync(this.dirs.brandDir, { recursive: true });
    for (const [name, parts] of packs) {
      const joined = path.join(tmp, name);
      fs.writeFileSync(joined, Buffer.concat(parts.sort((a, b) => a.n - b.n).map((p) => fs.readFileSync(p.file))));
      execFileSync("tar", ["-xzf", joined, "-C", this.dirs.brandDir]);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const TYPES: Record<string, string> = { ".json": "application/json", ".html": "text/html; charset=utf-8", ".css": "text/css", ".mp4": "video/mp4", ".wav": "audio/wav", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".tgz": "application/gzip" };
const contentType = (f: string) => TYPES[path.extname(f).toLowerCase()] ?? "application/octet-stream";
