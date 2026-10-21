import type { ReactNode } from "react";

/** This screen keeps its own design; inside the studio it sits on a white sheet. */
export default function SheetLayout({ children }: { children: ReactNode }) {
  return <div className="s-sheet s-screen">{children}</div>;
}
