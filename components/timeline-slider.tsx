"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { useRef } from "react";

/**
 * Timeline slider: lavender track, periwinkle fill, round knob and diamond keyframes.
 * Positions are percentages along the inline axis, so it reads start→end in both RTL and LTR.
 */
export function TimelineSlider({
  value,
  markers = [],
  onChange,
  label,
  valueText,
  className = "",
}: {
  value: number;
  markers?: number[];
  onChange?: (value: number) => void;
  label: string;
  valueText?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const interactive = Boolean(onChange);

  function valueAt(clientX: number) {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === "rtl";
    const fromStart = rtl ? rect.right - clientX : clientX - rect.left;
    return Math.min(100, Math.max(0, (fromStart / rect.width) * 100));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!onChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueAt(e.clientX));
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!onChange || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(valueAt(e.clientX));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onChange) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const step = e.shiftKey ? 10 : 2;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward || e.key === "ArrowUp") onChange(Math.min(100, value + step));
    else if (e.key === backward || e.key === "ArrowDown") onChange(Math.max(0, value - step));
    else if (e.key === "Home") onChange(0);
    else if (e.key === "End") onChange(100);
    else return;
    e.preventDefault();
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      aria-readonly={!interactive}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={`relative h-8 touch-none select-none ${interactive ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary-lavender" />
      <div
        className="absolute start-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: `${value}%` }}
      />
      {markers.map((m, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute top-1/2 size-3 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-white bg-primary-mid"
          style={{ insetInlineStart: `calc(${m}% - 6px)` }}
        />
      ))}
      <span
        aria-hidden="true"
        className="absolute top-1/2 size-6 -translate-y-1/2 rounded-full border-[5px] border-primary bg-white shadow-[0_4px_10px_rgba(85,88,227,.35)]"
        style={{ insetInlineStart: `calc(${value}% - 12px)` }}
      />
    </div>
  );
}
