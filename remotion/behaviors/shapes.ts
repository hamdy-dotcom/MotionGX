// Shape outlines as point lists (pure), so any shape can morph into any other: every outline is
// sampled to the same number of points.
import { noise1 } from "./core";

export type ShapeKind = "rect" | "circle" | "polygon" | "star" | "blob" | "ring" | "pill" | "triangle" | "line";
const N = 96;

function resample(pts: [number, number][], n = N): [number, number][] {
  const closed = [...pts, pts[0]];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const d = Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]);
    seg.push(d);
    total += d;
  }
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let target = (k / n) * total;
    let i = 0;
    while (i < seg.length - 1 && target > seg[i]) target -= seg[i++];
    const f = seg[i] ? target / seg[i] : 0;
    out.push([closed[i][0] + (closed[i + 1][0] - closed[i][0]) * f, closed[i][1] + (closed[i + 1][1] - closed[i][1]) * f]);
  }
  return out;
}

/** outline in a w × h box (origin top-left), always N points, starting at the top centre */
export function shapePoints(kind: ShapeKind, w: number, h: number, o: { radius?: number; sides?: number; points?: number; seed?: number; t?: number } = {}): [number, number][] {
  const cx = w / 2;
  const cy = h / 2;
  const ring = (rf: (a: number) => number): [number, number][] =>
    Array.from({ length: N }, (_, i) => {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      const r = rf(a);
      return [cx + Math.cos(a) * r * (w / 2), cy + Math.sin(a) * r * (h / 2)];
    });
  switch (kind) {
    case "circle":
    case "ring":
      return ring(() => 1);
    case "blob":
      return ring((a) => 0.82 + 0.18 * noise1(o.seed ?? 3, Math.cos(a) * 1.6 + 5 + (o.t ?? 0) * 0.4) * Math.sign(1) + 0.08 * Math.sin(a * 3 + (o.t ?? 0)));
    case "polygon":
    case "triangle": {
      const n = kind === "triangle" ? 3 : o.sides ?? 6;
      const corners: [number, number][] = Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return [cx + Math.cos(a) * (w / 2), cy + Math.sin(a) * (h / 2)];
      });
      return resample(corners);
    }
    case "star": {
      const n = o.points ?? 5;
      const corners: [number, number][] = Array.from({ length: n * 2 }, (_, i) => {
        const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? 1 : 0.45;
        return [cx + Math.cos(a) * r * (w / 2), cy + Math.sin(a) * r * (h / 2)];
      });
      return resample(corners);
    }
    case "pill":
    case "rect":
    case "line":
    default: {
      const r = kind === "pill" ? Math.min(w, h) / 2 : ((o.radius ?? 0) / 100) * Math.min(w, h);
      const pts: [number, number][] = [];
      const arc = (x: number, y: number, a0: number) => {
        for (let i = 0; i <= 8; i++) {
          const a = a0 + (i / 8) * (Math.PI / 2);
          pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
        }
      };
      pts.push([cx, 0]);
      arc(w - r, r, -Math.PI / 2);
      arc(w - r, h - r, 0);
      arc(r, h - r, Math.PI / 2);
      arc(r, r, Math.PI);
      return resample(pts);
    }
  }
}

export const toPath = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
export const lerpPoints = (a: [number, number][], b: [number, number][], t: number): [number, number][] => a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);

/** smooth polyline through points (Catmull-Rom → cubic Bézier) */
export function smoothPath(pts: [number, number][]) {
  if (pts.length < 3) return `M${pts.map((p) => p.join(",")).join("L")}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
