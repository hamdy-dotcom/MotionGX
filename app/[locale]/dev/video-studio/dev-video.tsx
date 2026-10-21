"use client";

import { useEffect, useState } from "react";
import { CreatingVideo } from "../../(app)/videos/[id]/creating-video";
import type { VideoEvent, VideoProgress } from "@/lib/live-engine/server/video-progress";

// a real director run (the events its log produced), replayed over ~50 seconds
const TIMELINE: [number, string, VideoEvent[]][] = [
  [0, "queued", []],
  [3, "script", [{ k: "explore", n: 3 }]],
  [6, "script", [{ k: "explore", n: 11 }]],
  [9, "script", [{ k: "explore", n: 11 }, { k: "plan" }]],
  [13, "music", [{ k: "explore", n: 11 }, { k: "plan" }, { k: "music", mood: "driving", bpm: 120 }]],
  [16, "build", [{ k: "explore", n: 11 }, { k: "plan" }, { k: "music", mood: "driving", bpm: 120 }, { k: "storyboard", scenes: 9, mood: "driving" }]],
  [20, "build", [{ k: "explore", n: 11 }, { k: "plan" }, { k: "music", mood: "driving", bpm: 120 }, { k: "storyboard", scenes: 9, mood: "driving" }, { k: "build", n: 1 }, { k: "check", errors: 2 }]],
  [26, "build", [{ k: "explore", n: 11 }, { k: "plan" }, { k: "music", mood: "driving", bpm: 120 }, { k: "storyboard", scenes: 9, mood: "driving" }, { k: "build", n: 3 }, { k: "check", errors: 1 }, { k: "snapshot", n: 2 }]],
  [33, "qa", [{ k: "explore", n: 11 }, { k: "plan" }, { k: "music", mood: "driving", bpm: 120 }, { k: "storyboard", scenes: 9, mood: "driving" }, { k: "build", n: 6 }, { k: "check", errors: 0 }, { k: "snapshot", n: 6 }]],
  [38, "render", [{ k: "explore", n: 11 }, { k: "plan" }, { k: "music", mood: "driving", bpm: 120 }, { k: "storyboard", scenes: 9, mood: "driving" }, { k: "build", n: 6 }, { k: "check", errors: 0 }, { k: "snapshot", n: 6 }, { k: "render" }]],
];

export function DevVideo({ screens }: { screens: string[] }) {
  const [t0] = useState(() => Date.now());
  const [s, setS] = useState(0);
  useEffect(() => { const iv = setInterval(() => setS((Date.now() - t0) / 1000), 500); return () => clearInterval(iv); }, [t0]);
  const [, step, events] = TIMELINE.findLast(([at]) => s >= at) ?? TIMELINE[0];
  const gen = { stage: step === "queued" ? "queued" : step === "script" ? "plan" : step === "render" ? "ready" : step === "music" ? "music" : "spec", engine: "live", first: false };
  const progress: VideoProgress = { kind: "video", startedAt: new Date(t0).toISOString(), cost: Math.min(0.42, s * 0.011), step: step === "queued" ? null : step, events };
  return (
    <CreatingVideo
      title="معاك 60 ثانية؟ ده كل اللي محتاجه متجرك"
      format="9:16"
      lengthS={60}
      createdAt={new Date(t0).toISOString()}
      generation={gen}
      progress={progress}
      brand={{ name: "منتوج", colors: [{ hex: "#3b82f6" }, { hex: "#60a5fa" }, { hex: "#0f1117" }, { hex: "#1a1d24" }, { hex: "#8b8fa8" }, { hex: "#ffffff" }], logoUrl: null, logoOnDark: true, screens }}
      edit={false}
      codeForm={null}
    />
  );
}
