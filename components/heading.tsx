import type { ReactNode } from "react";

/** Weight-contrast heading: the <b> part is 700, the rest 200. Pass `t.rich(key, boldTag)`. */
export function Heading({
  as: Tag = "h2",
  className = "text-2xl",
  children,
}: {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`font-extralight leading-tight tracking-tight text-navy ${className}`}>{children}</Tag>;
}

export const boldTag = {
  b: (chunks: ReactNode) => <strong className="font-bold">{chunks}</strong>,
};
