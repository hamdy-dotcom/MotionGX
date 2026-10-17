import type { BrandColor } from "@/lib/types";

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** the surface a logo was designed for: on_dark → the brand's darkest colour, on_light → its lightest; unknown → none */
export function logoSurface(onDark: boolean | null | undefined, colors: BrandColor[] = []) {
  if (onDark == null) return undefined;
  const hexes = colors.map((c) => c.hex).filter((h) => /^#[0-9a-f]{6}$/i.test(h)).sort((a, b) => luminance(a) - luminance(b));
  if (onDark) return hexes[0] && luminance(hexes[0]) < 0.3 ? hexes[0] : "#0B0D12";
  const light = hexes.at(-1);
  return light && luminance(light) > 0.75 ? light : "#F4F5F8";
}

/** Logo image if we have one (on the surface it was designed for), otherwise the first letter on the brand's primary color. */
export function CompanyMark({
  name,
  logoUrl,
  logoOnDark,
  colors,
  size = "size-11",
}: {
  name: string;
  logoUrl?: string | null;
  /** brand.json logo.on_dark: true = a light logo made for dark backgrounds */
  logoOnDark?: boolean | null;
  colors?: BrandColor[];
  size?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, short-lived
    return <img src={logoUrl} alt="" className={`${size} shrink-0 rounded-2xl object-contain p-1`} style={{ backgroundColor: logoSurface(logoOnDark, colors) }} />;
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
