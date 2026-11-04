// ============ Shinobu va do'stlari — ekrandagi tirik 3D hamrohlar ============
// Och qoladi, uxlaydi (yerga yotib), xafa bo'ladi, arazlaydi, yig'laydi, uyaladi, nozlanadi, kuladi, sakraydi.
// Gaplaringizni tushunadi ("chekkaga o'tib tur", "uxla", "raqsga tush"...), siz bilan o'ynaydi.
// Sichqoncha bilan surilmaydi — o'zi yuradi yoki aytganingizda o'tadi.
// Boshini bossangiz — erkalaysiz; tez-tez qitiqlasangiz — kuladi.

// ---------- Personajlar ----------
// Yangi personaj: VRoid'da yasang → public/models/<id>.vrm va <id>.jpg qo'ying → shu ro'yxatga qo'shing.
const CHARS = {
  shinobu: {
    id: 'shinobu', name: 'Shinobu', fullName: 'Shinobu Oshino', gender: 'female',
    model: '/models/vampira.vrm', face: '/models/vampira.jpg',
    trait: "o'zini qadimiy va buyuk vampir deb biladigan, lekin aslida juda shirin va injiq qiz. Mag'rur, ozgina kinoyali, " +
      "shirinliklarni (ayniqsa donut va shokoladni) jonidan ortiq ko'radi. Egasini yashirincha yaxshi ko'radi, lekin buni tan olishga juda uyaladi. " +
      "Tez uyaladi, nozlanadi. Xafa qilsa — orqasini o'girib arazlaydi yoki yig'laydi, sovg'a olsa — eriydi.",
  },
  yulduz: {
    id: 'yulduz', name: 'Yulduz', fullName: 'Yulduz', gender: 'female',
    model: '/models/yulduz.vrm', face: '/models/yulduz.jpg',
    trait: "quvnoq, sho'x va gapga chechan qiz. Hamma narsaga qiziqadi, ko'p kuladi, hazilni yaxshi ko'radi, ozgina sodda.",
  },
  temur: {
    id: 'temur', name: 'Temur', fullName: 'Temur', gender: 'male',
    model: '/models/temur.vrm', face: '/models/temur.jpg',
    trait: "jasur, sokin va ishonchli yigit. Kam gapiradi, lekin aniq. Do'stini himoya qiladi, ba'zan quruq hazil qiladi.",
  },
}
let PET = CHARS[store.get('petId', 'shinobu')] || CHARS.shinobu
const isMale = () => PET.gender === 'male'

