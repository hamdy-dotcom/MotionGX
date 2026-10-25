"use client";

import { useEffect, useState } from "react";
import { CreatingStudio } from "../../(app)/posts/[id]/creating-studio";
import { PlatformPreview } from "../../(app)/posts/[id]/platform-preview";
import type { PostPlatformKey } from "@/lib/posts/config";

const brand = { name: "Slllr", logoUrl: null, logoOnDark: false, colors: [{ hex: "#00a67c" }], site: "https://slllr.com" };
const palette = { background: "#ffffff", surface: "#f6f6f6", ink: "#12263f", primary: "#00a67c", accent: "#19bc9b" };
const IMG = "https://picsum.photos/seed/slllr/1080/1350";
const TIMELINE: [number, Record<string, unknown>][] = [
  [0, { stage: "queued" }],
  [1500, { stage: "brand" }],
  [3500, { stage: "write", progress: { brand: { palette, display: "Cairo", theme: "light" } } }],
  [7000, { stage: "format", progress: { write: { headline: "٥٠ ريال بونص", texts: { instagram: "جاي جديد على سلر؟ ٥٠ ريال بونص مستنيينك 💚", facebook: "أول ٥ أوردرات، وبونص ٥٠ ريال", x: "٥٠ ريال بونص على أول ٥ أوردرات" } } } }],
  [9000, { stage: "image", progress: { format: { format: "fact_highlight", recent: ["people_moment", "product_in_use", "typographic"] } } }],
  [13000, { stage: "check", progress: { image: [{ path: "x" }] } }],
  [15000, { stage: "sizes", progress: { check: [{ ok: true, problems: [], attempt: 0 }] } }],
  [16500, { stage: "sizes", progress: { sizes: { sizes: { "4:5": [1080, 1350], "16:9": [1600, 900] } } } }],
];

export function DevStudio() {
  const [gen, setGen] = useState<Record<string, unknown>>({ stage: "queued", started_at: new Date().toISOString(), cost_usd: 0, progress: {} });
  const [view, setView] = useState<"creating" | "results">("creating");
  const [p, setP] = useState<PostPlatformKey>("instagram");
  const [d, setD] = useState<"mobile" | "desktop">("mobile");
  useEffect(() => {
    const timers = TIMELINE.map(([ms, patch]) => setTimeout(() => setGen((g) => ({ ...g, ...patch, cost_usd: ms / 400000, progress: { ...(g.progress as object), ...((patch.progress as object) ?? {}) } })), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  const image = (gen.progress as { image?: unknown[] })?.image?.length ? IMG : null;
  return (
    <div>
      <div className="mb-4 flex gap-2" dir="ltr">
        {(["creating", "results"] as const).map((v) => <button key={v} type="button" className="chip chip-white" aria-pressed={view === v} onClick={() => setView(v)}>{v}</button>)}
        {(["instagram", "facebook", "tiktok", "linkedin", "x"] as const).map((x) => <button key={x} type="button" className="chip chip-white" aria-pressed={p === x} onClick={() => setP(x)}>{x}</button>)}
        {(["mobile", "desktop"] as const).map((x) => <button key={x} type="button" className="chip chip-white" aria-pressed={d === x} onClick={() => setD(x)}>{x}</button>)}
      </div>
      {view === "creating" ? (
        <CreatingStudio money={(usd) => `$${usd.toFixed(3)}`} generation={gen} imageUrl={image} brand={brand} platforms={["instagram", "facebook", "x"]} change={false} onCancel={() => {}} cancelling={false} />
      ) : (
        <section className="panel"><PlatformPreview platform={p} device={d} image={IMG} text={"جاي جديد على سلر؟ ٥٠ ريال بونص مستنيينك 💚\n\nأول ٥ أوردرات يتسلّموا لعملائك، وتاخد عليهم بونص ٥٠ ريال."} hashtags={["دروبشيبنج", "السعودية", "سلر"]} brand={brand} /></section>
      )}
    </div>
  );
}
