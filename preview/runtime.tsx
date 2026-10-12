// Preview runtime for the studio. Loaded by preview/frame.html inside <iframe sandbox="allow-scripts">, i.e. an
// opaque origin with no cookies, no storage and no access to the app. Generated composition code is
// evaluated only here (by MotionVideo), never in the app's origin. Props arrive by postMessage.
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { MotionVideo, type MotionVideoProps } from "../remotion/MotionVideo";

type Inbound =
  | { type: "mgx:props"; props: MotionVideoProps }
  | { type: "mgx:seek"; frame: number }
  | { type: "mgx:play" }
  | { type: "mgx:pause" }
  | { type: "mgx:toggle" };

const send = (msg: Record<string, unknown>) => window.parent.postMessage(msg, "*");

function App() {
  const [props, setProps] = useState<MotionVideoProps | null>(null);
  const ref = useRef<PlayerRef>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent<Inbound>) => {
      if (e.source !== window.parent || !e.data || typeof e.data !== "object") return;
      const msg = e.data;
      if (msg.type === "mgx:props") setProps(msg.props);
      else if (msg.type === "mgx:seek") ref.current?.seekTo(msg.frame);
      else if (msg.type === "mgx:play") ref.current?.play();
      else if (msg.type === "mgx:pause") ref.current?.pause();
      else if (msg.type === "mgx:toggle") ref.current?.toggle();
    };
    window.addEventListener("message", onMessage);
    send({ type: "mgx:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => send({ type: "mgx:frame", frame: e.detail.frame });
    const onPlay = () => send({ type: "mgx:playing", playing: true });
    const onPause = () => send({ type: "mgx:playing", playing: false });
    const onError = (e: { detail: { error: Error } }) => send({ type: "mgx:error", message: String(e.detail.error?.message ?? e.detail.error) });
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("error", onError);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("error", onError);
    };
  }, [props]);

  if (!props) return null;
  const { width, height, fps, durationInFrames } = props.input;
  return (
    <Player
      ref={ref}
      component={MotionVideo}
      inputProps={props}
      durationInFrames={durationInFrames}
      fps={fps}
      compositionWidth={width}
      compositionHeight={height}
      style={{ width: "100%", height: "100%" }}
      acknowledgeRemotionLicense
      clickToPlay
      numberOfSharedAudioTags={4}
    />
  );
}

createRoot(document.getElementById("root")!).render(<App />);
