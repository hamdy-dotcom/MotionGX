"use client";

import "./edit-room.css";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { anotherDirection, applyEdits, askDirectorScene, exportVideoAction, getGenerationStatus, getRenderStatus, renderDownloadUrl, restoreVersion, type ActionResult } from "./actions";
import type { RenderInfo, StudioVersion } from "./studio";
import type { VideoProgress } from "@/lib/live-engine/server/video-progress";
import { editsCss, type CompositionEdits, type ElementEdit } from "@/lib/director-engine/edits";
import { toLocal } from "@/lib/pricing";
import { formatMoney, formatNumber } from "@/lib/format";
import { formatKey } from "@/lib/video-labels";
import type { Video } from "@/lib/types";
import type { ScriptBeat } from "@motiongx/primitives";

/** a row of the versions tab */
export type RoomVersion = { version: number; at: string; origin: string; request: string | null; edits: number; restored: number | null; costUsd: number };
type LiveVersion = Extract<StudioVersion, { engine: "live" }>;
/** an element of the composition the client can move: found in the frame at a scene's settled pose */
type Cand = { sel: string; kind: "text" | "ui" | "img" | "logo" | "box"; text: string; id: string; global: boolean; scene: number };
type Box = { x: number; y: number; w: number; h: number };
type Guide = { v?: number; h?: number };
type Tab = "scene" | "el" | "ai" | "ver";
type Notice = { tone: "ok" | "info" | "error"; text: string; topUp?: boolean } | null;

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const KIND_TAG: Record<Cand["kind"], string> = { text: "TEXT", ui: "UI", img: "IMG", logo: "LOGO", box: "BOX" };
const DRAFT = (videoId: string, version: number) => `mgx-er:${videoId}:${version}`;
// a re-render of the whole video (no model call) takes about this long; the bar follows it
const RERENDER_S = 110;

