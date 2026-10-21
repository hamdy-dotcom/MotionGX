import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-er-mono", display: "swap" });

/** The studio (older versions) sits on a white sheet (page.tsx); the edit room brings its own paper stage. */
export default function VideoLayout({ children }: { children: ReactNode }) {
  return <div className={`s-screen ${mono.variable}`}>{children}</div>;
}
