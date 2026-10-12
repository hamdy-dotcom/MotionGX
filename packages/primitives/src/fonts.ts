// Loads the brand's fonts: @remotion/google-fonts when the family is on Google Fonts,
// otherwise an uploaded font file. Readex Pro (Arabic + Latin) is always loaded as the fallback.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { getAvailableFonts } from "@remotion/google-fonts";

export const FALLBACK_FAMILY = "Readex Pro";
const WEIGHTS = ["400", "500", "700", "800"];
const SUBSETS = ["arabic", "latin", "latin-ext"];

const loaded = new Map<string, Promise<boolean>>();

async function loadGoogle(family: string): Promise<boolean> {
  const entry = getAvailableFonts().find((f) => f.fontFamily.toLowerCase() === family.trim().toLowerCase());
  if (!entry) return false;
  const font = await entry.load();
  const info = font.getInfo();
  const styles = info.fonts.normal ?? Object.values(info.fonts)[0] ?? {};
  const weights = WEIGHTS.filter((w) => w in styles);
  const subsets = info.subsets.filter((s) => SUBSETS.includes(s));
  const { waitUntilDone } = font.loadFont("normal", {
    weights: weights.length ? weights : Object.keys(styles).slice(0, 3),
    subsets: subsets.length ? subsets : info.subsets.slice(0, 1),
    ignoreTooManyRequestsWarning: true,
  });
  await waitUntilDone();
  return true;
}

async function loadFile(family: string, url: string): Promise<boolean> {
  const face = new FontFace(family, `url(${url})`);
  await face.load();
  document.fonts.add(face);
  return true;
}

function load(family: string, files: { family: string; url: string }[]) {
  const key = family.toLowerCase();
  if (!loaded.has(key)) {
    const file = files.find((f) => f.family.toLowerCase() === key);
    loaded.set(
      key,
      loadGoogle(family)
        .then((ok) => ok || (file ? loadFile(family, file.url) : false))
        .catch(() => false),
    );
  }
  return loaded.get(key)!;
}

import type { FontStacks } from "./types";

export type { FontStacks };

const stack = (...families: (string | null | undefined)[]) =>
  [...new Set(families.filter((f): f is string => !!f))].map((f) => `"${f}"`).join(", ") + ", sans-serif";

/** Blocks the frame (delayRender) until the brand fonts are ready, then returns CSS font stacks. */
export function useBrandFonts(
  fonts: { arabic?: string | null; latin?: string | null; display?: string | null },
  files: { family: string; url: string }[] = [],
  lang: "ar" | "en",
): { ready: boolean; stacks: FontStacks } {
  const [handle] = useState(() => delayRender("Loading brand fonts", { timeoutInMilliseconds: 60_000 }));
  const [result, setResult] = useState<{ ready: boolean; arabic: boolean; latin: boolean; display: boolean }>({ ready: false, arabic: false, latin: false, display: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      load(FALLBACK_FAMILY, files),
      fonts.arabic ? load(fonts.arabic, files) : Promise.resolve(false),
      fonts.latin ? load(fonts.latin, files) : Promise.resolve(false),
      fonts.display ? load(fonts.display, files) : Promise.resolve(false),
    ])
      .then(([, arabic, latin, display]) => document.fonts.ready.then(() => [arabic, latin, display] as const))
      .then(([arabic, latin, display]) => {
        if (!cancelled) setResult({ ready: true, arabic, latin, display });
        continueRender(handle);
      })
      .catch(() => {
        if (!cancelled) setResult({ ready: true, arabic: false, latin: false, display: false });
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per font pair
  }, [fonts.arabic, fonts.latin, fonts.display]);

  const arabic = result.arabic ? fonts.arabic : null;
  const latin = result.latin ? fonts.latin : null;
  return {
    ready: result.ready,
    stacks: {
      arabic: stack(arabic, FALLBACK_FAMILY, latin),
      latin: stack(latin, FALLBACK_FAMILY),
      head: lang === "ar" ? stack(arabic, FALLBACK_FAMILY, latin) : stack(latin, FALLBACK_FAMILY),
      body: lang === "ar" ? stack(arabic, FALLBACK_FAMILY, latin) : stack(latin, FALLBACK_FAMILY),
      // the director's display face for headlines (falls back to the head stack)
      display: result.display && fonts.display ? stack(fonts.display, arabic, FALLBACK_FAMILY, latin) : lang === "ar" ? stack(arabic, FALLBACK_FAMILY, latin) : stack(latin, FALLBACK_FAMILY),
    },
  };
}
