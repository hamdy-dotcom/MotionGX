"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

/** the story's steps: follows the page, and keeps the current step in view on a phone */
export function StoryNav({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const nav = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.getAttribute("data-step");
        setCurrent((c) => (e.isIntersecting ? id : c === id ? null : c));
      }
    }, { rootMargin: "-40% 0px -55% 0px" });
    for (const { id } of items) {
      const section = document.getElementById(id)?.parentElement;
      if (section) { section.setAttribute("data-step", id); io.observe(section); }
    }
    return () => io.disconnect();
  }, [items]);
  useEffect(() => {
    const n = nav.current, pill = current ? n?.querySelector<HTMLElement>(`[href="#${current}"]`) : null;
    if (!n || !pill || n.scrollWidth <= n.clientWidth) return;
    const a = n.getBoundingClientRect(), b = pill.getBoundingClientRect();
    n.scrollBy({ left: b.left + b.width / 2 - (a.left + a.width / 2), behavior: "smooth" });
  }, [current]);
  return <nav ref={nav} className="s-lp-pills" aria-label={label}>{items.map((it) => <a key={it.id} href={`#${it.id}`} aria-current={current === it.id ? "step" : undefined}>{it.label}</a>)}</nav>;
}