const LINES = {
  hungry: ["Qornim ochdi… biror narsa yeymizmi?", "Ovqat yegim kelyapti. Menga shirinlik berasizmi?", "Qornim g'uldirayapti, eshityapsizmi? Donut bormi?"],
  hungryAngry: ["QORNIM OCH DEDIM-KU! Nega bermayapsiz?!", "Meni och qoldirmoqchimisiz?! Tezroq ovqat bering!", "Men buyuk vampirman, och qoldirib bo'lmaydi! OVQAT!"],
  sulk: ["Hm. Siz bilan gaplashmayman.", "Arazladim. Menga qaramang.", "Mayli, menga e'tibor bermasangiz, men ham bermayman."],
  hurt: ["Xafa bo'ldim…", "Xafa bo'ldim. Gaplashmayman.", "Shunaqa deysizmi?.. Xafa bo'ldim."],
  sleepy: ["Aaah… uyqum kelyapti…", "Ko'zlarim yumilyapti… ko'rpa berasizmi?", "Yostiq bormi? Ozgina uxlab olay…"],
  fallAsleep: ["Bo'ldi… men uxladim…", "Ozgina… mizg'ib olaman…"],
  wake: ["Mm… yaxshi uxladim!", "Uyg'ondim! Nima qilamiz?", "Uf, qancha uxlabman-a. Salom!"],
  grumpyWake: ["Nima?.. Endi uxlagan edim-ku…", "Uyqumni buzdingiz… hm."],
  bored: ["Zerikdim… biror narsa o'ynaymizmi?", "Menga ham e'tibor bering-da!", "O'yin o'ynaymizmi? Men sizni yutaman!"],
  thanksLove: ["Voy… bu menga-mi? Rahmat!", "Qanday chiroyli… mayli, sizni ozgina yaxshi ko'raman.", "Hi-hi… rahmat! Uyaltirib yubordingiz."],
  thanksHug: ["Voy, qanday yumshoq! Uni hech kimga bermayman!", "Rahmat… uni quchoqlab uxlayman."],
  thanksWear: ["Menga yarashdimi? Hi-hi…", "Chiroyli-ku! Qarang, qarang!"],
  thanksToy: ["Voy, zo'r! Rahmat!", "Ura! Endi zerikmayman!"],
  thanksFood: ["Mmm, mazali! Rahmat!", "Ana endi boshqa gap! Rahmat!", "Yum-yum… siz eng zo'risiz!"],
  messy: ["Yuzimga yuqib qoldimi?", "Hi-hi, og'zim shokolad bo'lib qoldi shekilli…"],
  wiped: ["Voy… rahmat… uyaltirib yubordingiz…", "Hi-hi… o'zim ham artardim-ku… rahmat.", "E-e… yuzimga tegmang… mayli, rahmat."],
  clean: ["Yuzim toza-ku!", "Nima qilyapsiz? Yuzim top-toza!"],
  full: ["To'ydim, endi sig'maydi…", "Yo'q-yo'q, qornim to'q. Keyinroq!"],
  notSleepy: ["Hali uxlamayman, lekin saqlab qo'yaman, rahmat.", "Rahmat! Kechasi kerak bo'ladi."],
  cozy: ["Mm… issiqqina… rahmat…", "Yumshoqqina… zzz…"],
  forgive: ["Mayli… kechirdim. Lekin boshqa xafa qilmang!", "Hm… yaxshi, endi araz emasman."],
  pat: ["Hi-hi… boshimni silayapsizmi?", "Mm… yana…", "E-e… uyalaman-ku…", "Mayli, yana ozgina silang."],
  patSulk: ["Tegmang! Arazman!", "Hm… baribir arazman."],
  tickle: ["Hi-hi-hi! Qitiqlamang!", "Ha-ha-ha! Bas, bas!", "Voy, qitig'im keladi! Ha-ha!"],
  hello: ["Salom! Men {name}. Bosib gapiring.", "Keldingizmi? Kutib o'tirgan edim!"],
  missed: ["Qayerda edingiz? Sog'indim… ozgina.", "Uzoq kutdim-a! Endi meni tashlab ketmang."],
  bye: ["Xayr… tezroq chaqiring!", "Mayli, ketdim… sog'inaman."],
  batteryLow: ["Diqqat! Batareyangiz {p} foiz qoldi, quvvatlagichga ulang.", "Batareya tugayapti, {p} foiz. Zaryadga qo'ying!"],
  batteryCritical: ["Batareya juda kam, {p} foiz! Tezroq quvvatlang, bo'lmasa ikkalamiz ham o'chamiz!"],
  charging: ["Rahmat, quvvatlanyapti!"],
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const pickOf = (...a) => a[Math.floor(Math.random() * a.length)]

// ---------- Holat (har personajniki alohida) ----------
const DEF = () => ({
  on: true, hunger: 30, energy: 85, mood: 65, affection: 40, sleeping: false, blanket: false, pillow: false, sulking: false,
  lastTick: Date.now(), lastSeen: Date.now(), x: null, y: null, captions: false, wander: true, messy: 0,
  hungerAsks: 0, lastHungerAsk: 0, lastSleepyAsk: 0, lastBored: 0, lastTouch: Date.now(), gifts: [], history: [], tints: {},
})
const stateKey = () => PET.id === 'shinobu' ? 'pet' : 'pet:' + PET.id
const P = Object.assign(DEF(), store.get(stateKey(), {}))
const savePet = () => store.set(stateKey(), P)
const clamp100 = (v) => Math.max(0, Math.min(100, v))

const C = { el: null, av: null, fx: null, pill: null, cap: null, busy: false, rec: null, pose: 'stand', face: 'neutral', poseT: 0, walkT: 0, w: 96, h: 160, lying: false, taps: 0, tapT: 0 }

const mobile = () => innerWidth < 760
function petSize() { return mobile() ? { w: 76, h: 128 } : { w: 96, h: 160 } }
function floorY() { return innerHeight - C.h - (mobile() ? 112 : 128) }
function minX() { return mobile() ? 4 : 276 }   // chap menyu ustiga chiqmasin

// ---------- Qurish ----------
function buildPet(animate = true) {
  C.av?.destroy(); C.av = null
  document.querySelectorAll('.pet, .pet-pill, .pet-cap, .pet-panel').forEach((e) => e.remove())
  renderPetToggle()
  if (!P.on || !window.Avatar3D?.supported()) return
  const sz = petSize(); C.w = sz.w; C.h = sz.h; C.lying = false
  const el = document.createElement('div')
  el.className = 'pet' + (animate ? ' poof-in' : ''); el.tabIndex = 0
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${PET.name} — gapirish uchun bosing`)
  el.style.width = C.w + 'px'; el.style.height = C.h + 'px'
  el.innerHTML = `<div class="pet-back"></div><div class="pet-load"><img src="${PET.face}" alt=""><span>0%</span></div><div class="pet-fx"></div><div class="pet-ring"></div>`
  document.body.appendChild(el)
  C.el = el; C.fx = el.querySelector('.pet-fx'); C.back = el.querySelector('.pet-back')
  if (animate) { burst(); setTimeout(() => el.classList.remove('poof-in'), 700) }

  const cap = document.createElement('div'); cap.className = 'pet-cap'; cap.hidden = true; document.body.appendChild(cap); C.cap = cap
  const pill = document.createElement('div'); pill.className = 'pet-pill'; pill.hidden = true
  pill.innerHTML = `
    <button data-pet="gift" title="Sovg'a berish"><svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M2.5 9h19v-2.5h-19zM12 6.5V20M12 6.5C9 2.5 5.5 4 7.5 6.5M12 6.5c3-4 6.5-2.5 4.5 0"/></svg></button>
    <button data-pet="game" title="O'ynash"><svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="17.5" cy="13.5" r="1"/></svg></button>
    <button data-pet="wipe" title="Yuzini artish"><svg viewBox="0 0 24 24"><path d="M4 6l13-2 3 13-13 3z"/><path d="M8 10l7-1M9 14l7-1"/></svg></button>
    <button data-pet="type" title="Yozish"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/></svg></button>
    <button data-pet="more" title="Sozlamalar"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
    <form class="pet-type" hidden><input placeholder="${PET.name}ga yozing…" autocomplete="off"><button type="submit" aria-label="Yuborish"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>`
  document.body.appendChild(pill); C.pill = pill

  // Joy noto'g'ri bo'lsa (menyu ustida yoki ekrandan tashqarida) — o'ngga qaytaramiz
  if (P.x == null || P.x < minX() - 4 || P.x > innerWidth - C.w || P.y > innerHeight - C.h || P.y < 40) { P.x = innerWidth - C.w - 30; P.y = floorY() }
  place(P.x, P.y, false)

  C.av = Avatar3D.mount(el, PET.model, {
    onProgress: (k) => { const s = el.querySelector('.pet-load span'); if (s) s.textContent = Math.round(k * 100) + '%' },
    onReady: () => {
      el.querySelector('.pet-load')?.remove(); for (const [g, hex] of Object.entries(P.tints || {})) C.av.setTint(g, hex)
      if (P.sleeping) { C.calm = true; C.av.setSleepVariant('calm') }
      applyLook(); greet()
      // ko'p ishlatiladigan animatsiyalarni sekin-asta oldindan yuklaymiz
      ;['shy', 'angry', 'jump', 'think', 'sleep', 'sleep-restless', 'cry', 'clap', 'surprised', 'bored'].forEach((f, i) => setTimeout(() => C.av?.preload([f]), 3000 + i * 1500))
    },
    onError: () => { const s = el.querySelector('.pet-load span'); if (s) s.textContent = 'model yo\'q' },
  })
  bindPet()
}
function burst() {
  if (!C.el) return
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span'); s.className = 'pet-burst'; s.innerHTML = FX_SVG.sparkle
    const a = (i / 14) * Math.PI * 2, d = 40 + Math.random() * 30
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px')
    s.style.left = '50%'; s.style.top = '55%'
    C.el.appendChild(s); setTimeout(() => s.remove(), 900)
  }
}

// ---------- Joylashuv (faqat o'zi yuradi) ----------
function clampPos(x, y) { return [Math.max(minX(), Math.min(innerWidth - C.w - 2, x)), Math.max(56, Math.min(innerHeight - C.h - 2, y))] }
function place(x, y, animate, ms = 0) {
  ;[x, y] = clampPos(x, y)
  C.el.style.transition = animate ? `left ${ms}ms linear, top ${ms}ms linear` : 'none'
  C.el.style.left = x + 'px'; C.el.style.top = y + 'px'
  P.x = x; P.y = y; savePet()
  setTimeout(placeUI, animate ? ms : 0)
}
function walkTo(x, y, then) {
  if (C.lying) setLying(false)
  ;[x, y] = clampPos(x, y)
  const r = C.el.getBoundingClientRect()
  const dist = Math.hypot(x - r.left, y - r.top)
  if (dist < 12) { place(x, y, false); then?.(); return }
  if (P.sleeping) wakeUp(true)
  const ms = Math.min(9000, Math.max(800, dist / 75 * 1000))
  C.av?.setFacing(x < r.left ? -1 : 1)
  setPose('walk')
  place(x, y, true, ms)
  clearTimeout(C.walkT)
  C.walkT = setTimeout(() => { if (C.pose === 'walk') setPose(baseIdle()); then?.() }, ms)
}
// Yotganda quti yotiq bo'ladi (pastki chekka va o'rta joyida qoladi)
function setLying(on) {
  if (!C.el || C.lying === on) return
  C.lying = on
  const w = on ? Math.round(C.h * 1.05) : C.w, h = on ? Math.round(C.w * 0.72) : C.h
  const r = C.el.getBoundingClientRect()
  const cx = r.left + r.width / 2, bottom = r.top + r.height
  C.el.style.transition = 'none'
  C.el.style.width = w + 'px'; C.el.style.height = h + 'px'
  C.el.style.left = Math.max(minX(), Math.min(innerWidth - w - 2, cx - w / 2)) + 'px'; C.el.style.top = bottom - h + 'px'
  C.el.classList.toggle('lying', on)
  setTimeout(placeUI, 30)
}
function placeUI() {
  if (!C.el) return
  const r = C.el.getBoundingClientRect()
  if (!C.pill.hidden) {
    const pw = C.pill.offsetWidth
    C.pill.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + 'px'
    C.pill.style.top = Math.max(8, r.top - C.pill.offsetHeight - 6) + 'px'
  }
  if (!C.cap.hidden) {
    const cw = Math.min(260, innerWidth - 20); C.cap.style.width = cw + 'px'
    C.cap.style.left = Math.max(10, Math.min(innerWidth - cw - 10, r.left + r.width / 2 - cw / 2)) + 'px'
    C.cap.style.top = Math.min(innerHeight - C.cap.offsetHeight - 6, r.bottom + 4) + 'px'
  }
  document.querySelector('.pet-panel') && positionPanel()
}
addEventListener('resize', () => {
  if (!C.el) return
  const sz = petSize(); C.w = sz.w; C.h = sz.h
  const was = C.lying; C.lying = false; C.el.style.width = C.w + 'px'; C.el.style.height = C.h + 'px'
  place(P.x, P.y, false); if (was) setLying(true)
})

const SPOTS = {
  edge: () => (P.x + C.w / 2 < (innerWidth + minX()) / 2 ? [minX(), floorY()] : [innerWidth - C.w - 2, floorY()]),
  left: () => [minX(), floorY()],
  right: () => [innerWidth - C.w - 4, floorY()],
  center: () => [(innerWidth + minX()) / 2 - C.w / 2, floorY()],
  closer: () => [innerWidth / 2 + (mobile() ? 40 : 260), floorY() + 20],
}

// ---------- Poza va yuz ----------
function baseIdle() { return P.sleeping ? 'sleep' : P.sulking ? 'sulk' : 'stand' }
function setPose(p, ms) {
  C.pose = p; C.av?.setPose(p)
  setLying(p === 'sleep' || p === 'lie')
  clearTimeout(C.poseT)
  if (ms) C.poseT = setTimeout(() => { if (C.pose === p) { setPose(baseIdle()); applyLook() } }, ms)
  fxForPose()
}
function setFace(f) { C.face = f; C.av?.setFace(f); fxForPose() }
function applyLook() {
  if (P.sleeping) { setPose('sleep'); setFace('sleepy'); return }
  if (P.sulking) { setPose('sulk'); setFace('pout'); return }
  setPose('stand')
  setFace(P.hunger > 80 || P.mood < 30 ? 'sad' : P.energy < 25 ? 'sleepy' : P.mood > 75 ? 'happy' : 'neutral')
}

// ---------- Effektlar va buyumlar ----------
let held = null
function fxForPose() {
  if (!C.fx) return
  C.fx.querySelectorAll('.fx-loop').forEach((e) => e.remove())
  const loop = (kind, every) => { const d = document.createElement('i'); d.className = 'fx-loop'; d.dataset.kind = kind; d.dataset.every = every; C.fx.appendChild(d) }
  const p = C.pose, f = C.face
  if (p === 'sleep' || p === 'lie') loop('z', 1100)
  if (p === 'cry' || p === 'cryStand' || f === 'cry') loop('tear', 240)
  if (f === 'love' || p === 'kiss') loop('heart', 650)
  if ((f === 'angry' || p === 'tantrum') && p !== 'sulk') loop('anger', 1200)
  if (p === 'tantrum' || p === 'puff') loop('steam', 700)
  if (p === 'scared') loop('sweat', 900)
  if (p === 'jump' || p === 'clap' || f === 'excited') loop('sparkle', 500)
  if (p === 'dance') loop('note', 600)
  // qizarish (uyalganda doim ko'rinib turadi)
  let bl = C.fx.querySelector('.fx-blush')
  const blush = !isMale() && (['shy', 'love'].includes(f) || ['shy', 'shycover', 'coy', 'pat', 'wiped', 'kiss'].includes(p))
  if (blush && !bl) { bl = document.createElement('span'); bl.className = 'fx-blush'; bl.innerHTML = FX_SVG.blush; C.fx.appendChild(bl) }
  if (!blush) bl?.remove()
}
function spawnFx(kind) {
  const a = C.av?.anchor('head'); if (!a) return
  const s = document.createElement('span'); s.className = `fx fx-${kind}`; s.innerHTML = FX_SVG[kind]
  const side = Math.random() < 0.5 ? -1 : 1, W = C.el.clientWidth, Hh = C.el.clientHeight
  if (kind === 'tear') { s.style.left = a.x + side * W * 0.07 + 'px'; s.style.top = a.y + Hh * 0.02 + 'px' }
  else if (kind === 'anger') { s.style.left = a.x + W * 0.16 + 'px'; s.style.top = a.y - Hh * 0.06 + 'px' }
  else if (kind === 'sweat') { s.style.left = a.x + W * 0.14 + 'px'; s.style.top = a.y - Hh * 0.02 + 'px' }
  else if (kind === 'steam') { s.style.left = a.x + side * W * 0.12 + 'px'; s.style.top = a.y - Hh * 0.1 + 'px' }
  else { s.style.left = a.x + side * (8 + Math.random() * 14) + 'px'; s.style.top = a.y - Hh * 0.06 + 'px' }
  C.fx.appendChild(s); setTimeout(() => s.remove(), 1800)
}
function fxTick() {
  if (!C.fx || !C.av?.ready()) return
  const now = Date.now()
  C.fx.querySelectorAll('.fx-loop').forEach((d) => { if (!d.last || now - d.last > +d.dataset.every) { d.last = now; spawnFx(d.dataset.kind) } })
  const W = C.el.clientWidth, Hh = C.el.clientHeight
  const head = C.av.anchor('head')
  const bl = C.fx.querySelector('.fx-blush'), cheek = C.av.anchor('cheek')
  if (bl && cheek) { const bw = (C.lying ? Hh * 0.22 : W * 0.17); bl.style.width = bw + 'px'; bl.style.left = cheek.x - bw / 2 + 'px'; bl.style.top = cheek.y - bw * 0.12 + 'px'; bl.style.transform = C.lying ? 'rotate(90deg)' : '' }
  const show = (id, cls, at, fn, back) => {
    const host = back ? C.back : C.fx
    let e = host.querySelector('.' + cls)
    if (!id) { e?.remove(); return }
    if (!e || e.dataset.id !== id) {
      e?.remove(); e = document.createElement('span'); e.className = 'prop ' + cls; e.dataset.id = id; e.innerHTML = PROP_SVG[id]; host.appendChild(e)
      if (cls === 'prop-blanket') e.querySelector('svg')?.setAttribute('preserveAspectRatio', 'none')
    }
    const a = C.av.anchor(at); if (!a) return
    const { w, x, y, h, rot = 0 } = fn(a)
    e.style.width = w + 'px'; e.style.left = x - w / 2 + 'px'; e.style.top = y + 'px'; e.style.transform = `rotate(${rot}deg)`
    if (h) e.style.height = h + 'px'
  }
  const h = held?.until > now ? held : null
  show(h?.id, 'prop-held', h?.at || 'hand', (a) => h?.wipe
    ? { w: W * 0.22, x: a.x + Math.sin(now / 70) * W * 0.07, y: a.y - Hh * 0.01, rot: Math.sin(now / 90) * 20 }
    : { w: W * 0.32, x: a.x, y: a.y - Hh * 0.06 })
  // Yotganda: ko'rpa tanani yopadi, yostiq bosh ostida
  const lying = C.lying && P.sleeping
  show(lying && P.blanket ? 'blanket' : null, 'prop-blanket', 'hips', (a) => {
    const f = C.av.anchor('foot'), c = C.av.anchor('chest') || a
    const x1 = c.x - W * 0.04, x2 = (f ? f.x : a.x + W * 0.3) - W * 0.02
    return { w: x2 - x1, x: (x1 + x2) / 2, y: a.y - Hh * 0.3, h: Hh * 0.5 }
  })
  // yostiq — personaj ORQASIDA (boshi ustida emas, ostida ko'rinadi)
  show(lying && P.pillow ? 'pillow' : null, 'prop-pillow', 'head', (a) => ({ w: W * 0.3, x: a.x + W * 0.07, y: a.y - Hh * 0.02 }), true)
  // Ovqatdan keyin yuzida "shokolad" dog'i
  let m = C.fx.querySelector('.fx-messy')
  const mouth = C.av.anchor('mouth')
  if (P.messy > now && mouth && !C.lying) {
    if (!m) { m = document.createElement('span'); m.className = 'fx-messy'; C.fx.appendChild(m) }
    m.style.left = mouth.x + W * 0.03 + 'px'; m.style.top = mouth.y + 'px'
  } else m?.remove()
}
setInterval(fxTick, 80)
function hold(id, ms, at, extra = {}) { held = { id, until: Date.now() + ms, at, ...extra } }

// ---------- Gapirish ----------
async function petSay(text, { face, pose, poseMs, loud } = {}) {
  if (face) setFace(face)
  if (pose) setPose(pose, poseMs)
  if (P.captions) { C.cap.textContent = text; C.cap.hidden = false; C.cap.classList.toggle('loud', !!loud); placeUI() }
  P.history.push({ role: 'assistant', content: text }); P.history = P.history.slice(-16); savePet()
  const spoke = await Promise.race([speak(text, { gender: PET.gender, style: isMale() ? undefined : 'anime', onStart: () => C.av?.setTalking(true) }), new Promise((r) => setTimeout(r, 6000 + text.length * 120))])
  // O'z ovozi ishlamasa — boshqa ovozda emas, yozuv bilan aytadi
  if (spoke === false && C.cap) {
    C.cap.textContent = text; C.cap.hidden = false; placeUI()
    C.av?.setTalking(true); await new Promise((r) => setTimeout(r, Math.min(7000, 1500 + text.length * 55)))
  }
  C.av?.setTalking(false)
  setTimeout(() => { if (!C.av) return; C.cap.hidden = true }, 1200)
}

// ---------- Bosish: tinglaydi / erkalash / qitiqlash ----------
function bindPet() {
  C.el.addEventListener('click', onPetClick)
  C.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); petTap() } })
  C.el.addEventListener('contextmenu', (e) => { e.preventDefault(); showPill(true) })
  C.el.addEventListener('mouseenter', () => showPill(true))
  C.pill.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pet]'); if (!b) return
    const act = b.dataset.pet
    if (act === 'gift') openPanel('gift')
    if (act === 'game') openPanel('game')
    if (act === 'more') openPanel('more')
    if (act === 'wipe') wipeFace()
    if (act === 'type') { const f = C.pill.querySelector('.pet-type'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input').focus(); placeUI() }
    keepPill()
  })
  C.pill.querySelector('.pet-type').addEventListener('submit', (e) => {
    e.preventDefault()
    const inp = e.target.querySelector('input'); const t = inp.value.trim(); if (!t) return
    inp.value = ''; e.target.hidden = true; hidePill(); petHear(t)
  })
}
function onPetClick(e) {
  P.lastTouch = Date.now()
  if (C.rec || C.busy || P.sleeping) return petTap()
  const r = C.el.getBoundingClientRect()
  const head = C.av?.anchor('head')
  // boshiga bosildi → erkalash
  if (head && !C.lying && Math.hypot(e.clientX - r.left - head.x, e.clientY - r.top - head.y) < r.width * 0.28) { clearTimeout(C.tapT); C.taps = 0; return patHead() }
  // tez-tez bosish → qitiqlash, bir marta → tinglash
  C.taps++
  clearTimeout(C.tapT)
  if (C.taps >= 3) { C.taps = 0; return tickle() }
  C.tapT = setTimeout(() => { const n = C.taps; C.taps = 0; if (n === 1) petTap() }, 330)
}
let pillT = 0
function showPill(auto) { if (!C.pill) return; C.pill.hidden = false; placeUI(); keepPill(auto ? 4000 : 6000) }
function keepPill(ms = 7000) {
  clearTimeout(pillT); pillT = setTimeout(() => {
    if (!C.pill) return
    if (C.pill.matches(':hover') || C.el?.matches(':hover')) return keepPill(2500)
    if (C.pill.querySelector('.pet-type').hidden && !document.querySelector('.pet-panel')) hidePill()
  }, ms)
}
function hidePill() { if (!C.pill) return; C.pill.hidden = true; C.pill.querySelector('.pet-type').hidden = true }

function patHead() {
  if (P.sulking && P.mood < 40) { P.mood = clamp100(P.mood + 3); savePet(); return petSay(pick(LINES.patSulk), { face: 'pout', pose: 'puff', poseMs: 2500 }) }
  P.mood = clamp100(P.mood + 4); P.affection = clamp100(P.affection + 1)
  if (P.sulking && P.mood >= 50) P.sulking = false
  savePet()
  petSay(pick(LINES.pat), { face: pickOf('shy', 'love', 'happy'), pose: 'pat', poseMs: 3200 })
}
function tickle() {
  P.mood = clamp100(P.mood + 5); if (P.sulking) P.sulking = false; savePet()
  stopSpeaking()
  petSay(pick(LINES.tickle), { face: 'laugh', pose: 'laugh', poseMs: 3500 })
}
function wipeFace() {
  P.lastTouch = Date.now()
  if (P.sleeping) return
  if (!(P.messy > Date.now())) return petSay(pick(LINES.clean), { face: 'surprised', pose: 'surprised', poseMs: 1500 })
  P.messy = 0; P.affection = clamp100(P.affection + 3); P.mood = clamp100(P.mood + 4); savePet()
  hold('napkin', 1700, 'head', { wipe: true })
  setPose('wiped', 1800); setFace('shy')
  setTimeout(() => petSay(pick(LINES.wiped), { face: 'shy', pose: pickOf('shycover', 'coy'), poseMs: 3500 }), 1700)
}

async function petTap() {
  P.lastTouch = Date.now()
  showPill()
  if (C.rec) { const r = C.rec; r.spoke = true; petHeard(r, true); return }
  if (C.busy) { stopSpeaking(); C.av?.setTalking(false); return }
  // uxlayotganda birinchi tegish — uyg'onmaydi, "nima bo'ldi?" deb tinchlanib yotadi; ikkinchisi — uyg'onadi
  if (P.sleeping && !C.calm) { sleepCalm(); petSay(pickOf("Mm… nima bo'ldi?..", "Hm?.. zzz…", "Uyqum kelyapti… tegmang…"), { face: 'sleepy' }); return }
  if (P.sleeping) { const grumpy = P.energy < 60; wakeUp(); if (grumpy) { petSay(pick(LINES.grumpyWake), { face: 'pout', pose: 'puff', poseMs: 2500 }) } else petSay(pick(LINES.wake), { face: 'happy', pose: 'stretch', poseMs: 2200 }); return }
  if (!S.features.stt) { const f = C.pill.querySelector('.pet-type'); f.hidden = false; f.querySelector('input').focus(); placeUI(); return }
  stopSpeaking()
  C.el.classList.add('listening'); setPose('listen'); setFace('surprised')
  const r = new Recorder({ vad: true, onLevel: (l) => C.el.style.setProperty('--lvl', l.toFixed(2)), onSilence: (spoke) => petHeard(r, spoke) })
  C.rec = r
  try { await r.start() } catch { C.rec = null; C.el.classList.remove('listening'); applyLook(); toast('Mikrofonga ruxsat bering yoki yozib yuboring') }
}
async function petHeard(r, spoke) {
  if (C.rec !== r) return
  C.rec = null; C.el.classList.remove('listening')
  if (!spoke) { r.cancel(); applyLook(); return }
  setPose('think'); setFace('relaxed')
  try {
    const out = await r.stop()
    const text = await transcribe(out.blob)
    if (!text) { applyLook(); return }
    petHear(text)
  } catch (e) { applyLook(); toast(e.message || 'Xato') }
}

// ---------- Tushunish va javob ----------
async function petHear(text) {
  if (C.busy) return
  C.busy = true; P.lastTouch = Date.now()
  P.history.push({ role: 'user', content: text }); P.history = P.history.slice(-16)
  if (!P.sleeping) { setPose('think'); setFace('relaxed') }
  const hour = new Date().getHours()
  try {
    const res = await fetch('/api/companion', {
      method: 'POST', headers: H(),
      body: JSON.stringify({
        text, history: P.history.slice(0, -1),
        companion: {
          name: PET.name, trait: PET.trait, gender: PET.gender, owner: store.get('ownerName', ''),
          state: { hunger: Math.round(P.hunger), energy: Math.round(P.energy), mood: Math.round(P.mood), affection: Math.round(P.affection),
            sleeping: P.sleeping, sulking: P.sulking, messy: P.messy > Date.now(), gifts: P.gifts.slice(-3).join(', '), time: `${hour}:00, ${hour < 6 ? 'tun' : hour < 12 ? 'ertalab' : hour < 18 ? 'kunduzi' : 'kechqurun'}` },
        },
      }),
    })
    if (res.status === 401) { showGate(); throw new Error("Parol noto'g'ri") }
    const d = await res.json()
    if (!res.ok) throw new Error(d.detail || 'Xato')
    P.mood = clamp100(P.mood + d.mood_delta)
    if (d.insult) {
      P.affection = clamp100(P.affection - 6); P.sulking = true
      if (!/xafa/i.test(d.say)) d.say = "Xafa bo'ldim… " + d.say
      if (!['cry', 'turn_away'].includes(d.action)) d.action = 'sad_turn'
    }
    savePet()
    await doAction(d)
  } catch (e) {
    applyLook()
    petSay("Kechirasiz, hozir o'ylay olmayapman… keyinroq gaplashamiz.", { face: 'sad', pose: 'sad', poseMs: 3000 })
  } finally { C.busy = false }
}

// Hissiyot → mos harakat (bir nechta variantdan tasodifiy, tirikroq ko'rinsin)
const EMO_POSE = {
  cry: [['cryStand', 7000], ['cry', 7000]], love: [['love', 3500], ['kiss', 2600], ['coy', 4000]], shy: [['shycover', 3500], ['coy', 4200], ['shy', 3500]],
  angry: [['tantrum', 3200], ['puff', 3500], ['angry', 4000], ['pout', 3500]], sad: [['sad', 4500]], surprised: [['surprised', 1800]],
  happy: [['giggle', 2500], ['jump', 2200], ['clap', 2200], [null]], laugh: [['laugh', 3500]], scared: [['scared', 3500]],
  excited: [['jump', 2600], ['clap', 2400]], pout: [['pout', 3500], ['puff', 3500]], bored: [['bored', 5000]], hurt: [['hurt', 6000]],
}
const ACTION_POSE = {
  laugh: ['laugh', 3500, 'laugh'], giggle: ['giggle', 2800, 'happy'], jump: ['jump', 2600, 'excited'], coy: ['coy', 4500, 'shy'],
  shy_cover: ['shycover', 3800, 'shy'], pout: ['pout', 3800, 'pout'], puff: ['puff', 3500, 'pout'], tantrum: ['tantrum', 3500, 'angry'],
  stomp: ['tantrum', 3000, 'angry'], scared: ['scared', 3800, 'scared'], surprised: ['surprised', 1800, 'surprised'], bow: ['bow', 2000, 'happy'],
  clap: ['clap', 2600, 'excited'], stretch: ['stretch', 2600, 'relaxed'], blow_kiss: ['kiss', 2600, 'love'], kiss: ['kiss', 2600, 'love'],
  sad: ['sad', 4500, 'sad'], bored: ['bored', 5000, 'bored'], think: ['think', 2500, 'relaxed'], hug: ['hug', 4000, 'love'],
  cry: ['cryStand', 7000, 'cry'], cheer: ['cheer', 2500, 'happy'], eat: ['eat', 3500, 'happy'], yawn: ['yawn', 2500, 'sleepy'],
  dance: ['dance', 9000, 'happy'], sit: ['sit', 15000, null],
}
async function doAction(d) {
  const face = d.emotion || 'neutral'
  setFace(face)
  const say = (opts = {}) => petSay(d.say, { face, ...opts })
  const ap = ACTION_POSE[d.action]
  switch (d.action) {
    case 'go_edge': case 'go_left': case 'go_right': case 'go_center': case 'come_closer': {
      const spot = { go_edge: 'edge', go_left: 'left', go_right: 'right', go_center: 'center', come_closer: 'closer' }[d.action]
      if (P.sulking) { await say({ pose: 'pout', poseMs: 3000 }); return }
      say(); walkTo(...SPOTS[spot]()); return
    }
    case 'stand': P.sleeping = false; setPose('stand'); await say(); return
    case 'sleep': case 'lie_down':
      setPose('yawn', 2200); await say({ face: 'sleepy' })
      setTimeout(() => goSleep(), 300); return
    case 'wake': wakeUp(); await say({ face: 'happy' }); return
    case 'wave': C.av?.wave(); await say(); return
    case 'turn_away': case 'sad_turn':
      P.sulking = true; savePet()
      setPose('hurt'); setFace(d.action === 'sad_turn' ? 'hurt' : 'pout')
      await petSay(d.say, { face: d.action === 'sad_turn' ? 'hurt' : 'pout' })
      return
    case 'turn_back': P.sulking = false; savePet(); setPose('coy', 3000); await say({ face: 'shy' }); return
    case 'game_tir': case 'game_rps': case 'game_hearts': case 'game_memory': case 'game_ttt': case 'game_snake': case 'game_quiz': case 'game_reaction': case 'game_whack':
      await say({ pose: 'jump', poseMs: 1800 }); Games.start(d.action.slice(5)); return
    case 'joke': await say({ face: 'laugh', pose: 'giggle', poseMs: 3000 }); return
  }
  if (ap) { setPose(ap[0], ap[1]); if (ap[2] && !d.emotion) setFace(ap[2]); await say(); return }
  const opts = EMO_POSE[d.emotion]
  const [p, ms] = opts ? pick(opts) : [null]
  if (p) setPose(p, ms)
  else if (C.pose === 'think' || C.pose === 'listen') setPose(baseIdle())
  if (!p && Math.random() < 0.35) C.av?.nod()
  await say()
  if (!p) applyLook()
}

// ---------- Uyqu ----------
// Uyqu: avval bezovta yotadi (u yoqdan bu yoqqa ag'darilib), tegib qo'ysangiz yoki biroz o'tsa — tinchgina yotadi
let calmT = 0
function goSleep() {
  if (C.pose === 'walk') return
  P.sleeping = true; P.sulking = false; savePet()
  C.calm = false; C.av?.setSleepVariant('restless')
  setPose('sleep'); setFace('sleepy')
  clearTimeout(calmT); calmT = setTimeout(sleepCalm, 90000)
}
function sleepCalm() { if (!P.sleeping) return; C.calm = true; C.av?.setSleepVariant('calm') }
function wakeUp(silent) {
  if (!P.sleeping) return
  P.sleeping = false; savePet()
  setPose('yawn', 2000); setFace('sleepy')
  if (!silent) setTimeout(applyLook, 2100)
}

// ---------- Sovg'alar ----------
function giveGift(id) {
  const g = GIFTS.find((x) => x.id === id); if (!g) return
  P.lastTouch = Date.now()
  closePanel()
  if (g.kind === 'food' && P.hunger < 8) { petSay(pick(LINES.full), { face: 'happy', pose: 'puff', poseMs: 2000 }); return }
  if (P.sleeping && g.kind !== 'sleep') { wakeUp() }
  P.gifts.push(g.name); P.gifts = P.gifts.slice(-10)
  P.hunger = clamp100(P.hunger + g.hunger); P.mood = clamp100(P.mood + g.mood); P.affection = clamp100(P.affection + g.aff)
  P.hungerAsks = 0
  const wasSulking = P.sulking
  if (P.sulking && P.mood >= 45) P.sulking = false
  const forgave = wasSulking && !P.sulking
  savePet()
  if (g.kind === 'sleep') {
    P[id] = true; savePet()
    if (P.sleeping) { setFace('happy'); setTimeout(() => setFace('sleepy'), 2500); petSay(pick(LINES.cozy), { face: 'happy' }); return }
    if (P.energy < 45) { petSay(pick(LINES.cozy), { face: 'happy', pose: 'yawn', poseMs: 2000 }); setTimeout(goSleep, 2300); return }
    P[id] = false; savePet(); hold(id, 3000, 'chest'); petSay(pick(LINES.notSleepy), { face: 'shy', pose: 'hug', poseMs: 3000 }); return
  }
  if (g.kind === 'food') {
    hold(id, 4500, 'hand')
    if (['chocolate', 'cake', 'icecream', 'donut', 'pizza', 'lollipop'].includes(id)) P.messy = Date.now() + 3 * 60000
    savePet()
    petSay(forgave ? pick(LINES.forgive) : pick(LINES.thanksFood), { face: 'happy', pose: 'eat', poseMs: 4500 })
    if (P.messy > Date.now() && Math.random() < 0.6) setTimeout(() => !C.busy && petSay(pick(LINES.messy), { face: 'shy', pose: 'giggle', poseMs: 2500 }), 9000)
    return
  }
  if (g.kind === 'hug') { hold(id, 7000, 'chest'); petSay(forgave ? pick(LINES.forgive) : pick(LINES.thanksHug), { face: 'love', pose: 'hug', poseMs: 7000 }); return }
  if (g.kind === 'wear') { hold(id, 4000, 'head'); petSay(pick(LINES.thanksWear), { face: 'shy', pose: 'coy', poseMs: 4500 }); return }
  if (g.kind === 'toy') { hold(id, 4000, 'hand'); petSay(forgave ? pick(LINES.forgive) : pick(LINES.thanksToy), { face: 'excited', pose: 'jump', poseMs: 2500 }); return }
  hold(id, 6000, 'hand')
  petSay(forgave ? pick(LINES.forgive) : pick(LINES.thanksLove), { face: 'love', pose: pickOf('love', 'shycover', 'coy'), poseMs: 5000 })
}

// ---------- Panellar ----------
const TINTS = {
  hair: ['#ffffff', '#ffd6e6', '#ffe9a8', '#c7b8ff', '#a8e6ff', '#ffb3b3', '#bfffcf', '#d0d0d0'],
  eyes: ['#ffffff', '#ff6b8a', '#ffd36b', '#7ad3ff', '#8dff9d', '#c38cff'],
  cloth: ['#ffffff', '#ffb3c7', '#b3c7ff', '#c7ffb3', '#ffe3a8', '#d9b3ff', '#ff8a8a'],
}
const TINT_NAMES = { hair: 'Soch', eyes: "Ko'z", cloth: 'Kiyim' }
function openPanel(kind) {
  closePanel()
  const p = document.createElement('div'); p.className = 'pet-panel'; p.dataset.kind = kind
  if (kind === 'gift') {
    p.innerHTML = `<div class="pp-h">Sovg'a berish</div><div class="pp-grid">${GIFTS.map((g) => `<button data-gift="${g.id}" title="${g.name}"><i>${PROP_SVG[g.id]}</i><span>${g.name}</span></button>`).join('')}</div>`
  } else if (kind === 'game') {
    p.innerHTML = `<div class="pp-h">Birga o'ynaymiz</div><div class="pp-list">${Games.LIST.map((g) => `<button data-game="${g.id}"><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}</div>`
  } else if (kind === 'chars') {
    p.innerHTML = `<div class="pp-h">Personajni tanlang</div><div class="pp-list">${Object.values(CHARS).map((c) => `<button data-char="${c.id}" class="${c.id === PET.id ? 'on' : ''}">
      <b>${c.fullName}${c.id === PET.id ? ' — hozir' : ''}</b><span data-avail="${c.id}">${c.gender === 'male' ? "Yigit" : 'Qiz'} · tekshirilmoqda…</span></button>`).join('')}</div>`
    for (const c of Object.values(CHARS)) {
      fetch(c.model, { method: 'HEAD' }).then((r) => {
        const s = p.querySelector(`[data-avail="${c.id}"]`); if (!s) return
        s.textContent = (c.gender === 'male' ? 'Yigit' : 'Qiz') + (r.ok ? ' · tayyor' : ` · model yo'q (${c.model} qo'ying)`)
        if (!r.ok) s.closest('button').dataset.missing = '1'
      }).catch(() => {})
    }
  } else if (kind === 'look') {
    p.innerHTML = `<div class="pp-h">${PET.name}ning ko'rinishi</div>${Object.entries(TINTS).map(([g, cs]) => `<div class="pp-tint"><span>${TINT_NAMES[g]}</span><div>${cs.map((c, i) =>
      `<button data-tint="${g}" data-c="${i === 0 ? '' : c}" class="${(P.tints?.[g] || '') === (i === 0 ? '' : c) ? 'on' : ''}" style="--c:${c}" title="${i === 0 ? 'Asl holi' : c}">${i === 0 ? '↺' : ''}</button>`).join('')}</div></div>`).join('')}
      <small class="pp-note">Rang modelning asl rangiga qo'shiladi (to'q sochni oqartirib bo'lmaydi).</small>`
  } else {
    p.innerHTML = `<div class="pp-h">${PET.fullName}</div>
      <div class="pp-stats">${[['Qorni', 100 - P.hunger], ['Uyqu', P.energy], ['Kayfiyat', P.mood], ['Mehr', P.affection]].map(([n, v]) => `<div><span>${n}</span><i style="--v:${Math.round(v)}%"></i></div>`).join('')}</div>
      <button class="pp-opt" data-opt="chars"><span>Personajni almashtirish</span><small>${PET.name}</small></button>
      <button class="pp-opt" data-opt="look"><span>Ko'rinishini o'zgartirish</span><small>rang</small></button>
      <button class="pp-opt" data-opt="captions"><span>Subtitr (gapini yozib ko'rsatish)</span><i class="sw ${P.captions ? 'on' : ''}"></i></button>
      <button class="pp-opt" data-opt="wander"><span>O'zi yurib yursin</span><i class="sw ${P.wander ? 'on' : ''}"></i></button>
      <button class="pp-opt" data-opt="name"><span>Meni nima deb chaqirsin</span><small>${esc(store.get('ownerName', '') || "o'rnatilmagan")}</small></button>
      <button class="pp-opt" data-opt="hide"><span>Yashirish</span></button>`
  }
  document.body.appendChild(p)
  positionPanel()
  p.addEventListener('click', (e) => {
    const g = e.target.closest('[data-gift]'); if (g) return giveGift(g.dataset.gift)
    const gm = e.target.closest('[data-game]'); if (gm) { closePanel(); hidePill(); return Games.start(gm.dataset.game) }
    const ch = e.target.closest('[data-char]'); if (ch) { if (ch.dataset.missing) return toast(`Avval ${CHARS[ch.dataset.char].model} faylini qo'ying`); closePanel(); return switchChar(ch.dataset.char) }
    const tb = e.target.closest('[data-tint]')
    if (tb) { const gname = tb.dataset.tint, c = tb.dataset.c || null; P.tints = { ...(P.tints || {}), [gname]: c }; if (!c) delete P.tints[gname]; savePet(); C.av?.setTint(gname, c); openPanel('look'); if (Math.random() < 0.5) petSay(pickOf('Yarashdimi?', 'Hi-hi, chiroyli bo\'ldimi?', 'Voy, yangi rang!'), { face: 'shy', pose: 'coy', poseMs: 3000 }); return }
    const o = e.target.closest('[data-opt]')?.dataset.opt
    if (o === 'chars' || o === 'look') return openPanel(o)
    if (o === 'captions' || o === 'wander') { P[o] = !P[o]; savePet(); e.target.closest('[data-opt]').querySelector('.sw').classList.toggle('on', P[o]) }
    if (o === 'name') { const n = prompt(`${PET.name} sizni nima deb chaqirsin?`, store.get('ownerName', '') || ''); if (n != null) { store.set('ownerName', n.trim().slice(0, 30)); openPanel('more') } }
    if (o === 'hide') { closePanel(); togglePet(false) }
  })
}
function positionPanel() {
  const p = document.querySelector('.pet-panel'); if (!p || !C.el) return
  const r = C.el.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight
  p.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + 'px'
  p.style.top = Math.max(8, r.top - ph - 54) + 'px'
}
function closePanel() { document.querySelector('.pet-panel')?.remove() }
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.pet-panel, .pet-pill, .pet')) { closePanel(); if (C.pill && C.pill.querySelector('.pet-type').hidden) hidePill() }
})

