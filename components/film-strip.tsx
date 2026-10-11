import type { ReactNode } from "react";

function Sprockets({ count }: { count: number }) {
  return (
    <div className="flex h-7 items-center justify-between gap-2 px-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-2.5 w-4 shrink-0 rounded-[3px] bg-white" />
      ))}
    </div>
  );
}

/** Lavender film strip with white sprocket holes framing its children. */
export function FilmStrip({
  children,
  holes = 14,
  className = "",
}: {
  children: ReactNode;
  holes?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-panel bg-primary-lavender ${className}`}>
      <Sprockets count={holes} />
      <div className="mx-3 overflow-hidden rounded-2xl bg-white">{children}</div>
      <Sprockets count={holes} />
    </div>
  );
}
