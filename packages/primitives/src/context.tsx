import React, { createContext, useContext } from "react";
import type { MotionInput } from "./types";

const MotionContext = createContext<MotionInput | null>(null);

/** Provided by the runtime around every generated composition. */
export const MotionProvider: React.FC<{ value: MotionInput; children: React.ReactNode }> = ({ value, children }) => (
  <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
);

/** The video input: brand, palette, fonts, script, energy map, size. */
export function useMotion(): MotionInput {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion() must be used inside the MotionGX runtime");
  return ctx;
}

/** 1 unit = 1px on a 1080 short side. */
export function useUnit() {
  const { width, height } = useMotion();
  return Math.min(width, height) / 1080;
}