// ---------- Personajni almashtirish ----------
function switchChar(id) {
  if (!CHARS[id] || id === PET.id) return
  savePet()
  poofOut(() => {
    PET = CHARS[id]; store.set('petId', id)
    for (const k of Object.keys(P)) delete P[k]
    Object.assign(P, DEF(), store.get(stateKey(), {}), { on: true })
    savePet(); buildPet(true)
  })
}

// ---------- Hayot sikli ----------
function tick() {
  const now = Date.now()
  const hrs = Math.min(48, (now - P.lastTick) / 3600000)
  P.lastTick = now
  const night = (() => { const h = new Date().getHours(); return h >= 23 || h < 6 })()
  if (P.sleeping) {
    P.hunger = clamp100(P.hunger + 5 * hrs)
    P.energy = clamp100(P.energy + (35 + (P.blanket ? 12 : 0) + (P.pillow ? 8 : 0)) * hrs)
  } else {
    P.hunger = clamp100(P.hunger + 11 * hrs)
    P.energy = clamp100(P.energy - (night ? 14 : 8) * hrs)
  }
  P.mood = clamp100(P.mood + (60 - P.mood) * Math.min(1, 0.1 * hrs) - (P.hunger > 85 ? 8 * hrs : 0) - (P.energy < 15 ? 5 * hrs : 0))
  savePet()
  if (!C.av?.ready() || C.busy || document.hidden || Games.active || C.rec) return

  if (P.sleeping && P.energy >= 99) { wakeUp(); P.blanket = P.pillow = false; savePet(); petSay(pick(LINES.wake), { face: 'happy', pose: 'stretch', poseMs: 2500 }); return }
  if (P.sleeping) return
  // Ochlik: so'raydi → jahli chiqadi → arazlaydi
  if (P.hunger > 70 && now - P.lastHungerAsk > (P.hungerAsks >= 2 ? 4 : 6) * 60000) {
    P.lastHungerAsk = now; P.hungerAsks++
    if (P.hungerAsks >= 4 && !P.sulking) { P.sulking = true; P.mood = clamp100(P.mood - 10); savePet(); petSay(pick(LINES.sulk), { face: 'pout', pose: 'hurt' }); return }
    if (P.hungerAsks >= 3) { P.mood = clamp100(P.mood - 6); savePet(); petSay(pick(LINES.hungryAngry), { face: 'angry', pose: 'tantrum', poseMs: 4000, loud: true }); return }
    savePet(); petSay(pick(LINES.hungry), { face: 'sad', pose: 'sad', poseMs: 4000 }); return
  }
  // Uyqu
  if (P.energy < 12) { petSay(pick(LINES.fallAsleep), { face: 'sleepy', pose: 'yawn', poseMs: 2000 }); setTimeout(goSleep, 2200); return }
  if (P.energy < 25 && now - P.lastSleepyAsk > 5 * 60000) { P.lastSleepyAsk = now; savePet(); petSay(pick(LINES.sleepy), { face: 'sleepy', pose: 'yawn', poseMs: 2500 }); return }
  // Zerikish
  if (now - P.lastTouch > 15 * 60000 && now - P.lastBored > 20 * 60000) { P.lastBored = now; savePet(); petSay(pick(LINES.bored), { face: P.sulking ? 'pout' : 'bored', pose: 'bored', poseMs: 5000 }); return }
  // O'zi yurish va mayda harakatlar (tirik ko'rinishi uchun)
  if (P.wander && !P.sulking && C.pose === 'stand' && Math.random() < 0.3) {
    const r = Math.random(), happy = P.mood > 65
    if (r < 0.4) walkTo(minX() + Math.random() * (innerWidth - C.w - minX() - 8), floorY() - Math.random() * 30)
    else if (r < 0.5) setPose('sit', 14000)
    else if (r < 0.56) C.av?.wave()
    else if (r < 0.63) { setPose('stretch', 2600); setFace('relaxed') }
    else if (r < 0.7) { setPose(happy ? 'coy' : 'bored', 4500); setFace(happy ? 'shy' : 'bored') }
    else if (r < 0.77 && happy) { setPose('dance', 5000); setFace('happy') }
    else if (r < 0.83 && happy) { setPose('giggle', 2400); setFace('happy') }
    else if (r < 0.88 && P.energy < 50) { setPose('yawn', 2200); setFace('sleepy') }
    else setPose('think', 2500)
  }
}
setInterval(tick, 20000)

