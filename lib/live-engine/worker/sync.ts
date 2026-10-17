// Worker ↔ app: progress reports, signed-URL uploads/downloads, packed brand folders, the SMS-code wait.
// The worker never holds a Supabase key: every file goes through a URL the app signed for this job.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { JobFile, LedgerRow, Report, Step } from "../protocol";

const PART_BYTES = 45 * 1024 * 1024; // Supabase's default per-file limit is 50 MB

export class Sync {
  private buffer: string[] = [];
  private timer: NodeJS.Timeout | null = null;
  constructor(
    private job: JobFile,
    private dirs: { root: string; brandDir: string; runDir: string },
  ) {}

  private queue: Promise<unknown> = Promise.resolve();

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
        return (await r.json()) as T;
      } catch (err) {
        if (attempt >= 4) throw new Error(`callback ${body.type} failed: ${err instanceof Error ? err.message : err}`);
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
    await this.flush();
    await this.post({ type: "step_done", step, info });
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
      if (!r?.ok) continue;
      const j = (await r.json()) as { answered: boolean; answer: string | null };
      if (j.answered) return j.answer?.trim() || null;
    }
    return null;
  };

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
  async upload(files: { logical: string; file: string }[]) {
    if (!files.length) return;
    for (let i = 0; i < files.length; i += 40) {
      const batch = files.slice(i, i + 40);
      const { urls } = await this.post<{ urls: { path: string; url: string }[] }>({ type: "upload", paths: batch.map((f) => f.logical) });
      for (const f of batch) {
        const u = urls.find((x) => x.path === f.logical);
        if (!u) throw new Error(`no upload URL for ${f.logical}`);
        const body = fs.readFileSync(f.file);
        const r = await fetch(u.url, { method: "PUT", headers: { "content-type": contentType(f.file), "x-upsert": "true" }, body });
        if (!r.ok) throw new Error(`upload ${f.logical}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      }
    }
  }

  /** upload run files by name (relative to runDir) that exist */
  uploadRun(names: string[]) {
    return this.upload(names.filter((n) => fs.existsSync(path.join(this.dirs.runDir, n))).map((n) => ({ logical: `run/${n}`, file: path.join(this.dirs.runDir, n) })));
  }

  /** pack brand folders (one .tgz per top-level folder, split above 45 MB) + top-level files; auth.json goes private */
  async uploadBrand(onlyFolders?: string[], files: string[] = ["capture.json", "brand.json"]) {
    const b = this.dirs.brandDir;
    const tmp = path.join(this.dirs.root, ".pack");
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const out: { logical: string; file: string }[] = [];
    const folders = fs.readdirSync(b, { withFileTypes: true }).filter((d) => d.isDirectory() && (!onlyFolders || onlyFolders.includes(d.name))).map((d) => d.name);
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
    await this.upload(out);
    fs.rmSync(tmp, { recursive: true, force: true });
    return out.map((o) => o.logical);
  }

  /** the brand files the app shows ("ملفات البراند"): every file under these folders, one by one (the packs stay the resume copy) */
  async uploadBrandFiles(folders: string[]) {
    const b = this.dirs.brandDir;
    const out: { logical: string; file: string }[] = [];
    const walk = (rel: string) => {
      const abs = path.join(b, rel);
      if (!fs.existsSync(abs)) return;
      for (const d of fs.readdirSync(abs, { withFileTypes: true })) {
        const r = `${rel}/${d.name}`;
        if (d.isDirectory()) walk(r);
        else if (/\.(jpe?g|png|webp|gif|svg|ico|json|css|woff2?|ttf|otf)$/i.test(d.name)) out.push({ logical: `brand/${r}`, file: path.join(b, r) });
      }
    };
    folders.forEach(walk);
    await this.upload(out);
    return out.length;
  }

  /** fetch every download of the job; packed folders are re-joined and extracted into the brand folder */
  async downloadAll() {
    const packs = new Map<string, { n: number; file: string }[]>();
    const tmp = path.join(this.dirs.root, ".unpack");
    fs.mkdirSync(tmp, { recursive: true });
    for (const d of this.job.downloads) {
      const r = await fetch(d.url);
      if (!r.ok) throw new Error(`download ${d.path}: ${r.status}`);
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
