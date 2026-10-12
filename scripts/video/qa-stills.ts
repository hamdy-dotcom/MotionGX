// Design QA: renders one still per scene (late in each scene, after entrances) to out/qa/.
// Usage: npx tsx scripts/video/qa-stills.ts [format] [lang]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { previewProps } from "../../remotion/preview-props";
import { computeTimeline } from "../../lib/video/timeline";
import type { BrandVideoProps, VideoFormat } from "../../lib/video/kit";

async function main() {
  const format = (process.argv[2] as VideoFormat) ?? "9:16";
  const at = Number(process.argv[3] ?? "0.75");
  const only = process.argv[4]?.split(",");
  const props: BrandVideoProps = { ...previewProps, format };
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "BrandVideo", inputProps: props });
  const timeline = computeTimeline(props.scenes.map((s) => s.duration_beats), { fps: props.fps, bpm: props.bpm, lengthS: props.lengthS });
  const tag = format.replace(":", "x");
  for (const t of timeline) {
    const scene = props.scenes[t.index];
    if (only && !only.includes(scene.type)) continue;
    const frame = t.startFrame + Math.floor(t.durationFrames * at);
    const output = path.resolve(`out/qa/${tag}-${String(t.index + 1).padStart(2, "0")}-${scene.type}.jpeg`);
    await renderStill({ serveUrl, composition, inputProps: props, frame, output, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5 });
    console.log("still", output, "frame", frame);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
