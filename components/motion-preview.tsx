"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export type PreviewHandle = { seek: (frame: number) => void; toggle: () => void; play: () => void; pause: () => void };

export type PreviewProps = {
  /** the MotionSpec (data) the engine renders */
  spec: unknown;
  /** vetted custom elements (compiled) — evaluated only inside the sandboxed iframe */
  custom?: Record<string, string>;
  input: unknown;
  audio: { music: string | null; sfx: string | null; voiceover: string | null };
};

/**
 * The live preview. Generated code never runs in the app's origin: the Player lives in
 * /preview/frame.html inside `<iframe sandbox="allow-scripts">` — without allow-same-origin the frame
 * gets an opaque origin (no cookies, storage, session or DOM access to the app). Its props arrive by
 * postMessage; it posts back ready / frame / playing / error.
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

  return <iframe ref={frameRef} title={title} sandbox="allow-scripts" src="/preview/frame.html" className="block size-full border-0" allow="autoplay" />;
}
