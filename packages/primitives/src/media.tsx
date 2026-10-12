// Safe media: the brand logo (with an automatic plate), brand images from the site, device frames.
import React from "react";
import { Img } from "remotion";
import { useMotion, useUnit } from "./context";

/** The company logo. `plate: "auto"` puts dark logos on a light plate over a dark canvas. */
export const BrandLogo: React.FC<{ width: number; plate?: "auto" | "light" | "dark" | "none"; style?: React.CSSProperties }> = ({ width, plate = "auto", style }) => {
  const { brand, palette, fonts } = useMotion();
  const u = useUnit();
  const usePlate = plate === "auto" ? brand.logoPlate : plate !== "none";
  if (!brand.logoUrl) {
    return (
      <div
        style={{
          width,
          height: width * 0.6,
          borderRadius: width * 0.14,
          background: palette.gradient,
          color: palette.onPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.head,
          fontWeight: 800,
          fontSize: width * 0.22,
          whiteSpace: "nowrap",
          ...style,
        }}
      >
        {brand.name}
      </div>
    );
  }
  const img = <Img src={brand.logoUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
  if (!usePlate) return <div style={{ width, height: width * 0.6, ...style }}>{img}</div>;
  return (
    <div
      style={{
        width,
        height: width * 0.6,
        padding: width * 0.08,
        borderRadius: width * 0.12,
        background: plate === "dark" ? palette.bg : "#FFFFFF",
        boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.3)`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {img}
    </div>
  );
};

/** A brand image scraped from the site, or null when the brand has none (design an alternative). */
export const BrandImage: React.FC<{ index?: number; fit?: "cover" | "contain"; style?: React.CSSProperties }> = ({ index = 0, fit = "cover", style }) => {
  const { brand } = useMotion();
  const src = brand.imageUrls[index % Math.max(1, brand.imageUrls.length)];
  if (!src) return null;
  return <Img src={src} style={{ width: "100%", height: "100%", objectFit: fit, ...style }} />;
};

/** Device frames to hold invented UI. Children fill the screen area. */
export const DeviceFrame: React.FC<{ kind: "phone" | "tablet" | "laptop" | "browser"; width: number; screenColor?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  kind,
  width,
  screenColor,
  style,
  children,
}) => {
  const { palette } = useMotion();
  const bezel = palette.dark ? "#1B1F2A" : "#E7E8EF";
  const screen = screenColor ?? palette.bg;
  if (kind === "browser" || kind === "laptop") {
    const h = width * 0.62;
    return (
      <div style={{ width, ...style }}>
        <div style={{ width, height: h, borderRadius: width * 0.02, background: bezel, padding: width * 0.012, boxSizing: "border-box", boxShadow: "0 40px 120px rgba(0,0,0,0.35)" }}>
          {kind === "browser" ? (
            <div style={{ height: width * 0.03, display: "flex", gap: width * 0.008, alignItems: "center", paddingInlineStart: width * 0.01 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: width * 0.012, height: width * 0.012, borderRadius: "50%", background: palette.textDim }} />
              ))}
            </div>
          ) : null}
          <div style={{ width: "100%", height: kind === "browser" ? `calc(100% - ${width * 0.03}px)` : "100%", borderRadius: width * 0.012, overflow: "hidden", background: screen, position: "relative" }}>{children}</div>
        </div>
        {kind === "laptop" ? <div style={{ width: width * 1.12, marginInlineStart: -width * 0.06, height: width * 0.03, borderRadius: `0 0 ${width * 0.03}px ${width * 0.03}px`, background: bezel }} /> : null}
      </div>
    );
  }
  const ratio = kind === "phone" ? 2.05 : 1.35;
  return (
    <div style={{ width, height: width * ratio, borderRadius: width * 0.13, background: bezel, padding: width * 0.035, boxSizing: "border-box", boxShadow: "0 50px 140px rgba(0,0,0,0.4)", ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.1, overflow: "hidden", background: screen, position: "relative" }}>{children}</div>
    </div>
  );
};
