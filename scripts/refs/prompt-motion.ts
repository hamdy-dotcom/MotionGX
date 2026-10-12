// Collects prompt-motion.com entries as INTERNAL inspiration for the creative director.
//   npx tsx --tsconfig tsconfig.scripts.json scripts/refs/prompt-motion.ts            → scripts/refs/cache/entries.json
//   … prompt-motion.ts --cards                                                          → + technique cards → scripts/refs/prompt-motion.json
//
// Etiquette: honours robots.txt (Allow /, Disallow /api/; Content-Signal search=yes, ai-train=no,
// use=reference), 1 request/second, retries with backoff, raw HTML cached in scripts/refs/cache/ so
// re-runs never refetch. We never train on it; the creator's full prompt stays in the local cache
// (gitignored) and is only read to write a short English technique card. Only cards + links go to the DB.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SITE = "https://prompt-motion.com";
const UA = "MotionGX-refs/1.0 (internal inspiration index; 1 req/s)";
const CACHE = path.resolve("scripts/refs/cache");
const LICENSE = "Belongs to creator; internal inspiration only. Never shown to users or shipped.";
export const TAGS = ["Product UI", "Phone", "Charts", "Diagrams", "Kinetic type", "Shapes", "Particles", "Characters", "Photos", "Music", "Code"] as const;

export type RawEntry = {
  slug: string;
  url: string;
  title: string;
  creator_name: string;
  creator_handle: string;
  tags: string[];
  type: "Prompt" | "Skill";
  prompt: string;
  model: string | null;
  effort: string | null;
  posted: string | null;
  source_url: string | null;
  skill_links: string[];
  width: number | null;
  height: number | null;
};

let lastRequest = 0;
async function politeFetch(url: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = lastRequest + 1000 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xml" } });
      if (res.ok) return await res.text();
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
      console.warn(`  ${res.status} on ${url}, backing off`);
    } catch (err) {
      if (attempt === 4) throw err;
      console.warn(`  fetch error on ${url}: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error(`gave up on ${url}`);
}

async function cached(name: string, url: string): Promise<string> {
  const file = path.join(CACHE, name);
  if (existsSync(file)) return readFileSync(file, "utf8");
  const body = await politeFetch(url);
  writeFileSync(file, body);
  return body;
}

/** Disallow rules for `User-agent: *` (all groups that apply to us). */
function disallowedPaths(robots: string): string[] {
  const out: string[] = [];
  let applies = false;
  let lastWasAgent = false;
  for (const raw of robots.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = (lastWasAgent && applies) || value === "*";
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (applies && key === "disallow" && value) out.push(value);
  }
  return out;
}

/** The RSC payload: self.__next_f.push([1,"…"]) strings, decoded and concatenated. */
function rscText(html: string): string {
  const parts: string[] = [];
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      parts.push(JSON.parse(m[1]));
    } catch {
      /* skip */
    }
  }
  return parts.join("");
}

const decodeHtml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, " ");

function jsonString(rsc: string, key: string): string | null {
  const m = rsc.match(new RegExp(`"${key}":("(?:[^"\\\\]|\\\\.)*")`));
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** <dt>Label</dt><dd>Value</dd> pairs, from the visible HTML. */
function definitionList(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) {
    const k = decodeHtml(m[1].replace(/<[^>]+>/g, "")).trim();
    const v = decodeHtml(m[2].replace(/<[^>]+>/g, "")).trim();
    if (k) out[k] = v;
  }
  return out;
}

const TAG_BY_SLUG: Record<string, string> = Object.fromEntries(TAGS.map((t) => [t.toLowerCase().replace(/\s+/g, "-"), t]));