let seenTimer = 0
function greet() {
  applyLook()
  const away = Date.now() - (P.lastSeen || Date.now())
  P.lastSeen = Date.now(); savePet()
  clearInterval(seenTimer); seenTimer = setInterval(() => { P.lastSeen = Date.now(); savePet() }, 60000)
  tick()
  if (P.sleeping || P.sulking) return
  setTimeout(() => {
    C.av?.wave()
    const h = new Date().getHours()
    const hi = h < 11 ? 'Xayrli tong!' : h < 18 ? 'Salom!' : h < 23 ? 'Xayrli kech!' : 'Hali uxlamadingizmi?'
    const met = store.get('petMet:' + PET.id, PET.id === 'shinobu' && store.get('petMet', false))
    petSay(away > 6 * 3600000 ? `${hi} ${pick(LINES.missed)}` : !met ? pick(LINES.hello).replace('{name}', PET.name) : hi, { face: 'happy' })
    store.set('petMet:' + PET.id, true)
  }, 700)
}

// ---------- Batareya ----------
;(async () => {
  if (!navigator.getBattery) return
  try {
    const b = await navigator.getBattery()
    let warned = 101
    const check = () => {
      const p = Math.round(b.level * 100)
      if (b.charging) { if (warned <= 20) { warned = 101; C.av && petSay(pick(LINES.charging), { face: 'happy', pose: 'clap', poseMs: 2000 }) } return }
      if (p <= 10 && warned > 10) { warned = 10; C.av && petSay(pick(LINES.batteryCritical).replace('{p}', p), { face: 'scared', pose: 'scared', poseMs: 3000, loud: true }) }
      else if (p <= 20 && warned > 20) { warned = 20; C.av && petSay(pick(LINES.batteryLow).replace('{p}', p), { face: 'surprised', pose: 'surprised', poseMs: 1800 }) }
    }
    b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check)
    setTimeout(check, 5000)
  } catch { /* qo'llanmaydi */ }
})()

