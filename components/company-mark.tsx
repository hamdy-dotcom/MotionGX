import type { BrandColor } from "@/lib/types";

/** Logo image if we have one, otherwise the first letter on the brand's primary color. */
export function CompanyMark({
  name,
  logoUrl,
  colors,
  size = "size-11",
}: {
  name: string;
  logoUrl?: string | null;
  colors?: BrandColor[];
  size?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, short-lived
    return <img src={logoUrl} alt="" className={`${size} shrink-0 rounded-2xl bg-white object-contain p-1`} />;
  }
  const color = colors?.[0]?.hex ?? "#5558E3";
  return (
    <span
      aria-hidden="true"
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}

export function ColorDots({ colors }: { colors: BrandColor[] }) {
  return (
    <span className="flex items-center [&>*+*]:-ms-1.5">
      {colors.slice(0, 3).map((c, i) => (
        <span
          key={`${c.hex}-${i}`}
          title={c.hex}
          className="size-5 rounded-full border-2 border-white"
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </span>
  );
}