export function EditRoom({
  video,
  generation,
  companyName,
  current,
  beats,
  versions,
  bpm,
  drops,
  mood,
  costUsd,
  fxRate,
  currency,
  initialRender,
  compBase,
  scriptDir,
}: {
  video: Video;
  generation: Record<string, unknown> | null;
  companyName: string;
  current: LiveVersion;
  beats: ScriptBeat[];
  versions: RoomVersion[];
  bpm: number | null;
  drops: number[];
  mood: string | null;
  costUsd: number;
  fxRate: number;
  currency: string;
  initialRender: RenderInfo | null;
  /** the composition's signed folder (…/video.html and the files it loads) */
  compBase: string;
  scriptDir: "rtl" | "ltr";
}) {
  const t = useTranslations("editRoom");
  const tc = useTranslations("common");
  const tf = useTranslations("formats");
  const td = useTranslations("dialects");
  const te = useTranslations("aiErrors");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const W = current.width, H = current.height, FPS = current.fps || 30;
  const LEN = Math.max(1, video.length_s || beats.at(-1)?.end_s || 1);
  const BEAT = bpm ? 60 / bpm : null;
  const scenes = useMemo(() => beats.map((b, i) => ({ n: i + 1, start: b.start_s, end: i === beats.length - 1 ? Math.max(b.end_s, LEN) : b.end_s, dur: Math.max(0.1, (i === beats.length - 1 ? Math.max(b.end_s, LEN) : b.end_s) - b.start_s), label: (b.lines?.[0] ?? b.role ?? "").trim(), beat: b })), [beats, LEN]);
  const sceneAt = useCallback((x: number) => Math.max(0, scenes.findLastIndex((s) => x >= s.start - 0.001)), [scenes]);
  const pose = useCallback((i: number) => scenes[i].start + Math.min(scenes[i].dur * 0.75, Math.max(0.2, scenes[i].dur - 0.25)), [scenes]);

  // ── refs: the player runs outside React (time-driven parts are written straight to the DOM) ──
  const screenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const pheadRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(0);

  const [scale, setScale] = useState(1);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [edit, setEditState] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("scene");
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [notice, setNotice] = useState<Notice>(null);

  // ── the composition frame ──
  const [comp, setComp] = useState<"loading" | "ready" | "none">("loading");
  const [cands, setCands] = useState<Cand[]>([]);
  const [base, setBase] = useState<CompositionEdits>({});
  const [edits, setEdits] = useState<CompositionEdits>({});
  const [dirty, setDirty] = useState<number[]>([]);
  const [boxes, setBoxes] = useState<Record<string, Box | null>>({});
  const [guides, setGuides] = useState<Guide[]>([]);
  const undo = useRef<{ edits: CompositionEdits; dirty: number[] }[]>([]);
  const pendingRpc = useRef(new Map<number, (d: Record<string, unknown>) => void>());
  const rpcId = useRef(0);
  const seeking = useRef(false);

  const rpc = useCallback((op: string, data: Record<string, unknown> = {}) => new Promise<Record<string, unknown>>((resolve) => {
    const win = frameRef.current?.contentWindow;
    if (!win) return resolve({});
    const id = ++rpcId.current;
    pendingRpc.current.set(id, resolve);
    win.postMessage({ mgx: 1, op, id, ...data }, "*");
    setTimeout(() => { if (pendingRpc.current.delete(id)) resolve({}); }, 15000);
  }), []);

  // ── generation (an edit / re-render in progress) and export ──
  const [status, setStatus] = useState(video.status);
  const [gen, setGen] = useState<Record<string, unknown> | null>(generation);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [render, setRender] = useState<RenderInfo | null>(initialRender);
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const generating = status === "generating";
  const genMode = String(gen?.mode ?? "");
  const renderActive = render?.status === "queued" || render?.status === "rendering";
  const price = formatMoney(toLocal(costUsd, fxRate), currency, locale);

  const toast = useCallback((m: string) => {
    const el = toastRef.current;
    if (!el) return;
    el.textContent = m;
    el.classList.add("on");
    clearTimeout((toast as unknown as { h?: number }).h);
    (toast as unknown as { h?: number }).h = window.setTimeout(() => el.classList.remove("on"), 2600);
  }, []);

  // ── fitting the stage into the screen ──
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const showComp = comp === "ready" && (edit || dirty.length > 0);
  const showCompRef = useRef(showComp);
  useEffect(() => { showCompRef.current = showComp; }, [showComp]);

  const seekComp = useCallback(async (x: number) => {
    if (seeking.current) return;
    seeking.current = true;
    try { await rpc("seek", { t: x }); } finally { seeking.current = false; }
  }, [rpc]);

  /** the playhead: the transport, the timeline and the frame follow it */
  const paintTime = useCallback((x: number) => {
    const p = x / LEN;
    if (fillRef.current) fillRef.current.style.width = `${p * 100}%`;
    if (knobRef.current) knobRef.current.style.insetInlineStart = `${p * 100}%`;
    if (pheadRef.current) pheadRef.current.style.insetInlineStart = `${p * 100}%`;
    if (timeRef.current) timeRef.current.textContent = `${fmt(x)} / ${fmt(LEN)}`;
  }, [LEN]);
  const editRef = useRef(edit);
  useEffect(() => { editRef.current = edit; }, [edit]);
  const setT = useCallback((x: number, fromVideo = false) => {
    const nt = clamp(x, 0, LEN - 0.001);
    tRef.current = nt;
    const v = videoRef.current;
    if (!fromVideo && v && Math.abs(v.currentTime - nt) > 0.04) v.currentTime = nt;
    if (!editRef.current) setScene((s) => { const i = sceneAt(nt); return i === s ? s : i; });
    paintTime(nt);
    if (showCompRef.current && !editRef.current) void seekComp(nt);
  }, [LEN, paintTime, sceneAt, seekComp]);

  // ── the player ──
  const loopRef = useRef(loop), sceneRef = useRef(scene);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (!v) return;
      let x = v.currentTime;
      const s = scenes[sceneRef.current];
      if (loopRef.current && s && x >= s.end) { x = s.start; v.currentTime = x; }
      if (v.ended || x >= LEN - 0.02) { setPlaying(false); v.pause(); setT(LEN - 0.001); return; }
      setT(x, true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scenes, LEN, setT]);

  const setEdit = useCallback((on: boolean) => {
    if (on && comp !== "ready") { toast(comp === "loading" ? t("compLoading") : t("compNone")); return; }
    setEditState(on);
    editRef.current = on;
    if (on) { videoRef.current?.pause(); setPlaying(false); void rpc("seek", { t: pose(sceneRef.current) }); }
    else { setSel(null); setGuides([]); if (dirty.length) void seekComp(tRef.current); }
  }, [comp, dirty.length, pose, rpc, seekComp, t, toast]);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (editRef.current) setEdit(false);
    if (tRef.current >= LEN - 0.05) setT(0);
    v.playbackRate = speed;
    void v.play().catch(() => undefined);
    setPlaying(true);
    setStarted(true);
  }, [LEN, setEdit, setT, speed]);
  const pause = useCallback(() => { videoRef.current?.pause(); setPlaying(false); }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [pause, play, playing]);
  const goScene = useCallback((i: number, at = 0) => {
    const s = scenes[i];
    if (!s) return;
    setScene(i);
    sceneRef.current = i;
    setSel(null);
    if (editRef.current) { tRef.current = pose(i); paintTime(pose(i)); if (videoRef.current) videoRef.current.currentTime = pose(i); void rpc("seek", { t: pose(i) }); }
    else setT(s.start + at);
  }, [paintTime, pose, rpc, scenes, setT]);

  useEffect(() => { if (videoRef.current) { videoRef.current.volume = volume; videoRef.current.muted = muted; } }, [volume, muted]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);
  useEffect(() => { paintTime(0); }, [paintTime]);

  // ── the composition frame: ready → find every scene's elements; the edits it already carries are the base ──
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data || e.data.mgx !== 1) return;
      const m = e.data as { op?: string; id?: number; edits?: CompositionEdits } & Record<string, unknown>;
      if (m.id && pendingRpc.current.has(m.id)) { pendingRpc.current.get(m.id)!(m); pendingRpc.current.delete(m.id); return; }
      if (m.op !== "ready") return;
      void (async () => {
        const res = await rpc("scan", { poses: scenes.map((_, i) => pose(i)), back: tRef.current });
        const found = (res.scenes as { sel: string; kind: Cand["kind"]; text: string; id: string }[][] | undefined) ?? [];
        // an element found in (nearly) every scene is the video's own layer (a corner logo): moving it moves it everywhere
        const count = new Map<string, number>();
        found.forEach((list) => new Set(list.map((c) => c.sel)).forEach((s) => count.set(s, (count.get(s) ?? 0) + 1)));
        const all: Cand[] = [];
        const seen = new Set<string>();
        found.forEach((list, i) => list.forEach((c) => {
          const global = found.length > 2 && (count.get(c.sel) ?? 0) >= found.length - 1;
          if (global && seen.has(c.sel)) return;
          seen.add(c.sel);
          all.push({ ...c, global, scene: global ? -1 : i });
        }));
        setCands(all);
        const baked = m.edits ?? {};
        setBase(baked);
        // an unsent draft of this version (this browser) comes back
        let draft: { edits: CompositionEdits; dirty: number[] } | null = null;
        try { draft = JSON.parse(localStorage.getItem(DRAFT(video.id, current.version)) ?? "null"); } catch { draft = null; }
        setEdits(draft?.edits ?? baked);
        setDirty(draft?.dirty ?? []);
        setComp("ready");
      })();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [current.version, pose, rpc, scenes, video.id]);
  useEffect(() => {
    // a version without a saved composition never reports ready
    const h = setTimeout(() => setComp((c) => (c === "loading" ? "none" : c)), 90_000);
    return () => clearTimeout(h);
  }, []);

  // the edits, live in the frame (the same CSS + texts the re-render bakes in)
  const textsOf = useCallback((e: CompositionEdits) => Object.values(e).filter((x) => typeof x.text === "string").map((x) => [x.sel, x.text]), []);
  const originalText = useCallback((s: string) => cands.find((c) => c.sel === s)?.text ?? "", [cands]);
  useEffect(() => {
    if (comp !== "ready") return;
    const texts = [...textsOf(edits), ...Object.values(base).filter((b) => typeof b.text === "string" && edits[b.sel]?.text === undefined).map((b) => [b.sel, originalText(b.sel)])];
    void rpc("apply", { css: editsCss(edits), texts }).then(() => { if (!editRef.current && showCompRef.current) void rpc("seek", { t: tRef.current }); });
    try {
      if (dirty.length) localStorage.setItem(DRAFT(video.id, current.version), JSON.stringify({ edits, dirty }));
      else localStorage.removeItem(DRAFT(video.id, current.version));
    } catch { /* private mode */ }
  }, [base, comp, current.version, dirty, edits, originalText, rpc, textsOf, video.id]);

  // the boxes of the scene's elements, measured in the frame
  const sceneCands = useMemo(() => cands.filter((c) => c.scene === scene || c.global), [cands, scene]);
  const measure = useCallback(async () => {
    if (!editRef.current || !sceneCands.length) return;
    const res = await rpc("boxes", { sels: sceneCands.map((c) => c.sel) });
    const list = (res.boxes as (Box | null)[] | undefined) ?? [];
    setBoxes(Object.fromEntries(sceneCands.map((c, i) => [c.sel, list[i] ?? null])));
  }, [rpc, sceneCands]);
  useEffect(() => { if (edit) void measure(); }, [edit, edits, scene, measure]);

  // ── editing helpers ──
  const keyScene = useCallback((s: string) => cands.find((c) => c.sel === s)?.scene ?? sceneRef.current, [cands]);
  const pushUndo = useCallback(() => { undo.current.push({ edits, dirty }); if (undo.current.length > 60) undo.current.shift(); }, [dirty, edits]);
  const change = useCallback((s: string, patch: Partial<ElementEdit>) => {
    setEdits((all) => ({ ...all, [s]: { ...(all[s] ?? { sel: s }), ...patch, sel: s } }));
    const sc = keyScene(s);
    setDirty((d) => { const add = sc < 0 ? scenes.map((_, i) => i) : [sc]; return [...new Set([...d, ...add])].sort((a, b) => a - b); });
  }, [keyScene, scenes]);
  const candOf = (s: string | null) => (s ? cands.find((c) => c.sel === s) ?? null : null);
  const labelOf = (c: Cand) => (c.kind === "text" ? c.text.slice(0, 34) || t("kind.text") : c.global ? t("cornerLabel") : c.id ? `${t(`kind.${c.kind}`)} · ${c.id}` : t(`kind.${c.kind}`));

  // dragging on the canvas: select, move with snapping, resize from the corner handle
  const drag = useRef<null | { mode: "move" | "size"; sel: string; sx: number; sy: number; dx0: number; dy0: number; s0: number; box: Box; xs: [number, string][]; ys: [number, string][]; moved: boolean }>(null);
  const stageXY = (cx: number, cy: number) => { const r = screenRef.current!.getBoundingClientRect(); return [(cx - r.left) / scale, (cy - r.top) / scale] as const; };
  const hit = (x: number, y: number) => {
    let best: string | null = null, area = Infinity;
    for (const c of sceneCands) { const b = boxes[c.sel]; if (!b || x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) continue; if (b.w * b.h < area) { area = b.w * b.h; best = c.sel; } }
    return best;
  };
  const onDown = (e: React.PointerEvent) => {
    if (!edit) { if (!(e.target as HTMLElement).closest(".er-bigplay")) toggle(); return; }
    e.preventDefault();
    const [x, y] = stageXY(e.clientX, e.clientY);
    const handle = (e.target as HTMLElement).closest("[data-handle]");
    const key = handle ? sel : hit(x, y);
    setSel(key);
    if (key && tab !== "el") setTab("el");
    if (!key || !boxes[key]) return;
    const cur = edits[key] ?? { sel: key };
    const xs: [number, string][] = [[W / 2, "c"], [W * 0.0417, "s"], [W - W * 0.0417, "e"]], ys: [number, string][] = [[H / 2, "c"], [H * 0.0556, "s"], [H - H * 0.0556, "e"]];
    for (const c of sceneCands) { if (c.sel === key) continue; const b = boxes[c.sel]; if (!b) continue; xs.push([b.x, "s"], [b.x + b.w, "e"], [b.x + b.w / 2, "c"]); ys.push([b.y, "s"], [b.y + b.h, "e"], [b.y + b.h / 2, "c"]); }
    pushUndo();
    drag.current = { mode: handle ? "size" : "move", sel: key, sx: x, sy: y, dx0: cur.dx ?? 0, dy0: cur.dy ?? 0, s0: cur.scale ?? 1, box: boxes[key]!, xs, ys, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = stageXY(e.clientX, e.clientY);
    d.moved = true;
    if (d.mode === "size") {
      const k = Math.max(0.2, (d.box.w + (x - d.sx)) / d.box.w);
      change(d.sel, { scale: +(d.s0 * k).toFixed(4) });
      return;
    }
    let nx = d.box.x + (x - d.sx), ny = d.box.y + (y - d.sy);
    const g: Guide[] = [], T = 12 * (W / 1920);
    // snap: the frame's centre lines, the safe margins, and the other elements' edges / centres
    for (const [v, k] of d.xs) { const c = k === "c" ? v - d.box.w / 2 : k === "s" ? v : v - d.box.w; if (Math.abs(nx - c) < T) { nx = c; g.push({ v }); break; } }
    for (const [v, k] of d.ys) { const c = k === "c" ? v - d.box.h / 2 : k === "s" ? v : v - d.box.h; if (Math.abs(ny - c) < T) { ny = c; g.push({ h: v }); break; } }
    setGuides(g);
    change(d.sel, { dx: Math.round(d.dx0 + nx - d.box.x), dy: Math.round(d.dy0 + ny - d.box.y) });
  };
  const onUp = () => { if (drag.current && !drag.current.moved) undo.current.pop(); drag.current = null; setGuides([]); };

  const restoreEl = (s: string) => {
    pushUndo();
    setEdits((all) => { const { [s]: _drop, ...rest } = all; void _drop; return rest; });
    const sc = keyScene(s);
    setDirty((d) => [...new Set([...d, ...(sc < 0 ? scenes.map((_, i) => i) : [sc])])].sort((a, b) => a - b));
    toast(t("resetDone"));
  };

  // keyboard: the player's shortcuts, and fine moves while an element is selected
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? "")) return;
      const rtl = document.documentElement.dir === "rtl";
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); const u = undo.current.pop(); if (u) { setEdits(u.edits); setDirty(u.dirty); toast(t("undo")); } return; }
      if (edit && sel && /^Arrow/.test(e.key)) {
        e.preventDefault();
        const st = (e.shiftKey ? 20 : 4) * (W / 1920), cur = edits[sel] ?? { sel };
        pushUndo();
        change(sel, { dx: (cur.dx ?? 0) + (e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0), dy: (cur.dy ?? 0) + (e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0) });
        return;
      }
      if (e.key === " " || e.key === "k" || e.key === "K") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowLeft") setT(tRef.current + 5 * (rtl ? 1 : -1));
      else if (e.key === "ArrowRight") setT(tRef.current - 5 * (rtl ? 1 : -1));
      else if (e.key === "j" || e.key === "J") setT(tRef.current - 10);
      else if (e.key === "l" || e.key === "L") setT(tRef.current + 10);
      else if (e.key === ",") { pause(); setT(tRef.current - 1 / FPS); }
      else if (e.key === ".") { pause(); setT(tRef.current + 1 / FPS); }
      else if (e.key === "[") prevScene();
      else if (e.key === "]") goScene(Math.min(scenes.length - 1, sceneAt(tRef.current) + 1));
      else if (e.key === "e" || e.key === "E") setEdit(!edit);
      else if (e.key === "m" || e.key === "M") setMuted((m) => !m);
      else if (e.key === "f" || e.key === "F") fullscreen();
      else if (e.key === "Escape" && edit) setEdit(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const prevScene = () => { const i = sceneAt(tRef.current); goScene(tRef.current - scenes[i].start > 0.8 || i === 0 ? i : i - 1); };
  const fullscreen = () => {
    const el = screenRef.current;
    if (!el) return;
    const p = document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
    p?.catch?.(() => toast(t("noFullscreen")));
  };

  // scrubbing, with a preview tip
  const scrubbing = useRef(false);
  const posT = (cx: number) => { const el = scrubRef.current!, r = el.getBoundingClientRect(), rtl = getComputedStyle(el).direction === "rtl"; return clamp((rtl ? r.right - cx : cx - r.left) / r.width) * LEN; };

  /** replay the scene's animation once, then come back to the edit pose */
  const preview = () => {
    const s = scenes[scene];
    if (!s || comp !== "ready") return;
    const t0 = performance.now(), span = Math.min(s.dur, 4.5);
    const step = (n: number) => { const k = (n - t0) / 1000; if (k < span) { void seekComp(s.start + k); requestAnimationFrame(step); } else void rpc("seek", { t: editRef.current ? pose(scene) : tRef.current }); };
    requestAnimationFrame(step);
  };

  // ── generation status: an edit / re-render runs in the background, then the new version opens ──
  useEffect(() => {
    if (!generating) return;
    const tick = async () => {
      const s = await getGenerationStatus(video.id);
      if (!s) return;
      setGen(s.generation);
      setProgress(s.progress);
      setNow(Date.now());
      if (s.status !== "generating") {
        setStatus(s.status as Video["status"]);
        const g = String(s.generation.stage ?? "");
        if (g === "edit_failed") setNotice({ tone: "info", text: t("editFailed") });
        else if (g === "edit_stale") setNotice({ tone: "info", text: t("editStale") });
        else if (g === "error") setNotice({ tone: "error", text: tc("error") });
        try { localStorage.removeItem(DRAFT(video.id, current.version)); } catch { /* private mode */ }
        router.refresh();
      }
    };
    void tick();
    const poll = setInterval(tick, 3000);
    const clock = setInterval(() => setNow(Date.now()), 500);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [generating, video.id, router, t, tc, current.version]);

  const renderId = render?.id;
  useEffect(() => {
    if (!renderId || !renderActive) return;
    const poll = setInterval(async () => {
      const s = await getRenderStatus(renderId);
      if (!s) return;
      setRender((r) => (r && r.id === renderId ? { ...r, status: s.status, progress: s.progress } : r));
      if (s.status === "done") {
        const url = await renderDownloadUrl(renderId);
        setRender((r) => (r && r.id === renderId ? { ...r, downloadUrl: url } : r));
        setNotice({ tone: "ok", text: t("exportDone") });
        if (url) window.location.href = url;
      } else if (s.status === "failed") setNotice({ tone: "error", text: t("exportFailed") });
    }, 3000);
    return () => clearInterval(poll);
  }, [renderId, renderActive, t]);

  const run = (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    setNotice(null);
    startTransition(async () => {
      try { await fn(); } catch { setNotice({ tone: "error", text: tc("error") }); } finally { setBusy(null); }
    });
  };
  const onStarted = (res: ActionResult, mode: string, text: string) => {
    if (!res.ok) return setNotice({ tone: "error", text: res.error === "generic" ? tc("error") : te(res.error) });
    setStatus("generating");
    setGen({ stage: "queued", mode, engine: "live", started: Date.now() });
    setProgress(null);
    toast(text);
  };
  const startedAt = useRef<number | null>(null);
  useEffect(() => { if (generating && startedAt.current == null) startedAt.current = progress?.startedAt ? Date.parse(progress.startedAt) : Date.now(); if (!generating) startedAt.current = null; }, [generating, progress?.startedAt]);
  const elapsed = generating && startedAt.current ? Math.max(0, (now - startedAt.current) / 1000) : 0;

  const onApply = () => {
    if (!dirty.length) return;
    setEdit(false);
    pause();
    run("apply", async () => onStarted(await applyEdits(video.id, current.revision, edits), "rerender", t("applyStarted")));
  };
  const onAsk = (text = ask) => {
    const q = text.trim();
    if (!q) { toast(t("askEmpty")); return; }
    const s = scenes[scene];
    run("ask", async () => {
      const res = await askDirectorScene(video.id, current.revision, { n: s.n, start: s.start, end: s.end, label: s.label }, q);
      onStarted(res, "edit", t("askStarted", { n: s.n }));
      if (res.ok) { setAsk(""); setTab("ai"); }
    });
  };
  /** a change the canvas can't make by itself (a background, an animation): the director makes it for this scene */
  const prefill = (text: string) => { setAsk((a) => (a ? `${a}، ${text}` : text)); setTab("ai"); };
  const onRestore = (v: number) => run("restore", async () => {
    const res = await restoreVersion(video.id, v);
    if (!res.ok) throw new Error();
    toast(t("restored", { v }));
    router.refresh();
  });
  const onDirection = () => run("direction", async () => onStarted(await anotherDirection(video.id), "direction", t("directionStarted")));
  const onExport = () => {
    pause();
    setEdit(false);
    if (render?.status === "done" && render.downloadUrl) { window.location.href = render.downloadUrl; return; }
    run("export", async () => {
      const res = await exportVideoAction(video.id);
      if (res.ok) { setRender({ id: res.renderId, status: "queued", progress: 0, downloadUrl: null }); toast(t("exportQueued", { price: formatMoney(toLocal(res.costUsd, fxRate), currency, locale) })); }
      else if (res.error === "insufficient") setNotice({ tone: "error", text: t("insufficient"), topUp: true });
      else throw new Error();
    });
  };

  // ── what the director is doing (an edit of a scene): its steps from the job's log ──
  const ev = new Set((progress?.events ?? []).map((e) => e.k));
  const stepIdx = ev.has("finish") ? 5 : ev.has("render") ? 4 : ev.has("check") ? 3 : ev.has("snapshot") ? 2 : ev.has("build") ? 1 : 0;
  const busyScene = generating && genMode === "edit" ? scene : null;
  const overlay = generating && genMode !== "edit" ? { title: genMode === "rerender" ? t("rerendering", { n: dirty.length || 1 }) : genMode === "direction" ? t("directing") : t("updating"), k: genMode === "rerender" ? clamp(elapsed / RERENDER_S, 0, 0.97) : clamp(elapsed / 300, 0, 0.95) } : renderActive ? { title: t("exporting", { w: W, h: H }), k: clamp((render?.progress ?? 0) / 100) } : null;
  const totalFrames = Math.round(LEN * FPS);

  const s = scenes[scene] ?? scenes[0];
  const selC = candOf(sel);
  const selE = sel ? edits[sel] ?? { sel } : null;
  const selB = sel ? boxes[sel] ?? null : null;
  const sTexts = sceneCands.filter((c) => c.kind === "text" && !c.global);
  const textOf = (c: Cand) => edits[c.sel]?.text ?? c.text;
  const setTextOf = (c: Cand, v: string) => change(c.sel, { text: v });
  const beatsIn = BEAT && s ? Math.round(s.dur / BEAT) : null;
  const onDrop = s ? drops.some((d) => Math.abs(d - s.start) < 0.12) : false;
  const vtag = `V${current.version}`;
  const format = tf(formatKey(video.format));

  const pending = dirty.length > 0 && (
    <div className="er-pending">
      <span>✎ {t("pending", { n: dirty.length })}</span>
      <button className="er-btn lit small" onClick={onApply} disabled={generating || busy === "apply"}>{t("apply")}</button>
    </div>
  );

  const BGS = ["bgLogo", "bgGradient", "bgGrid", "bgBlur"] as const;
  const ANIMS = ["fade", "rise", "scale", "words", "type"] as const;

  return (
    <div className="er" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="er-aurora" aria-hidden="true"><i /><i /></div>
      <div className="er-wrap">
        <div className="er-slate">
          <span className="er-live"><span className="er-dot" />EDIT ROOM</span><i />
          <span dir="ltr">{companyName} · {format} · {Math.round(LEN)}S{bpm ? ` · ${bpm} BPM` : ""}</span><i />
          <span dir="ltr">{vtag}</span>
          <Link href="/library" className="er-sp" style={{ color: "inherit", textDecoration: "none" }}>{t("back")}</Link>
        </div>
        <div className="er-head">
          <div>
            <h1>{companyName ? <><b>{companyName}</b>: </> : null}{video.title}</h1>
            <div className="er-meta">
              <span className="er-chip">{format}</span>
              <span className="er-chip">{t("lengthScenes", { s: formatNumber(Math.round(LEN), locale), n: formatNumber(scenes.length, locale) })}</span>
              {video.dialect ? <span className="er-chip">{td(video.dialect)}</span> : null}
              {mood || bpm ? <span className="er-chip">♪ {mood ?? ""}{bpm ? ` · ${bpm} BPM` : ""}</span> : null}
              <span className="er-chip" style={{ color: generating ? "var(--brand)" : "var(--ok)" }}>● {generating ? t("working") : t("ready")}</span>
            </div>
          </div>
          <div className="er-chips">
            <button className="er-btn ghost" onClick={onDirection} disabled={generating || busy === "direction"}>✦ {t("another")}</button>
            <button className="er-btn lit" onClick={onExport} disabled={generating || renderActive || busy === "export"}>⬇ {render?.status === "done" && render.downloadUrl ? t("download") : t("export", { price })}</button>
          </div>
        </div>

        {notice ? (
          <div className={`er-notice ${notice.tone}`} role="status">
            <span>{notice.text}</span>
            {notice.topUp ? <Link href="/wallet" className="er-btn small">{t("topUp")}</Link> : <button className="er-btn ghost small" onClick={() => setNotice(null)}>✕</button>}
          </div>
        ) : null}

        <div className="er-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <div className="er-panel er-player">
              <div
                ref={screenRef}
                className={`er-screen${edit ? " editing" : ""}`}
                style={{ aspectRatio: `${W} / ${H}`, maxWidth: H > W ? `calc(72vh * ${W / H})` : undefined }}
                onDragStart={(e) => e.preventDefault()}
              >
                <video ref={videoRef} className="er-mp4" src={current.mp4Url ?? undefined} playsInline preload="auto" style={{ opacity: showComp ? 0 : 1 }} onEnded={() => setPlaying(false)} />
                <iframe
                  ref={frameRef}
                  title={t("compTitle")}
                  src={`${compBase}video.html`}
                  sandbox="allow-scripts"
                  width={W}
                  height={H}
                  tabIndex={-1}
                  style={{ width: W, height: H, transform: `scale(${scale})`, opacity: showComp ? 1 : 0 }}
                />
                <div className="er-overlay" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}>
                  {edit ? (
                    <>
                      <div className="er-safe" style={{ left: W * 0.0417 * scale, top: H * 0.0556 * scale, right: W * 0.0417 * scale, bottom: H * 0.0556 * scale }} />
                      {sceneCands.map((c) => { const b = boxes[c.sel]; return b && c.sel !== sel ? <div key={c.sel} className="er-hover" style={{ left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale, opacity: 0.35 }} /> : null; })}
                      {selB && selC ? (
                        <div className="er-box" style={{ left: selB.x * scale, top: selB.y * scale, width: selB.w * scale, height: selB.h * scale }}>
                          <span className="er-tag">{labelOf(selC)} · <span dir="ltr">{Math.round(selB.x)}, {Math.round(selB.y)}</span></span>
                          <span className="er-handle" data-handle />
                        </div>
                      ) : null}
                      {guides.map((g, i) => (g.v != null ? <div key={i} className="er-guide v" style={{ left: g.v * scale }} /> : <div key={i} className="er-guide h" style={{ top: (g.h ?? 0) * scale }} />))}
                    </>
                  ) : null}
                </div>
                {edit ? (
                  <div className="er-editbar">
                    <span className="er-chip" style={{ color: "var(--brand)", fontWeight: 700 }}>✎ {t("editMode")}</span>
                    <span className="er-chip">{t("sceneN", { n: s.n })}{s.label ? ` · ${s.label.slice(0, 28)}` : ""}</span>
                    <span className="er-chip er-hide-sm">{t("dragHint")} · <span className="er-kbd">← →</span> {t("nudge")}</span>
                  </div>
                ) : null}
                {!started && !edit && !overlay ? (
                  <button className="er-bigplay" onClick={play} aria-label={t("play")}>
                    <span><svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#14141c" /></svg></span>
                  </button>
                ) : null}
                {overlay ? (
                  <div className="er-rendering">
                    <div>
                      <b>{overlay.title}</b>
                      <div className="er-bar"><i style={{ width: `${overlay.k * 100}%` }} /></div>
                      <small dir="ltr">{renderActive ? `${Math.round(totalFrames * overlay.k)} / ${totalFrames}` : `${t("frame")} ${Math.round(totalFrames * overlay.k)} / ${totalFrames} · ${elapsed.toFixed(1)}s · $${(progress?.cost ?? 0).toFixed(3)}`}</small>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="er-transport">
                <div
                  ref={scrubRef}
                  className="er-scrub"
                  role="slider"
                  aria-label={t("time")}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(LEN)}
                  aria-valuenow={Math.round(tRef.current)}
                  tabIndex={0}
                  onPointerDown={(e) => { scrubbing.current = true; e.currentTarget.setPointerCapture(e.pointerId); if (edit) setEdit(false); setT(posT(e.clientX)); }}
                  onPointerMove={(e) => {
                    const x = posT(e.clientX), tip = tipRef.current, r = e.currentTarget.getBoundingClientRect();
                    if (tip) { tip.hidden = false; tip.textContent = `${fmt(x)} · ${t("sceneN", { n: scenes[sceneAt(x)]?.n ?? 1 })}`; tip.style.left = `${e.clientX - r.left}px`; }
                    if (scrubbing.current) setT(x);
                  }}
                  onPointerUp={() => (scrubbing.current = false)}
                  onPointerLeave={() => { if (tipRef.current) tipRef.current.hidden = true; }}
                  onKeyDown={(e) => { const rtl = getComputedStyle(e.currentTarget).direction === "rtl"; if (e.key === "ArrowLeft") { e.stopPropagation(); setT(tRef.current + (rtl ? 1 : -1)); } if (e.key === "ArrowRight") { e.stopPropagation(); setT(tRef.current - (rtl ? 1 : -1)); } }}
                >
                  <div className="er-track">{scenes.map((x, i) => <span key={x.n} className={`er-seg${i === scene ? " on" : ""}`} style={{ width: `${(x.dur / LEN) * 100}%` }} />)}</div>
                  <div className="er-fill" ref={fillRef} />
                  {drops.map((d) => <span key={d} className="er-drop" style={{ insetInlineStart: `${(d / LEN) * 100}%` }} />)}
                  <div className="er-knob" ref={knobRef} />
                  <div className="er-tip" ref={tipRef} hidden />
                </div>
                <div className="er-ctrls" dir="ltr">
                  <button className="er-ib" onClick={prevScene} title={`${t("prevScene")}  [`}>⏮</button>
                  <button className="er-ib" onClick={() => setT(tRef.current - 5)} title={`${t("back5")}  ←`}>↺5</button>
                  <button className="er-ib" onClick={() => { pause(); setT(tRef.current - 1 / FPS); }} title={`${t("frameBack")}  ,`}>‹</button>
                  <button className="er-ib main" onClick={toggle} title={`${t("playPause")}  ␣`} aria-label={playing ? t("pause") : t("play")}>
                    {playing ? <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="#fff" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#fff" /></svg>}
                  </button>
                  <button className="er-ib" onClick={() => { pause(); setT(tRef.current + 1 / FPS); }} title={`${t("frameFwd")}  .`}>›</button>
                  <button className="er-ib" onClick={() => setT(tRef.current + 5)} title={`${t("fwd5")}  →`}>5↻</button>
                  <button className="er-ib" onClick={() => goScene(Math.min(scenes.length - 1, sceneAt(tRef.current) + 1))} title={`${t("nextScene")}  ]`}>⏭</button>
                  <span className="er-time" ref={timeRef}>00:00.0 / {fmt(LEN)}</span>
                  <span className="er-sp" />
                  <button className="er-ib" aria-pressed={loop} onClick={() => { setLoop(!loop); toast(!loop ? t("loopOn", { n: s.n }) : t("loopOff")); }} title={t("loop")}>⟲</button>
                  <select className="er-sel" value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label={t("speed")}>
                    {[0.5, 1, 1.5, 2].map((x) => <option key={x} value={x}>{x}×</option>)}
                  </select>
                  <button className="er-ib" onClick={() => setMuted(!muted)} title={`${t("mute")}  M`}>{muted ? "🔇" : "🔊"}</button>
                  <input className="er-vol" type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { setVolume(+e.target.value); setMuted(false); }} aria-label={t("volume")} />
                  <button className="er-ib" aria-pressed={edit} onClick={() => setEdit(!edit)} title={`${t("editScene")}  E`} disabled={comp === "none"}>✎</button>
                  <button className="er-ib er-hide-sm" onClick={fullscreen} title={`${t("fullscreen")}  F`}>⛶</button>
                </div>
              </div>
            </div>

            <div className="er-panel er-timeline">
              <p className="er-label">{t("timelineLabel")}</p>
              <div className="er-lanes">
                <div className="er-lanesin">
                  <div className="er-scenes">
                    {scenes.map((x, i) => (
                      <button key={x.n} className={`er-scn${i === scene ? " on" : ""}${busyScene === i ? " busy" : ""}`} style={{ width: `calc(${(x.dur / LEN) * 100}% - 4px)` }} aria-label={x.label || t("sceneN", { n: x.n })} onClick={() => { pause(); goScene(i, Math.min(1.2, x.dur * 0.4)); }}>
                        <div className="er-th">{current.mp4Url ? <video src={`${current.mp4Url}#t=${pose(i).toFixed(2)}`} preload="metadata" muted playsInline tabIndex={-1} /> : null}</div>
                        {dirty.includes(i) ? <span className="er-edited">EDITED</span> : null}
                        <div className="er-cap"><b>{String(x.n).padStart(2, "0")}</b><span dir={scriptDir}>{x.label}</span><em>{x.dur.toFixed(1)}s</em></div>
                      </button>
                    ))}
                  </div>
                  <div className="er-beats" style={{ ["--bw" as string]: BEAT ? `${(BEAT / LEN) * 100}%` : "100%" }}>
                    <span className="er-lab">♪ {bpm ? `${bpm} BPM · ` : ""}◆ drops</span>
                    {drops.map((d) => <span key={d} className="er-dr" style={{ insetInlineStart: `${(d / LEN) * 100}%` }} title={`drop ${d}s`} />)}
                  </div>
                  <div className="er-phead" ref={pheadRef} />
                </div>
              </div>
            </div>
          </div>

          <aside className="er-panel er-insp" aria-label={t("inspector")}>
            <div className="er-tabs" role="tablist">
              {(["scene", "el", "ai", "ver"] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(`tab.${k}`)}</button>)}
            </div>
            <div className="er-pane">
              {tab === "scene" && s ? (
                <>
                  {pending}
                  <div>
                    <p className="er-label">{t("sceneN", { n: s.n })} · <span dir="ltr">{s.start.toFixed(2)}s → {s.end.toFixed(2)}s</span></p>
                    <div className="er-chips">
                      <button className={`er-btn small${edit ? "" : " lit"}`} onClick={() => setEdit(!edit)} disabled={comp === "none"}>{edit ? `✓ ${t("endEdit")}` : `✎ ${t("moveOnScreen")}`}</button>
                      <button className="er-btn ghost small" onClick={() => { setEdit(false); setLoop(false); setT(s.start); play(); }}>▶ {t("playScene")}</button>
                    </div>
                  </div>
                  {comp === "none" ? <p className="er-hint">{t("compNone")}</p> : comp === "loading" ? <p className="er-hint">{t("compLoading")}</p> : null}
                  {(sTexts.length ? sTexts.slice(0, 2) : []).map((c, i) => (
                    <label key={c.sel} className="er-field">
                      <span>{i === 0 ? t("headline") : t("subline")}</span>
                      <textarea rows={2} dir={scriptDir} value={textOf(c)} onChange={(e) => setTextOf(c, e.target.value)} />
                    </label>
                  ))}
                  {!sTexts.length && s.beat.lines?.length ? (
                    <div className="er-field"><span>{t("headline")}</span><p className="er-hint" dir={scriptDir}>{s.beat.lines.join(" · ")}</p></div>
                  ) : null}
                  <div className="er-field">
                    <span>{t("background")}</span>
                    <div className="er-chips">{BGS.map((k) => <button key={k} className="er-chip" onClick={() => prefill(t(`ask.${k}`))}>{t(k)}</button>)}</div>
                  </div>
                  <div className="er-field">
                    <span>{t("headlineMotion")}</span>
                    <div className="er-chips">{ANIMS.map((k) => <button key={k} className="er-chip" onClick={() => prefill(t("ask.headlineMotion", { m: t(`anim.${k}`) }))}>{t(`anim.${k}`)}</button>)}</div>
                    <p className="er-hint">{t("viaDirector")}</p>
                  </div>
                  <div className="er-field">
                    <span>{t("onBeat")}</span>
                    <p className="er-hint" style={{ margin: 0 }}>
                      {beatsIn && BEAT ? <><b className="er-mono" style={{ color: "var(--ink)" }}>{t("beats", { n: beatsIn })}</b> × <span dir="ltr">{BEAT.toFixed(3)}s</span> — {t("cutsOnBeat")} </> : `${s.dur.toFixed(2)}s · `}
                      {onDrop ? t("startsOnDrop") : ""}
                    </p>
                  </div>
                  <div className="er-field">
                    <span>{t("elements")}</span>
                    <div className="er-layers">
                      {sceneCands.map((c) => (
                        <button key={c.sel} className={`er-layer${sel === c.sel ? " on" : ""}`} onClick={(ev) => {
                          if ((ev.target as HTMLElement).closest("[data-eye]")) { pushUndo(); change(c.sel, { hidden: !edits[c.sel]?.hidden }); return; }
                          if (!edit) setEdit(true);
                          setSel(c.sel);
                          setTab("el");
                        }}>
                          <span className="k">{c.global ? "LOGO" : KIND_TAG[c.kind]}</span>
                          <span dir={c.kind === "text" ? scriptDir : undefined}>{labelOf(c)}</span>
                          <span className="eye" data-eye role="button" aria-label={edits[c.sel]?.hidden ? t("show") : t("hide")}>{edits[c.sel]?.hidden ? "◌" : "◉"}</span>
                        </button>
                      ))}
                      {comp === "ready" && !sceneCands.length ? <p className="er-hint">{t("noElements")}</p> : null}
                    </div>
                  </div>
                </>
              ) : null}

              {tab === "el" ? (
                !selC || !selE ? (
                  <>
                    {pending}
                    <p className="er-hint">{t("elHint")}</p>
                    <button className="er-btn lit small" onClick={() => setEdit(true)} disabled={comp === "none"}>✎ {t("startEdit")}</button>
                  </>
                ) : (
                  <>
                    {pending}
                    <p className="er-label">{labelOf(selC)}</p>
                    <div className="er-nums">
                      <label className="er-num">X<input type="number" value={Math.round(selB?.x ?? 0)} onChange={(e) => { if (!selB) return; pushUndo(); change(selC.sel, { dx: (selE.dx ?? 0) + (+e.target.value - selB.x) }); }} /></label>
                      <label className="er-num">Y<input type="number" value={Math.round(selB?.y ?? 0)} onChange={(e) => { if (!selB) return; pushUndo(); change(selC.sel, { dy: (selE.dy ?? 0) + (+e.target.value - selB.y) }); }} /></label>
                      <label className="er-num">W<input type="number" value={Math.round(selB?.w ?? 0)} onChange={(e) => { if (!selB || +e.target.value < 10) return; pushUndo(); change(selC.sel, { scale: +((selE.scale ?? 1) * (+e.target.value / selB.w)).toFixed(4) }); }} /></label>
                    </div>
                    <div className="er-field">
                      <span>{t("align")}</span>
                      <div className="er-chips">
                        {(["r", "cx", "l", "t", "cy", "b"] as const).map((al) => (
                          <button key={al} className="er-chip" onClick={() => {
                            if (!selB) return;
                            pushUndo();
                            const mx = W * 0.0417, my = H * 0.0556;
                            const nx = al === "r" ? W - mx - selB.w : al === "l" ? mx : al === "cx" ? (W - selB.w) / 2 : selB.x;
                            const ny = al === "t" ? my : al === "b" ? H - my - selB.h : al === "cy" ? (H - selB.h) / 2 : selB.y;
                            change(selC.sel, { dx: Math.round((selE.dx ?? 0) + nx - selB.x), dy: Math.round((selE.dy ?? 0) + ny - selB.y) });
                          }}>{t(`al.${al}`)}</button>
                        ))}
                      </div>
                    </div>
                    {selC.kind === "text" ? (
                      <label className="er-field"><span>{t("text")}</span><textarea rows={3} dir={scriptDir} value={textOf(selC)} onChange={(e) => setTextOf(selC, e.target.value)} /></label>
                    ) : null}
                    {selC.global ? <p className="er-hint">{t("cornerHint")}</p> : (
                      <>
                        <div className="er-field">
                          <span>{t("motion")}</span>
                          <div className="er-chips">{ANIMS.filter((k) => (k === "words" || k === "type" ? selC.kind === "text" : true)).map((k) => <button key={k} className="er-chip" onClick={() => prefill(t("ask.elMotion", { el: labelOf(selC), m: t(`anim.${k}`) }))}>{t(`anim.${k}`)}</button>)}</div>
                        </div>
                        <ElTiming key={selC.sel} max={Math.max(1, s.dur - 1)} onAsk={(delay, dur) => prefill(t("ask.elTiming", { el: labelOf(selC), d: delay.toFixed(1), u: dur.toFixed(1) }))} labels={{ start: t("startsAfter"), dur: t("duration"), ask: t("askTiming") }} />
                        <p className="er-hint">{t("viaDirector")}</p>
                        <button className="er-btn ghost small" onClick={preview}>▶ {t("watchMotion")}</button>
                      </>
                    )}
                    <div className="er-chips">
                      <button className="er-btn ghost small" onClick={() => { pushUndo(); change(selC.sel, { hidden: !selE.hidden }); }}>{selE.hidden ? `◉ ${t("show")}` : `◌ ${t("hide")}`}</button>
                      <button className="er-btn ghost small" onClick={() => restoreEl(selC.sel)}>↺ {t("reset")}</button>
                    </div>
                  </>
                )
              ) : null}

              {tab === "ai" ? (
                <>
                  <p className="er-label">{t("askLabel", { n: s.n })}</p>
                  <div className="er-ask">
                    <label className="er-field">
                      <span>{t("askWhat")}</span>
                      <textarea rows={3} dir={scriptDir} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("askPlaceholder")} disabled={generating} />
                    </label>
                    <div className="er-chips">{(["bigger", "deviceRight", "strongerBg", "fasterTitle", "textUp"] as const).map((k) => <button key={k} className="er-chip" onClick={() => setAsk((a) => (a ? `${a}، ${t(`sug.${k}`)}` : t(`sug.${k}`)))} disabled={generating}>{t(`sug.${k}`)}</button>)}</div>
                    <button className="er-btn lit" onClick={() => onAsk()} disabled={generating || busy === "ask"}>✦ {t("askGo", { n: s.n })}</button>
                    {generating && genMode === "edit" ? (
                      <div>
                        <div className="er-steps">
                          {(["read", "design", "review", "check", "render"] as const).map((k, i) => <div key={k} className={i < stepIdx ? "ok" : i === stepIdx ? "on" : ""}><i>{i < stepIdx ? "✓" : i + 1}</i>{t(`step.${k}`)}</div>)}
                        </div>
                        <div className="er-meters" style={{ marginTop: 10 }}>
                          <div>{t("mTime")}<b>{elapsed.toFixed(1)}s</b></div>
                          <div>{t("mCost")}<b>${(progress?.cost ?? 0).toFixed(3)}</b></div>
                          <div>{t("mFrames")}<b>{stepIdx >= 4 ? totalFrames : 0}</b></div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <p className="er-hint">{t("askNote")}</p>
                </>
              ) : null}

              {tab === "ver" ? (
                <>
                  {pending}
                  <p className="er-label">{t("tab.ver")}</p>
                  <div className="er-vers">
                    {versions.map((v) => (
                      <div key={v.version} className={`er-ver${v.version === current.version ? " on" : ""}`}>
                        <span className="v">V{v.version}</span>
                        <span>
                          {versionNote(v, t)}
                          <small>{new Date(v.at).toLocaleString(locale, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })} · {v.version === current.version ? t("currentVer") : t("tapRestore")}</small>
                        </span>
                        <span className="c">${v.costUsd.toFixed(3)}</span>
                        {v.version === current.version ? null : <button className="er-btn ghost small" style={{ gridColumn: "1/-1" }} onClick={() => onRestore(v.version)} disabled={generating || busy === "restore"}>↺ {t("restore", { v: v.version })}</button>}
                      </div>
                    ))}
                  </div>
                  <p className="er-hint">{t("versionsHint")}</p>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
      <div className="er-toast" ref={toastRef} role="status" />
    </div>
  );
}

function versionNote(v: RoomVersion, t: ReturnType<typeof useTranslations<"editRoom">>) {
  if (v.origin === "restore") return t("note.restore", { v: v.restored ?? "?" });
  if (v.origin === "undo") return t("note.undo");
  if (v.origin === "rerender") return t("note.manual", { n: v.edits });
  if (v.origin === "edit") return v.request ? t("note.director", { q: v.request.slice(0, 48) }) : t("note.directorPlain");
  if (v.origin === "lines") return t("note.lines");
  if (v.origin === "direction") return t("note.direction");
  return t("note.first");
}

/** start / length of an element's entrance: the director re-times it (the canvas moves, it does not re-animate) */
function ElTiming({ max, onAsk, labels }: { max: number; onAsk: (delay: number, dur: number) => void; labels: { start: string; dur: string; ask: string } }) {
  const [delay, setDelay] = useState(0.3);
  const [dur, setDur] = useState(0.6);
  return (
    <>
      <div className="er-range"><span>{labels.start}</span><input type="range" min={0} max={max.toFixed(1)} step={0.1} value={delay} onChange={(e) => setDelay(+e.target.value)} /><b>{delay.toFixed(1)}s</b></div>
      <div className="er-range"><span>{labels.dur}</span><input type="range" min={0.2} max={3} step={0.1} value={dur} onChange={(e) => setDur(+e.target.value)} /><b>{dur.toFixed(1)}s</b></div>
      <button className="er-btn ghost small" onClick={() => onAsk(delay, dur)}>{labels.ask}</button>
    </>
  );
}