// ---------- Ko'rsatish / yashirish (animatsiya bilan) ----------
function poofOut(done) {
  if (!C.el) return done?.()
  C.rec?.cancel(); C.rec = null; stopSpeaking()
  closePanel(); hidePill(); if (C.cap) C.cap.hidden = true
  burst()
  C.el.classList.add('poof-out')
  setTimeout(() => {
    C.av?.destroy(); C.av = null
    document.querySelectorAll('.pet, .pet-pill, .pet-cap, .pet-panel').forEach((e) => e.remove())
    C.el = null; C.pill = null; C.cap = null
    done?.()
  }, 480)
}
function togglePet(on) {
  P.on = on ?? !P.on; savePet()
  if (!P.on) poofOut(renderPetToggle)
  else buildPet(true)
}
function renderPetToggle() {
  const b = document.getElementById('buddyBtn'); if (!b) return
  b.querySelector('span').textContent = P.on ? PET.name : `${PET.name}ni chaqirish`
  b.querySelector('.bt-face').innerHTML = `<img src="${PET.face}" alt="">`
}
document.getElementById('buddyBtn')?.addEventListener('click', () => { togglePet(); closeSide() })
document.addEventListener('visibilitychange', () => { if (document.hidden) { C.rec?.cancel(); C.rec = null; C.el?.classList.remove('listening') } })

// O'yinlar uchun
window.Pet = {
  react(kind, text) {
    if (!C.av) return
    const map = {
      cheer: ['clap', 'excited', 1600], fight: ['fight', 'smug', 2600], win: [pickOf('jump', 'clap', 'laugh'), 'excited', 2600], lose: [pickOf('tantrum', 'pout', 'puff'), 'angry', 2800],
      sad: ['cryStand', 'cry', 3000], think: ['think', 'relaxed', 1500], scared: ['scared', 'scared', 1500], surprised: ['surprised', 'surprised', 1400],
      smug: ['giggle', 'smug', 2000],
    }
    const [p, f, ms] = map[kind] || ['stand', 'neutral', 1000]
    setPose(p, ms); setFace(f)
    if (text) petSay(text, { face: f })
    setTimeout(applyLook, ms + 200)
  },
  mood(d) { P.mood = clamp100(P.mood + d); P.lastTouch = Date.now(); savePet() },
  get name() { return PET.name },
}

if (window.Avatar3D) buildPet(false); else addEventListener('avatar3d-ready', () => buildPet(false), { once: true })
