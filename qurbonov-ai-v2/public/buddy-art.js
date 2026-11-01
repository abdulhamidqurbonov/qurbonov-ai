// ============ Qurbonov AI — yordamchi personajlar (original chibi-anime uslub) ============
// Har bir personaj SVG bilan chiziladi; ko'z, og'iz, qo'l va oyoqlar alohida — animatsiya uchun.

const BUDDIES = {
  // 3D personaj (VRoid Studio'da yasalgan). Yangi model qo'shish: public/models/ ga .vrm va kichik .jpg qo'ying va shu yerga yozing.
  vampira: {
    name: 'Vampira', gender: 'female',
    model: '/models/vampira.vrm', face: '/models/vampira.jpg',
    trait: "sirli, nafis va biroz o'yinqaroq vampir qiz; xushmuomala, ozgina kinoyali, lekin juda mehribon va yordamga tayyor",
    hello: "Salom… men Vampira 🦇 Bosib gapiring, eshitaman.",
  },
  yulduz: {
    name: 'Yulduz', gender: 'female',
    trait: "quvnoq, energiyali, ozgina hazilkash qiz; gapi jonli va iliq",
    hello: "Salom! Men Yulduzman ✨ Bosib gapiring!",
    skin: '#ffe4d2', blush: '#ff9fa3',
    hair: '#ff9a7a', hairDark: '#e0705a', hairLight: '#ffc3a8',
    eye: '#f0a020', eyeDark: '#a35a00',
    top: '#f4b544', topDark: '#d98a1f', accent: '#ffffff', legs: '#3a3f5c', shoe: '#ea6b3c',
    style: 'twintails',
  },
  nilufar: {
    name: 'Nilufar', gender: 'female',
    trait: "xotirjam, aqlli va mehribon qiz; tushuntirishni yaxshi ko'radi, gapi yumshoq",
    hello: "Assalomu alaykum, men Nilufarman 🌸 Nimada yordam beray?",
    skin: '#ffe7da', blush: '#f7a1b5',
    hair: '#a98bdc', hairDark: '#7e62b8', hairLight: '#cdb8f2',
    eye: '#2bb3a6', eyeDark: '#136b63',
    top: '#2f3a68', topDark: '#1f2749', accent: '#f7a1b5', legs: '#2f3a68', shoe: '#6b4a3a',
    style: 'longbow',
  },
  temur: {
    name: 'Temur', gender: 'male',
    trait: "salqin, o'ziga ishongan yigit; qisqa va aniq gapiradi, texnologiya va o'yinlarni yaxshi ko'radi",
    hello: "Salom, Temurman 🎧 Gapir, eshityapman.",
    skin: '#ffe0c8', blush: '#f2a58e',
    hair: '#2b3350', hairDark: '#1a2036', hairLight: '#4a5680',
    eye: '#3fa9f5', eyeDark: '#1d5f9a',
    top: '#2a2f3a', topDark: '#1b1f27', accent: '#f4b544', legs: '#4a5068', shoe: '#e9e6df',
    style: 'spiky',
  },
}

