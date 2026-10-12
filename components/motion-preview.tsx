"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";

export type PreviewHandle = { seek: (frame: number) => void; toggle: () => void; play: () => void; pause: () => void };

export type PreviewProps = {
  /** compiled composition (CommonJS) — evaluated only inside the sandboxed iframe */
  code: string;
  input: unknown;
  audio: { music: string | null; sfx: string | null; voiceover: string | null };
};

/**
 * The live preview. Generated code never runs in the app's origin: the Player lives in an
 * `<iframe sandbox="allow-scripts" srcdoc>` (opaque origin — no cookies, storage or session) that
 * loads /preview/runtime.js and receives its props by postMessage.
 */
export function MotionPreview({
  props,
  ref,
  onFrame,
  onPlaying,
  onError,
  title,
}: {
  props: PreviewProps;
  ref?: Ref<PreviewHandle>;
  onFrame?: (frame: number) => void;
  onPlaying?: (playing: boolean) => void;
  onError?: (message: string) => void;
  title: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onFrame, onPlaying, onError });
  useEffect(() => {
    callbacks.current = { onFrame, onPlaying, onError };
  });

  const srcDoc = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const csp = [
      "default-src 'none'",
      // 'unsafe-eval': the runtime evaluates the compiled composition with new Function (inside this sandbox only).
      `script-src ${origin} 'unsafe-eval'`,
      "style-src 'unsafe-inline'",
      "font-src https: data:",
      "img-src https: data: blob:",
      `media-src https: data: blob: ${origin}`,
      "connect-src https: data: blob:",
    ].join("; ");
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>html,body,#root{margin:0;height:100%;overflow:hidden;background:transparent}</style></head><body><div id="root"></div><script type="module" src="${origin}/preview/runtime.js"></script></body></html>`;
  }, []);

  const post = (msg: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage(msg, "*");

  useImperativeHandle(ref, () => ({
    seek: (frame) => post({ type: "mgx:seek", frame }),
    toggle: () => post({ type: "mgx:toggle" }),
    play: () => post({ type: "mgx:play" }),
    pause: () => post({ type: "mgx:pause" }),
  }));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data || typeof e.data !== "object") return;
      const msg = e.data as { type?: string; frame?: number; playing?: boolean; message?: string };
      if (msg.type === "mgx:ready") setReady(true);
      else if (msg.type === "mgx:frame" && typeof msg.frame === "number") callbacks.current.onFrame?.(msg.frame);
      else if (msg.type === "mgx:playing") callbacks.current.onPlaying?.(Boolean(msg.playing));
      else if (msg.type === "mgx:error") callbacks.current.onError?.(String(msg.message ?? ""));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (ready) frameRef.current?.contentWindow?.postMessage({ type: "mgx:props", props }, "*");
  }, [ready, props]);

  return <iframe ref={frameRef} title={title} sandbox="allow-scripts" srcDoc={srcDoc} className="block size-full border-0" allow="autoplay" />;
}
