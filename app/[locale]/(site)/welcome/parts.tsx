"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** a section that rises in once it's on screen */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { node.classList.add("in"); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return <div ref={el} className={`s-lp-reveal ${className}`}>{children}</div>;
}
