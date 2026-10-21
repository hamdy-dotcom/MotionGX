import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import { StudioShell } from "@/components/studio/shell";
import "../../studio.css";

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono", display: "swap" });

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className={mono.variable}>
      <StudioShell>{children}</StudioShell>
    </div>
  );
}
