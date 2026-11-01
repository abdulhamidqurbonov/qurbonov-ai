// ============ Shinobu uchun sovg'alar va effektlar (SVG) ============

const PROP_SVG = {
  rose: `<svg viewBox="0 0 64 64"><path d="M32 30 C 30 42, 33 52, 31 62" stroke="#3f8f4a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M31 46 C 22 40, 18 46, 20 50 C 25 51, 29 49, 31 46 Z" fill="#4fae5b"/><path d="M32 52 C 40 46, 45 50, 43 54 C 38 55, 34 54, 32 52 Z" fill="#4fae5b"/>
    <path d="M32 8 C 20 8, 16 20, 20 27 C 24 34, 40 34, 44 27 C 48 20, 44 8, 32 8 Z" fill="#e2304b"/>
    <path d="M32 12 C 25 13, 23 20, 27 24 C 30 27, 36 26, 38 22 C 40 17, 37 12, 32 12 Z" fill="#ff5a70"/>
    <path d="M30 16 C 33 15, 35 18, 33 21 M26 22 C 30 26, 37 25, 40 20" stroke="#b81d36" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
  teddy: `<svg viewBox="0 0 64 64"><circle cx="16" cy="14" r="8" fill="#b9814f"/><circle cx="48" cy="14" r="8" fill="#b9814f"/><circle cx="16" cy="14" r="4" fill="#e7b98a"/><circle cx="48" cy="14" r="4" fill="#e7b98a"/>
    <ellipse cx="32" cy="46" rx="17" ry="15" fill="#b9814f"/><ellipse cx="32" cy="48" rx="9" ry="9" fill="#e7b98a"/>
    <circle cx="32" cy="24" r="15" fill="#c98f5a"/><ellipse cx="32" cy="30" rx="7" ry="5.5" fill="#efc69b"/>
    <circle cx="26" cy="22" r="2.2" fill="#2a1d14"/><circle cx="38" cy="22" r="2.2" fill="#2a1d14"/><ellipse cx="32" cy="28" rx="2.6" ry="2" fill="#2a1d14"/>
    <path d="M29 32 Q 32 34.5 35 32" stroke="#2a1d14" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M24 38 l8 4 8 -4 -2 6 -6 -2 -6 2 z" fill="#e2304b"/><circle cx="32" cy="41" r="2.2" fill="#ff5a70"/></svg>`,
  chocolate: `<svg viewBox="0 0 64 64"><rect x="12" y="10" width="40" height="46" rx="4" fill="#6b3d26"/>
    <g fill="#83502f">${[0, 1, 2].map((r) => [0, 1].map((c) => `<rect x="${16 + c * 17}" y="${14 + r * 13}" width="15" height="11" rx="2"/>`).join('')).join('')}</g>
    <path d="M10 34 H 54 V 58 H 10 Z" fill="#e2304b"/><path d="M10 38 H 54" stroke="#ffd36b" stroke-width="2.5"/><text x="32" y="52" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="sans-serif">CHOCO</text></svg>`,
  cake: `<svg viewBox="0 0 64 64"><rect x="31" y="6" width="2.5" height="10" fill="#ffd36b"/><path d="M32.2 2 C 30 5, 31 7, 32.2 7 C 34 7, 34.5 5, 32.2 2 Z" fill="#ff9a3c"/>
    <path d="M10 30 H 54 V 54 C 54 57, 10 57, 10 54 Z" fill="#f7d9b0"/><path d="M10 40 H 54" stroke="#e98fa6" stroke-width="5"/>
    <path d="M8 30 C 8 20, 56 20, 56 30 C 52 34, 48 30, 44 34 C 40 30, 36 34, 32 30 C 28 34, 24 30, 20 34 C 16 30, 12 34, 8 30 Z" fill="#fff4f6"/>
    <circle cx="20" cy="24" r="3.2" fill="#e2304b"/><circle cx="32" cy="22" r="3.2" fill="#e2304b"/><circle cx="44" cy="24" r="3.2" fill="#e2304b"/></svg>`,
  apple: `<svg viewBox="0 0 64 64"><path d="M32 18 C 22 10, 8 16, 10 34 C 12 50, 24 60, 32 54 C 40 60, 52 50, 54 34 C 56 16, 42 10, 32 18 Z" fill="#e2304b"/>
    <path d="M20 26 C 17 30, 17 36, 19 40" stroke="#ff8a96" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M32 18 C 32 12, 34 8, 37 5" stroke="#6b3d26" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M35 12 C 42 4, 50 8, 48 12 C 44 15, 38 14, 35 12 Z" fill="#4fae5b"/></svg>`,
  ramen: `<svg viewBox="0 0 64 64"><path d="M22 6 L 44 30 M28 4 L 48 28" stroke="#c98f5a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M6 30 H 58 C 58 46, 46 56, 32 56 C 18 56, 6 46, 6 30 Z" fill="#e2304b"/><path d="M10 38 H 54" stroke="#ffd36b" stroke-width="2" stroke-dasharray="4 3"/>
    <ellipse cx="32" cy="30" rx="26" ry="6" fill="#f4c27a"/><path d="M14 30 C 20 26, 24 34, 30 29 C 36 25, 40 33, 48 28" stroke="#fff1c9" stroke-width="2.5" fill="none"/>
    <circle cx="22" cy="29" r="4.5" fill="#fff"/><circle cx="22" cy="29" r="2.2" fill="#ffb21f"/><path d="M38 26 l8 2 -2 4 -8 -1 z" fill="#4fae5b"/></svg>`,
  icecream: `<svg viewBox="0 0 64 64"><path d="M20 30 L 32 62 L 44 30 Z" fill="#e2a85b"/><path d="M23 36 L 41 36 M25 43 L 39 43 M28 50 L 36 50" stroke="#c98a3e" stroke-width="1.6"/>
    <circle cx="25" cy="26" r="10" fill="#ffb3c7"/><circle cx="39" cy="26" r="10" fill="#fff4dc"/><circle cx="32" cy="16" r="10" fill="#8a5a3c"/>
    <circle cx="35" cy="6" r="3.5" fill="#e2304b"/><path d="M28 12 l2 1 M34 15 l2 -1 M30 19 l1 2" stroke="#ffd36b" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  donut: `<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="24" fill="#e2a85b"/><path d="M10 30 C 12 14, 52 14, 54 30 C 50 36, 46 30, 42 36 C 38 32, 34 38, 30 34 C 26 38, 22 32, 18 36 C 14 32, 12 36, 10 30 Z" fill="#ff8fb1"/>
    <circle cx="32" cy="32" r="8" fill="#15171c"/><g stroke-width="2.2" stroke-linecap="round"><path d="M20 24 l3 2" stroke="#ffd36b"/><path d="M42 22 l3 -1" stroke="#7ad3ff"/><path d="M28 18 l2 2" stroke="#fff"/><path d="M46 30 l2 2" stroke="#ffd36b"/></g></svg>`,
  blanket: `<svg viewBox="0 0 100 64"><path d="M4 18 C 30 8, 70 8, 96 18 L 92 58 C 66 64, 34 64, 8 58 Z" fill="#7b6fd6"/>
    <path d="M4 18 C 30 8, 70 8, 96 18 L 95 26 C 70 17, 30 17, 5 26 Z" fill="#a89ff0"/>
    <g fill="#ffd36b" opacity=".9"><circle cx="24" cy="38" r="2.2"/><circle cx="50" cy="44" r="2.2"/><circle cx="76" cy="36" r="2.2"/><circle cx="36" cy="52" r="1.8"/><circle cx="64" cy="54" r="1.8"/></g>
    <path d="M60 30 a5 5 0 1 0 5 6 a4 4 0 1 1 -5 -6 z" fill="#ffd36b"/></svg>`,
  pillow: `<svg viewBox="0 0 80 48"><path d="M8 10 C 26 2, 54 2, 72 10 C 78 22, 78 28, 72 38 C 54 46, 26 46, 8 38 C 2 28, 2 20, 8 10 Z" fill="#fff4f6"/>
    <path d="M8 10 C 26 2, 54 2, 72 10 C 54 8, 26 8, 8 10 Z M8 38 C 26 44, 54 44, 72 38" stroke="#e8c8d2" stroke-width="2" fill="none"/>
    <path d="M30 18 c 2 -4 8 -4 10 0 c 2 -4 8 -4 10 0 c 0 6 -10 10 -10 10 c 0 0 -10 -4 -10 -10 z" fill="#ff8fb1" opacity=".75"/></svg>`,
}

// Sovg'alar: nima beradi
const GIFTS = [
  { id: 'rose', name: 'Gul', kind: 'love', hunger: 0, mood: 22, aff: 12 },
  { id: 'teddy', name: 'Ayiqcha', kind: 'love', hunger: 0, mood: 28, aff: 15 },
  { id: 'chocolate', name: 'Shokolad', kind: 'food', hunger: -15, mood: 12, aff: 4 },
  { id: 'donut', name: 'Donut', kind: 'food', hunger: -20, mood: 14, aff: 5 },
  { id: 'cake', name: 'Tort', kind: 'food', hunger: -25, mood: 14, aff: 5 },
  { id: 'icecream', name: 'Muzqaymoq', kind: 'food', hunger: -10, mood: 14, aff: 4 },
  { id: 'apple', name: 'Olma', kind: 'food', hunger: -15, mood: 5, aff: 2 },
  { id: 'ramen', name: 'Ovqat', kind: 'food', hunger: -45, mood: 8, aff: 4 },
  { id: 'blanket', name: "Ko'rpa", kind: 'sleep', hunger: 0, mood: 8, aff: 5 },
  { id: 'pillow', name: 'Yostiq', kind: 'sleep', hunger: 0, mood: 6, aff: 4 },
]

// Kichik effektlar (ko'z yosh, zzz, yurakcha, jahl belgisi)
const FX_SVG = {
  tear: `<svg viewBox="0 0 10 14"><path d="M5 0 C 3 4, 0 7, 0 9.5 A 5 4.5 0 0 0 10 9.5 C 10 7, 7 4, 5 0 Z" fill="#7cc8ff"/><ellipse cx="3.4" cy="9" rx="1.2" ry="1.8" fill="#fff" opacity=".7"/></svg>`,
  heart: `<svg viewBox="0 0 24 22"><path d="M12 21 C 4 15, 0 11, 0 6.5 A 6 6 0 0 1 12 4 A 6 6 0 0 1 24 6.5 C 24 11, 20 15, 12 21 Z" fill="#ff5a7a"/><ellipse cx="6.5" cy="6.5" rx="2" ry="1.4" fill="#fff" opacity=".6"/></svg>`,
  z: `<svg viewBox="0 0 20 20"><text x="10" y="16" text-anchor="middle" font-size="18" font-weight="900" fill="#c9c2ff" font-family="sans-serif">z</text></svg>`,
  anger: `<svg viewBox="0 0 24 24"><g stroke="#ff4d4d" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M3 9 C 7 9, 9 7, 9 3"/><path d="M15 3 C 15 7, 17 9, 21 9"/><path d="M21 15 C 17 15, 15 17, 15 21"/><path d="M9 21 C 9 17, 7 15, 3 15"/></g></svg>`,
  note: `<svg viewBox="0 0 20 24"><path d="M7 4 L 18 1 V 16" stroke="#ffd36b" stroke-width="2.4" fill="none"/><ellipse cx="5" cy="19" rx="4.5" ry="3.4" fill="#ffd36b"/><ellipse cx="15" cy="16" rx="4" ry="3" fill="#ffd36b"/><path d="M7 4 V 19" stroke="#ffd36b" stroke-width="2.4"/></svg>`,
}
