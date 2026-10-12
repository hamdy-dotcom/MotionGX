import React from "react";
import type { IconName } from "../lib/video/kit";

// Simple 24px stroke icons (no emoji, no icon fonts — renders identically everywhere).
const PATHS: Record<IconName, string> = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3ZM9 12l2 2 4-4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z",
  cart: "M3 4h2l2.4 11h11L21 7H6.5M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  wallet: "M3 7h18v12H3zM3 7l13-4v4M16 13h2",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  phone: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM11 18h2",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7M18 15c2.5.5 4 2.5 4 6",
  box: "m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10",
  check: "m4 12.5 5 5L20 6.5",
  store: "M3 9l2-5h14l2 5M3 9h18v11H3zM3 9c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3M10 20v-5h4v5",
  megaphone: "M3 10v4h4l7 5V5L7 10H3ZM18 8a5 5 0 0 1 0 8",
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11Z",
  gift: "M3 8h18v4H3zM5 12h14v9H5zM12 8v13M12 8S10 3 7.5 4 8 8 12 8ZM12 8s2-5 4.5-4S16 8 12 8Z",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h.01",
};

export const Icon: React.FC<{ name: IconName; size: number; color: string; strokeWidth?: number }> = ({ name, size, color, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[name] ?? PATHS.check} />
  </svg>
);

export const Cross: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
