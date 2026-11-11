// Original product drawings (no photos). Quiet Hour is drawn calm and flat; MegaBoom is drawn loud.

function OverEar({ band = "#2b3a33", cup = "#3f5249", pad = "#c9d4ce", bg = "#dfe7e2" }) {
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label="Over-ear headphones" className="h-full w-full">
      <rect width="240" height="200" fill={bg} />
      <path d="M62 120 C62 52 178 52 178 120" fill="none" stroke={band} strokeWidth="11" strokeLinecap="round" />
      <path d="M70 116 C72 64 168 64 170 116" fill="none" stroke={pad} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <rect x="40" y="108" width="42" height="62" rx="18" fill={cup} />
      <rect x="158" y="108" width="42" height="62" rx="18" fill={cup} />
      <rect x="74" y="114" width="12" height="50" rx="6" fill={pad} />
      <rect x="154" y="114" width="12" height="50" rx="6" fill={pad} />
      <circle cx="61" cy="139" r="4" fill={pad} opacity=".6" />
    </svg>
  );
}

function Buds() {
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label="Earbuds in a case" className="h-full w-full">
      <rect width="240" height="200" fill="#dfe7e2" />
      <rect x="62" y="96" width="116" height="66" rx="30" fill="#3f5249" />
      <rect x="62" y="96" width="116" height="20" rx="10" fill="#2b3a33" />
      <circle cx="120" cy="146" r="3" fill="#7fd3b0" />
      <g fill="#f4f7f5" stroke="#2b3a33" strokeWidth="3">
        <path d="M86 46 a16 16 0 1 1 0 32 l-4 24 a5 5 0 0 1 -10 0 l2 -30 a16 16 0 0 1 12 -26z" />
        <path d="M156 46 a16 16 0 1 0 0 32 l4 24 a5 5 0 0 0 10 0 l-2 -30 a16 16 0 0 0 -12 -26z" />
      </g>
    </svg>
  );
}

function Stand() {
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label="Walnut headphone stand" className="h-full w-full">
      <rect width="240" height="200" fill="#dfe7e2" />
      <path d="M92 52 h56 a8 8 0 0 1 8 8 v6 h-26 v96 h-20 v-96 h-26 v-6 a8 8 0 0 1 8 -8z" fill="#7a4a2a" />
      <path d="M100 58 h40" stroke="#9c6a45" strokeWidth="3" strokeLinecap="round" />
      <rect x="72" y="160" width="96" height="14" rx="7" fill="#5c361d" />
    </svg>
  );
}

function Boom() {
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label="Glossy headphones with flames" className="h-full w-full">
      <defs>
        <radialGradient id="burst" cx="50%" cy="55%" r="65%">
          <stop offset="0" stopColor="#ffe14d" />
          <stop offset=".55" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ff4d12" />
        </radialGradient>
      </defs>
      <rect width="240" height="200" fill="url(#burst)" />
      <g fill="#fff" opacity=".35">
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d="M120 110 L112 -20 L128 -20 Z" transform={`rotate(${i * 30} 120 110)`} />
        ))}
      </g>
      <path d="M58 122 C58 46 182 46 182 122" fill="none" stroke="#111" strokeWidth="14" strokeLinecap="round" />
      <rect x="34" y="108" width="48" height="66" rx="20" fill="#111" />
      <rect x="158" y="108" width="48" height="66" rx="20" fill="#111" />
      <circle cx="58" cy="141" r="14" fill="#ff2d55" />
      <circle cx="182" cy="141" r="14" fill="#ff2d55" />
      <text x="120" y="190" textAnchor="middle" fontFamily="Impact, Arial Black, sans-serif" fontSize="20" fill="#111" fontStyle="italic">
        PRO MAX
      </text>
    </svg>
  );
}

export function ProductArt({ id }: { id: string }) {
  if (id === "qh-buds") return <Buds />;
  if (id === "qh-stand") return <Stand />;
  if (id === "mb-x1") return <Boom />;
  return <OverEar />;
}