function buddySVG(id) {
  const c = BUDDIES[id]
  const g = (n) => `${id}-${n}`
  // --- orqa sochlar ---
  const backHair = {
    twintails: `
      <g class="b-tail b-tail-l"><path d="M24 50 C 4 62, 2 98, 14 116 C 20 104, 22 86, 30 72 Z" fill="${c.hair}"/><path d="M16 108 C 12 96, 12 80, 20 66" stroke="${c.hairDark}" stroke-width="2" fill="none" opacity=".5"/></g>
      <g class="b-tail b-tail-r"><path d="M96 50 C 116 62, 118 98, 106 116 C 100 104, 98 86, 90 72 Z" fill="${c.hair}"/><path d="M104 108 C 108 96, 108 80, 100 66" stroke="${c.hairDark}" stroke-width="2" fill="none" opacity=".5"/></g>
      <path d="M26 56 C 24 30, 44 16, 60 16 C 76 16, 96 30, 94 56 L 92 78 L 28 78 Z" fill="${c.hairDark}"/>`,
    longbow: `
      <path d="M22 58 C 18 30, 40 14, 60 14 C 80 14, 102 30, 98 58 C 100 84, 104 104, 98 118 C 86 114, 34 114, 22 118 C 16 104, 20 84, 22 58 Z" fill="${c.hair}"/>
      <path d="M30 112 C 28 96, 28 82, 30 70 M90 112 C 92 96, 92 82, 90 70" stroke="${c.hairDark}" stroke-width="2" fill="none" opacity=".45"/>`,
    spiky: `
      <path d="M26 58 C 22 32, 40 16, 60 16 C 80 16, 98 32, 94 58 L 90 70 L 30 70 Z" fill="${c.hairDark}"/>`,
  }[c.style]

  // --- old sochlar (chakka) ---
  const frontHair = {
    twintails: `
      <path d="M25 56 C 24 30, 42 18, 60 18 C 78 18, 96 30, 95 56 C 90 46, 84 40, 78 38 C 80 46, 78 50, 74 54 C 72 44, 66 38, 60 36 C 56 44, 50 50, 42 52 C 46 46, 46 42, 44 38 C 36 42, 30 48, 25 56 Z" fill="${c.hair}"/>
      <path d="M44 24 C 54 20, 66 20, 76 24" stroke="${c.hairLight}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
      <g class="b-clip"><path d="M84 30 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 z" fill="#fff4b0" stroke="#f0b52a" stroke-width="1.2"/></g>
      <ellipse cx="24" cy="54" rx="6" ry="5" fill="${c.top}"/><ellipse cx="96" cy="54" rx="6" ry="5" fill="${c.top}"/>`,
    longbow: `
      <path d="M24 60 C 22 32, 40 18, 60 18 C 80 18, 98 32, 96 60 C 92 50, 86 44, 80 42 C 80 50, 76 54, 72 56 C 70 46, 64 40, 58 40 C 54 48, 46 54, 38 56 C 40 50, 40 46, 38 42 C 32 46, 27 52, 24 60 Z" fill="${c.hair}"/>
      <path d="M24 60 C 22 74, 24 86, 28 96 C 30 84, 30 72, 32 62 Z M96 60 C 98 74, 96 86, 92 96 C 90 84, 90 72, 88 62 Z" fill="${c.hair}"/>
      <path d="M42 25 C 52 21, 66 21, 78 25" stroke="${c.hairLight}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
      <g class="b-bow" transform="translate(60 15)">
        <path d="M0 0 C -10 -12, -26 -10, -24 2 C -22 12, -8 8, 0 0 Z" fill="${c.accent}"/>
        <path d="M0 0 C 10 -12, 26 -10, 24 2 C 22 12, 8 8, 0 0 Z" fill="${c.accent}"/>
        <circle r="4.5" fill="#e27896"/>
      </g>`,
    spiky: `
      <path d="M24 58 L 22 40 L 30 44 L 30 28 L 40 36 L 44 18 L 52 30 L 60 14 L 66 30 L 76 18 L 78 34 L 90 28 L 88 42 L 98 40 L 94 58 C 90 50, 84 44, 78 42 L 80 52 L 70 46 L 66 54 L 58 44 L 52 54 L 48 46 L 38 52 L 40 44 C 32 46, 27 52, 24 58 Z" fill="${c.hair}"/>
      <path d="M46 26 L 54 32 M62 22 L 66 30" stroke="${c.hairLight}" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <g class="b-phones">
        <path d="M22 60 C 18 26, 102 26, 98 60" stroke="#20242e" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="14" y="54" width="12" height="20" rx="5" fill="#20242e"/><rect x="94" y="54" width="12" height="20" rx="5" fill="#20242e"/>
        <rect x="16.5" y="58" width="7" height="12" rx="3" fill="${c.accent}"/><rect x="96.5" y="58" width="7" height="12" rx="3" fill="${c.accent}"/>
      </g>`,
  }[c.style]

  // --- kiyim ---
  const top = {
    twintails: `<path d="M38 94 C 38 90, 82 90, 82 94 L 86 124 C 86 128, 34 128, 34 124 Z" fill="${c.top}"/>
                <path d="M48 92 L 60 104 L 72 92" stroke="${c.topDark}" stroke-width="3" fill="none" stroke-linejoin="round"/>
                <path d="M54 104 v14 M66 104 v14" stroke="${c.topDark}" stroke-width="2" stroke-linecap="round"/>
                <rect x="44" y="112" width="32" height="8" rx="4" fill="${c.topDark}" opacity=".5"/>`,
    longbow: `<path d="M38 94 C 38 90, 82 90, 82 94 L 88 126 C 88 130, 32 130, 32 126 Z" fill="${c.top}"/>
              <path d="M42 92 L 60 108 L 78 92 L 72 92 L 60 102 L 48 92 Z" fill="#ffffff"/>
              <path d="M56 104 L 60 112 L 64 104 Z" fill="${c.accent}"/>
              <path d="M34 120 L 86 120" stroke="#ffffff" stroke-width="2" opacity=".7"/>`,
    spiky: `<path d="M37 94 C 37 90, 83 90, 83 94 L 86 124 C 86 128, 34 128, 34 124 Z" fill="${c.top}"/>
            <path d="M60 92 V 126" stroke="${c.topDark}" stroke-width="2"/>
            <path d="M44 92 C 50 100, 70 100, 76 92" stroke="#e9e6df" stroke-width="3" fill="none"/>
            <rect x="64" y="104" width="12" height="8" rx="2" fill="${c.accent}" opacity=".9"/>
            <path d="M50 96 v10 M70 96 v6" stroke="#e9e6df" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
  }[c.style]

  const lashes = c.gender === 'female'
    ? `<path d="M37 55 Q 46 50 55 55" stroke="#3a2a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M37 55 l-3 -2" stroke="#3a2a2a" stroke-width="2" stroke-linecap="round"/>
       <path d="M65 55 Q 74 50 83 55" stroke="#3a2a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M83 55 l3 -2" stroke="#3a2a2a" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M38 54 Q 46 51 54 54" stroke="#2a2a33" stroke-width="2.4" fill="none" stroke-linecap="round"/>
       <path d="M66 54 Q 74 51 82 54" stroke="#2a2a33" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  const brows = c.gender === 'female'
    ? `<path d="M40 46 Q 46 43 52 45 M68 45 Q 74 43 80 46" stroke="${c.hairDark}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : `<path d="M39 46 L 52 44 M68 44 L 81 46" stroke="${c.hairDark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`

  const eye = (cx) => `
    <g class="b-eye">
      <ellipse cx="${cx}" cy="63" rx="8" ry="9.5" fill="#fff"/>
      <ellipse cx="${cx}" cy="64" rx="6.6" ry="8.4" fill="url(#${g('iris')})"/>
      <ellipse cx="${cx}" cy="66" rx="3.2" ry="4.2" fill="${c.eyeDark}"/>
      <circle cx="${cx - 2.6}" cy="60.5" r="2.6" fill="#fff"/>
      <circle cx="${cx + 2.4}" cy="68" r="1.3" fill="#fff" opacity=".9"/>
    </g>`

  return `<svg class="b-svg" viewBox="0 0 120 152" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${g('iris')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.eyeDark}"/><stop offset=".55" stop-color="${c.eye}"/><stop offset="1" stop-color="#fff3c4"/>
      </linearGradient>
      <radialGradient id="${g('face')}" cx=".5" cy=".42" r=".6">
        <stop offset="0" stop-color="#fff6ef"/><stop offset="1" stop-color="${c.skin}"/>
      </radialGradient>
    </defs>
    <ellipse class="b-shadow" cx="60" cy="148" rx="26" ry="4" fill="#000" opacity=".28"/>
    <g class="b-all">
      <g class="b-legs">
        <g class="b-leg b-leg-l"><rect x="45" y="122" width="11" height="20" rx="5" fill="${c.legs}"/><ellipse cx="50" cy="143" rx="8" ry="4.5" fill="${c.shoe}"/></g>
        <g class="b-leg b-leg-r"><rect x="64" y="122" width="11" height="20" rx="5" fill="${c.legs}"/><ellipse cx="70" cy="143" rx="8" ry="4.5" fill="${c.shoe}"/></g>
      </g>
      <g class="b-body">
        ${backHair}
        <g class="b-arm b-arm-l"><rect x="27" y="95" width="11" height="26" rx="5.5" fill="${c.top}"/><circle cx="32.5" cy="122" r="5" fill="${c.skin}"/></g>
        <g class="b-arm b-arm-r"><rect x="82" y="95" width="11" height="26" rx="5.5" fill="${c.top}"/><circle cx="87.5" cy="122" r="5" fill="${c.skin}"/></g>
        ${top}
        <rect x="54" y="84" width="12" height="10" rx="4" fill="${c.skin}"/>
        <g class="b-head">
          <ellipse cx="24" cy="66" rx="5" ry="7" fill="${c.skin}"/><ellipse cx="96" cy="66" rx="5" ry="7" fill="${c.skin}"/>
          <ellipse cx="60" cy="60" rx="36" ry="33" fill="url(#${g('face')})"/>
          ${brows}
          <g class="b-eyes">${eye(46)}${eye(74)}${lashes}</g>
          <ellipse cx="36" cy="75" rx="6" ry="3.2" fill="${c.blush}" opacity=".55"/>
          <ellipse cx="84" cy="75" rx="6" ry="3.2" fill="${c.blush}" opacity=".55"/>
          <g class="b-mouth">
            <path class="m-idle" d="M55 77 Q 60 81.5 65 77" stroke="#7a3b3b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path class="m-open" d="M54.5 76 Q 60 76 65.5 76 Q 65 84 60 84.5 Q 55 84 54.5 76 Z" fill="#8a3d3d"/>
            <ellipse class="m-o" cx="60" cy="79" rx="2.6" ry="3" fill="#8a3d3d"/>
          </g>
          ${frontHair}
        </g>
      </g>
    </g>
  </svg>`
}

function buddyFace(id) {   // menyu uchun kichik rasm (faqat bosh)
  if (BUDDIES[id].face) return `<img src="${BUDDIES[id].face}" alt="">`
  return buddySVG(id).replace('viewBox="0 0 120 152"', 'viewBox="16 8 88 92"')
}
