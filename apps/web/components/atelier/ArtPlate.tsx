import { cn } from "@/lib/format";

/**
 * Generative "campaign imagery" for the Atelier concept. Abstract still-life
 * compositions (arches, folded linen, low sun) stand in for real campaign
 * photography, which would come from the client's DAM or an authorised
 * image provider. Labelled as placeholder art direction.
 */
const PALETTES = [
  { sky: ["#efe3cc", "#d9c3a0"], sun: "#c8a96a", arch: "#a0574a", fold: ["#f8f4ec", "#e6dcc8"], ground: "#7d6a52" },
  { sky: ["#e8ece2", "#c9d1bd"], sun: "#f1e3c4", arch: "#7d8b6f", fold: ["#f6f3ea", "#dfe3d4"], ground: "#5a6650" },
  { sky: ["#f1e2dc", "#d8b5a8"], sun: "#f6efe5", arch: "#8a4a3f", fold: ["#faf3ef", "#ecd8cf"], ground: "#6d4038" },
  { sky: ["#2a2622", "#4a4038"], sun: "#c8a96a", arch: "#6b5a44", fold: ["#d8ccb6", "#a8987c"], ground: "#191714" },
  { sky: ["#ebe6dc", "#cfc6b4"], sun: "#9c7e45", arch: "#4a4640", fold: ["#f8f4ec", "#ddd3c0"], ground: "#8a8378" },
  { sky: ["#f3ead8", "#e2cfa7"], sun: "#fff8ea", arch: "#9c7e45", fold: ["#fbf7ef", "#eadfc8"], ground: "#a0574a" },
];

export function ArtPlate({ variant = 0, className, label = true, title }: { variant?: number; className?: string; label?: boolean; title?: string }) {
  const p = PALETTES[variant % PALETTES.length];
  const id = `art${variant}`;
  return (
    <div className={cn("relative overflow-hidden grain", className)} role="img" aria-label={title ? `${title} — placeholder art direction` : "Placeholder campaign art direction"}>
      <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="1" stopColor={p.sky[1]} />
          </linearGradient>
          <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={p.fold[0]} />
            <stop offset="1" stopColor={p.fold[1]} />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={p.sun} stopOpacity="0.9" />
            <stop offset="1" stopColor={p.sun} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="500" fill={`url(#${id}-sky)`} />
        <circle cx={variant % 2 ? 280 : 130} cy="170" r="140" fill={`url(#${id}-glow)`} />
        <circle cx={variant % 2 ? 280 : 130} cy="170" r="58" fill={p.sun} opacity="0.85" />
        {/* arches */}
        <path d={`M${variant % 2 ? 40 : 230} 500 V260 a70 70 0 0 1 140 0 V500 Z`} fill={p.arch} opacity="0.88" />
        <path d={`M${variant % 2 ? 70 : 260} 500 V280 a40 40 0 0 1 80 0 V500 Z`} fill={p.sky[0]} opacity="0.35" />
        {/* folded linen */}
        <path d="M-10 400 C 80 340, 160 430, 240 380 S 380 330, 420 370 V 520 H -10 Z" fill={`url(#${id}-fold)`} />
        <path d="M-10 430 C 90 390, 170 470, 260 420 S 380 400, 420 420" stroke={p.fold[1]} strokeWidth="2" fill="none" opacity="0.9" />
        <path d="M-10 455 C 100 420, 190 490, 280 450 S 390 440, 420 455" stroke={p.ground} strokeWidth="1" fill="none" opacity="0.35" />
        <rect y="482" width="400" height="18" fill={p.ground} opacity="0.5" />
      </svg>
      {label && (
        <span className="absolute left-3 top-3 rounded-full bg-ivory/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-graphite-soft backdrop-blur">
          Placeholder art
        </span>
      )}
    </div>
  );
}