export function parseEntry(slug: string, html: string): RawEntry {
  const rsc = rscText(html);
  const ld = (() => {
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    try {
      return m ? JSON.parse(m[1]) : {};
    } catch {
      return {};
    }
  })();
  const tagsMatch = rsc.match(/"tags":\[((?:"[^"]*",?)*)\]/);
  const tags = tagsMatch ? (JSON.parse(`[${tagsMatch[1]}]`) as string[]).map((t) => TAG_BY_SLUG[t] ?? t) : [];
  const handle = rsc.match(/"entry-creator"[\s\S]*?"children":\["@","([^"]+)"\]/)?.[1] ?? (ld.creator?.url ?? "").split("/").pop() ?? "";
  const label = rsc.match(/"text-xs font-medium text-muted-foreground","children":"(Prompt|Skill)"/)?.[1];
  const dl = definitionList(html);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => decodeHtml(m[1]));
  const source = hrefs.find((h) => /^https:\/\/(x|twitter)\.com\/[^/]+\/status\//.test(h)) ?? null;
  const skillLinks = [...new Set(hrefs.filter((h) => /^https?:\/\//.test(h) && !/prompt-motion\.com|x\.com|twitter\.com|cloudflareinsights|fonts\.|googleapis/.test(h)))];
  // Skills have no prompt: a description paragraph right after the "Skill" heading (+ an install command).
  const skillText = label === "Skill" ? rsc.match(/"children":"Skill"\}\],\["\$","p",null,\{[^}]*"children":("(?:[^"\\]|\\.)*")/)?.[1] : undefined;
  const prompt = jsonString(rsc, "prompt") ?? (skillText ? JSON.parse(skillText) : "");
  return {
    slug,
    url: `${SITE}/${slug}`,
    title: ld.name ?? decodeHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "") ?? slug),
    creator_name: ld.creator?.name ?? "",
    creator_handle: handle ? `@${handle}` : "",
    tags,
    type: label === "Skill" || (!label && /skill/i.test(dl.Type ?? "")) ? "Skill" : "Prompt",
    prompt,
    model: dl.Model ?? null,
    effort: dl.Effort ?? dl["Reasoning effort"] ?? null,
    posted: html.match(/<time[^>]*dateTime="([^"]+)"/)?.[1] ?? ld.uploadDate ?? null,
    source_url: source,
    skill_links: skillLinks,
    width: ld.width ?? null,
    height: ld.height ?? null,
  };
}

export async function collectEntries(): Promise<RawEntry[]> {
  mkdirSync(CACHE, { recursive: true });
  const robots = await cached("robots.txt", `${SITE}/robots.txt`);
  const disallow = disallowedPaths(robots);
  const signal = robots.match(/Content-Signal:\s*(.+)/)?.[1] ?? "none";
  console.log(`robots.txt: disallow for *: ${disallow.join(", ") || "(none)"} · content-signal: ${signal}`);
  if (/ai-input=no/.test(signal) || /use=none/.test(signal)) throw new Error(`robots.txt content-signal forbids this use: ${signal}`);

  const sitemap = await cached("sitemap.xml", `${SITE}/sitemap.xml`);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /^https:\/\/prompt-motion\.com\/[a-z0-9-]+-[0-9a-f]{6}$/.test(u));
  console.log(`sitemap: ${urls.length} entries`);

  const entries: RawEntry[] = [];
  let fetched = 0;
  for (const url of urls) {
    const slug = url.split("/").pop()!;
    const pathname = `/${slug}`;
    if (disallow.some((d) => pathname.startsWith(d))) {
      console.log(`  skip (robots): ${pathname}`);
      continue;
    }
    const wasCached = existsSync(path.join(CACHE, `${slug}.html`));
    const html = await cached(`${slug}.html`, url);
    if (!wasCached && ++fetched % 20 === 0) console.log(`  fetched ${fetched}…`);
    entries.push(parseEntry(slug, html));
  }
  writeFileSync(path.join(CACHE, "entries.json"), JSON.stringify(entries, null, 1));
  console.log(`parsed ${entries.length} entries (${fetched} fetched now, ${entries.length - fetched} from cache) → scripts/refs/cache/entries.json`);
  return entries;
}

export { LICENSE };

if (process.argv[1]?.endsWith("prompt-motion.ts")) {
  collectEntries().then(
    async (entries) => {
      const missing = (k: keyof RawEntry) => entries.filter((e) => !e[k] || (Array.isArray(e[k]) && !(e[k] as unknown[]).length)).length;
      console.log(`missing: title ${missing("title")}, handle ${missing("creator_handle")}, tags ${missing("tags")}, prompt ${missing("prompt")}, model ${missing("model")}, effort ${missing("effort")}, posted ${missing("posted")}, source ${missing("source_url")}`);
      if (process.argv.includes("--cards")) {
        const { writeCards } = await import("./cards");
        await writeCards(entries);
      }
    },
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
