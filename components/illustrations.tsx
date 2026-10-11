// Flat inline-SVG illustrations. Palette = design tokens only; no gradients, no stock art.

const C = {
  primary: "#5558E3",
  dark: "#3B3EC9",
  mid: "#A7A9F3",
  lavender: "#DCDDFA",
  light: "#EEEFFD",
  navy: "#10184A",
  teal: "#1BA89B",
  white: "#FFFFFF",
};

function sprockets(x: number, y: number, width: number, count: number) {
  const gap = width / count;
  return Array.from({ length: count }, (_, i) => (
    <rect key={i} x={x + i * gap + gap / 2 - 7} y={y} width="14" height="9" rx="2.5" fill={C.white} />
  ));
}

/** Hero: film strip + play button + pen-tool node + timeline with diamond keyframes. */
export function HeroIllustration({ label, className = "" }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 420 300" role="img" aria-label={label} className={className}>
      {/* back folder card */}
      <rect x="250" y="18" width="150" height="104" rx="18" fill={C.light} />
      <rect x="266" y="36" width="58" height="10" rx="5" fill={C.mid} />
      <rect x="266" y="56" width="104" height="8" rx="4" fill={C.lavender} />
      <rect x="266" y="72" width="80" height="8" rx="4" fill={C.lavender} />
      <circle cx="372" cy="98" r="9" fill={C.teal} />
      <circle cx="350" cy="98" r="9" fill={C.primary} />

      {/* film strip */}
      <g transform="rotate(-6 170 150)">
        <rect x="20" y="70" width="300" height="160" rx="22" fill={C.lavender} />
        {sprockets(28, 80, 284, 11)}
        {sprockets(28, 211, 284, 11)}
        <rect x="34" y="98" width="272" height="104" rx="14" fill={C.white} />
        <rect x="52" y="116" width="78" height="68" rx="10" fill={C.light} />
        <rect x="146" y="120" width="120" height="12" rx="6" fill={C.navy} />
        <rect x="146" y="142" width="88" height="10" rx="5" fill={C.mid} />
        <rect x="146" y="164" width="60" height="18" rx="9" fill={C.primary} />
        {/* play button */}
        <circle cx="91" cy="150" r="22" fill={C.primary} />
        <path d="M84 139v22l18-11z" fill={C.white} />
      </g>

      {/* pen-tool node */}
      <g>
        <path d="M300 156c40 -10 70 20 88 54" fill="none" stroke={C.dark} strokeWidth="3" strokeLinecap="round" />
        <line x1="300" y1="156" x2="352" y2="138" stroke={C.mid} strokeWidth="2" />
        <circle cx="352" cy="138" r="5" fill={C.white} stroke={C.dark} strokeWidth="2" />
        <rect x="292" y="148" width="16" height="16" rx="3" fill={C.white} stroke={C.primary} strokeWidth="3" />
        <path d="M376 196l14 28 8-12 13 2z" fill={C.navy} />
      </g>

      {/* timeline */}
      <rect x="40" y="262" width="350" height="8" rx="4" fill={C.lavender} />
      <rect x="40" y="262" width="190" height="8" rx="4" fill={C.primary} />
      {[90, 160, 300, 350].map((x) => (
        <rect
          key={x}
          x={x - 6}
          y={260}
          width="12"
          height="12"
          rx="2"
          fill={C.mid}
          stroke={C.white}
          strokeWidth="2.5"
          transform={`rotate(45 ${x} 266)`}
        />
      ))}
      <circle cx="230" cy="266" r="12" fill={C.white} stroke={C.primary} strokeWidth="5" />
    </svg>
  );
}

/** Stacked folders — used for company/empty states. */
export function FoldersIllustration({ label, className = "" }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 110" role="img" aria-label={label} className={className}>
      <path d="M22 20h36l10 10h66a8 8 0 0 1 8 8v52a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill={C.lavender} />
      <path d="M14 40h132v50a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8z" fill={C.mid} />
      <path d="M30 32h36l10 10h70a8 8 0 0 1 8 8v44a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8z" fill={C.primary} />
      <rect x="38" y="62" width="50" height="8" rx="4" fill={C.white} opacity=".9" />
      <rect x="38" y="76" width="32" height="8" rx="4" fill={C.lavender} />
      <circle cx="132" cy="80" r="8" fill={C.teal} />
    </svg>
  );
}

/** Deterministic voice waveform bars. */
export function Waveform({
  bars = 64,
  seed = 7,
  active = true,
  label,
  className = "",
}: {
  bars?: number;
  seed?: number;
  active?: boolean;
  label: string;
  className?: string;
}) {
  const rand = (i: number) => {
    const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const width = bars * 6;
  return (
    <svg viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" role="img" aria-label={label} className={className}>
      {Array.from({ length: bars }, (_, i) => {
        const h = 6 + Math.round(rand(i) * 28 * (0.55 + 0.45 * Math.sin((i / bars) * Math.PI)));
        return <rect key={i} x={i * 6 + 1} y={20 - h / 2} width="3.5" height={h} rx="1.75" fill={active ? C.teal : C.mid} />;
      })}
    </svg>
  );
}
