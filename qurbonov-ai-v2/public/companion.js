// ============ Shinobu — ekrandagi tirik 3D hamroh ============
// Och qoladi, uxlaydi, xafa bo'ladi, arazlaydi, yig'laydi, quvonadi. Sovg'a olsa yumshaydi.
// Gaplaringizni tushunadi ("chekkaga o'tib tur", "uxla", "raqsga tush"...), siz bilan o'ynaydi.
// Sichqoncha bilan surilmaydi — o'zi yuradi yoki aytganingizda o'tadi.

const PET = {
  id: 'shinobu', name: 'Shinobu', fullName: 'Shinobu Oshino', gender: 'female',
  model: '/models/vampira.vrm', face: '/models/vampira.jpg',
  trait: "o'zini qadimiy va buyuk vampir deb biladigan, lekin aslida juda shirin va injiq qiz. Mag'rur, ozgina kinoyali, " +
    "shirinliklarni (ayniqsa donut va shokoladni) jonidan ortiq ko'radi. Egasini yashirincha yaxshi ko'radi, lekin buni tan olishga uyaladi. " +
    "Xafa qilsa — arazlaydi yoki yig'laydi, sovg'a olsa — eriydi.",
}

const LINES = {
  hungry: ["Qornim ochdi… biror narsa yeymizmi?", "Ovqat yegim kelyapti. Menga shirinlik berasizmi?", "Qornim g'uldirayapti, eshityapsizmi? Donut bormi?"],
  hungryAngry: ["QORNIM OCH DEDIM-KU! Nega bermayapsiz?!", "Meni och qoldirmoqchimisiz?! Tezroq ovqat bering!", "Men buyuk vampirman, och qoldirib bo'lmaydi! OVQAT!"],
  sulk: ["Hm. Siz bilan gaplashmayman.", "Arazladim. Menga qaramang.", "Mayli, menga e'tibor bermasangiz, men ham bermayman."],
  sleepy: ["Aaah… uyqum kelyapti…", "Ko'zlarim yumilyapti… ko'rpa berasizmi?", "Yostiq bormi? Ozgina uxlab olay…"],
  fallAsleep: ["Bo'ldi… men uxladim…", "Ozgina… mizg'ib olaman…"],
  wake: ["Mm… yaxshi uxladim!", "Uyg'ondim! Nima qilamiz?", "Uf, qancha uxlabman-a. Salom!"],
  grumpyWake: ["Nima?.. Endi uxlagan edim-ku…", "Uyqumni buzdingiz… hm."],
  bored: ["Zerikdim… biror narsa o'ynaymizmi?", "Menga ham e'tibor bering-da!", "Tir o'ynaymizmi? Men sizni yutaman!"],
  thanksLove: ["Voy… bu menga-mi? Rahmat!", "Qanday chiroyli… mayli, sizni ozgina yaxshi ko'raman.", "Hi-hi… rahmat! Uyaltirib yubordingiz."],
  thanksFood: ["Mmm, mazali! Rahmat!", "Ana endi boshqa gap! Rahmat!", "Yum-yum… siz eng zo'risiz!"],
  full: ["To'ydim, endi sig'maydi…", "Yo'q-yo'q, qornim to'q. Keyinroq!"],
  notSleepy: ["Hali uxlamayman, lekin saqlab qo'yaman, rahmat.", "Rahmat! Kechasi kerak bo'ladi."],
  cozy: ["Mm… issiqqina… rahmat…", "Yumshoqqina… zzz…"],
  forgive: ["Mayli… kechirdim. Lekin boshqa xafa qilmang!", "Hm… yaxshi, endi araz emasman."],
  hello: ["Salom! Men Shinobu. Bosib gapiring.", "Keldingizmi? Kutib o'tirgan edim!"],
  missed: ["Qayerda edingiz? Sog'indim… ozgina.", "Uzoq kutdim-a! Endi meni tashlab ketmang."],
  batteryLow: ["Diqqat! Batareyangiz {p} foiz qoldi, quvvatlagichga ulang.", "Batareya tugayapti, {p} foiz. Zaryadga qo'ying!"],
  batteryCritical: ["Batareya juda kam, {p} foiz! Tezroq quvvatlang, bo'lmasa ikkalamiz ham o'chamiz!"],
  charging: ["Rahmat, quvvatlanyapti!"],
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]

// ---------- Holat ----------
const P = Object.assign({
  on: true, hunger: 30, energy: 85, mood: 65, affection: 40, sleeping: false, blanket: false, pillow: false, sulking: false,
  lastTick: Date.now(), lastSeen: Date.now(), x: null, y: null, captions: false, wander: true,
  hungerAsks: 0, lastHungerAsk: 0, lastSleepyAsk: 0, lastBored: 0, lastTouch: Date.now(), gifts: [], history: [],
}, store.get('pet', {}))
const savePet = () => store.set('pet', P)
const clamp100 = (v) => Math.max(0, Math.min(100, v))

const C = { el: null, av: null, fx: null, pill: null, cap: null, busy: false, rec: null, pose: 'stand', face: 'neutral', poseT: 0, walkT: 0, w: 96, h: 160 }

function petSize() { return innerWidth < 760 ? { w: 76, h: 128 } : { w: 96, h: 160 } }
function floorY() { return innerHeight - C.h - (innerWidth < 760 ? 112 : 128) }

// ---------- Qurish ----------
function buildPet() {
  C.av?.destroy(); C.av = null
  document.querySelectorAll('.pet, .pet-pill, .pet-cap, .pet-panel').forEach((e) => e.remove())
  renderPetToggle()
  if (!P.on || !window.Avatar3D?.supported()) return
  const sz = petSize(); C.w = sz.w; C.h = sz.h
  const el = document.createElement('div')
  el.className = 'pet'; el.tabIndex = 0
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${PET.name} — gapirish uchun bosing`)
  el.style.width = C.w + 'px'; el.style.height = C.h + 'px'
  el.innerHTML = `<div class="pet-load"><img src="${PET.face}" alt=""><span>0%</span></div><div class="pet-fx"></div><div class="pet-ring"></div>`
  document.body.appendChild(el)
  C.el = el; C.fx = el.querySelector('.pet-fx')

  const cap = document.createElement('div'); cap.className = 'pet-cap'; cap.hidden = true; document.body.appendChild(cap); C.cap = cap
  const pill = document.createElement('div'); pill.className = 'pet-pill'; pill.hidden = true
  pill.innerHTML = `
    <button data-pet="gift" title="Sovg'a berish"><svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M2.5 9h19v-2.5h-19zM12 6.5V20M12 6.5C9 2.5 5.5 4 7.5 6.5M12 6.5c3-4 6.5-2.5 4.5 0"/></svg></button>
    <button data-pet="game" title="O'ynash"><svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="17.5" cy="13.5" r="1"/></svg></button>
    <button data-pet="type" title="Yozish"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/></svg></button>
    <button data-pet="more" title="Sozlamalar"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
    <form class="pet-type" hidden><input placeholder="${PET.name}ga yozing…" autocomplete="off"><button type="submit" aria-label="Yuborish"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>`
  document.body.appendChild(pill); C.pill = pill

  if (P.x == null) { P.x = innerWidth - C.w - 30; P.y = floorY() }
  place(P.x, P.y, false)

  C.av = Avatar3D.mount(el, PET.model, {
    onProgress: (k) => { const s = el.querySelector('.pet-load span'); if (s) s.textContent = Math.round(k * 100) + '%' },
    onReady: () => { el.querySelector('.pet-load')?.remove(); applyLook(); greet() },
    onError: () => { const s = el.querySelector('.pet-load span'); if (s) s.textContent = 'xato' },
  })
  bindPet()
}

// ---------- Joylashuv (faqat o'zi yuradi) ----------
function clampPos(x, y) { return [Math.max(2, Math.min(innerWidth - C.w - 2, x)), Math.max(56, Math.min(innerHeight - C.h - 2, y))] }
function place(x, y, animate, ms = 0) {
  ;[x, y] = clampPos(x, y)
  C.el.style.transition = animate ? `left ${ms}ms linear, top ${ms}ms linear` : 'none'
  C.el.style.left = x + 'px'; C.el.style.top = y + 'px'
  P.x = x; P.y = y; savePet()
  setTimeout(placeUI, animate ? ms : 0)
}
function walkTo(x, y, then) {
  ;[x, y] = clampPos(x, y)
  const r = C.el.getBoundingClientRect()
  const dist = Math.hypot(x - r.left, y - r.top)
  if (dist < 12) { place(x, y, false); then?.(); return }
  if (P.sleeping) wakeUp(true)
  const ms = Math.min(8000, Math.max(700, dist / 90 * 1000))
  C.av?.setFacing(x < r.left ? -1 : 1)
  setPose('walk')
  place(x, y, true, ms)
  clearTimeout(C.walkT)
  C.walkT = setTimeout(() => { if (C.pose === 'walk') setPose(baseIdle()); then?.() }, ms)
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
addEventListener('resize', () => { if (!C.el) return; const sz = petSize(); C.w = sz.w; C.h = sz.h; C.el.style.width = C.w + 'px'; C.el.style.height = C.h + 'px'; place(P.x, P.y, false) })

const SPOTS = {
  edge: () => (P.x + C.w / 2 < innerWidth / 2 ? [2, floorY()] : [innerWidth - C.w - 2, floorY()]),
  left: () => [Math.max(2, innerWidth < 760 ? 4 : 270), floorY()],
  right: () => [innerWidth - C.w - 4, floorY()],
  center: () => [innerWidth / 2 - C.w / 2 + (innerWidth < 760 ? 0 : 120), floorY()],
  closer: () => [innerWidth / 2 + (innerWidth < 760 ? 40 : 260), floorY() + 20],
}

// ---------- Poza va yuz ----------
function baseIdle() { return P.sleeping ? 'sleep' : P.sulking ? 'sulk' : 'stand' }
function setPose(p, ms) {
  C.pose = p; C.av?.setPose(p)
  clearTimeout(C.poseT)
  if (ms) C.poseT = setTimeout(() => { if (C.pose === p) { setPose(baseIdle()); applyLook() } }, ms)
  fxForPose()
}
function setFace(f) { C.face = f; C.av?.setFace(f); fxForPose() }
function applyLook() {
  if (P.sleeping) { setPose('sleep'); setFace('sleepy'); return }
  if (P.sulking) { setPose('sulk'); setFace('angry'); return }
  setPose('stand')
  setFace(P.hunger > 80 || P.mood < 30 ? 'sad' : P.energy < 25 ? 'sleepy' : P.mood > 75 ? 'happy' : 'neutral')
}

// ---------- Effektlar va sovg'a buyumlari ----------
let fxTimer = 0, held = null
function fxForPose() {
  if (!C.fx) return
  C.fx.querySelectorAll('.fx-loop').forEach((e) => e.remove())
  const loop = (kind, every) => { const d = document.createElement('i'); d.className = 'fx-loop'; d.dataset.kind = kind; d.dataset.every = every; C.fx.appendChild(d) }
  if (C.pose === 'sleep') loop('z', 1100)
  if (C.pose === 'cry' || C.face === 'cry') loop('tear', 260)
  if (C.face === 'love') loop('heart', 700)
  if (C.face === 'angry' && C.pose !== 'sulk') loop('anger', 1400)
  if (C.pose === 'dance') loop('note', 600)
}
function spawnFx(kind) {
  const a = C.av?.anchor('head'); if (!a) return
  const s = document.createElement('span'); s.className = `fx fx-${kind}`; s.innerHTML = FX_SVG[kind]
  const side = Math.random() < 0.5 ? -1 : 1
  if (kind === 'tear') { s.style.left = a.x + side * C.w * 0.07 + 'px'; s.style.top = a.y + C.h * 0.02 + 'px' }
  else if (kind === 'anger') { s.style.left = a.x + C.w * 0.16 + 'px'; s.style.top = a.y - C.h * 0.06 + 'px' }
  else { s.style.left = a.x + side * (8 + Math.random() * 14) + 'px'; s.style.top = a.y - C.h * 0.06 + 'px' }
  C.fx.appendChild(s); setTimeout(() => s.remove(), 1800)
}
function fxTick() {
  if (!C.fx || !C.av?.ready()) return
  const now = Date.now()
  C.fx.querySelectorAll('.fx-loop').forEach((d) => { if (!d.last || now - d.last > +d.dataset.every) { d.last = now; spawnFx(d.dataset.kind) } })
  // ushlab turgan sovg'a / ko'rpa / yostiq
  const show = (id, cls, anchorName, dx, dy, w) => {
    let e = C.fx.querySelector('.' + cls)
    if (!id) { e?.remove(); return }
    if (!e || e.dataset.id !== id) { e?.remove(); e = document.createElement('span'); e.className = 'prop ' + cls; e.dataset.id = id; e.innerHTML = PROP_SVG[id]; C.fx.appendChild(e) }
    const a = C.av.anchor(anchorName); if (!a) return
    e.style.width = w + 'px'; e.style.left = a.x + dx - w / 2 + 'px'; e.style.top = a.y + dy + 'px'
  }
  show(held?.until > now ? held.id : null, 'prop-held', held?.at || 'hand', 0, -C.h * 0.06, C.w * 0.32)
  show(P.sleeping && P.blanket ? 'blanket' : null, 'prop-blanket', 'hips', 0, -C.h * 0.1, C.w * 0.95)
  show(P.sleeping && P.pillow ? 'pillow' : null, 'prop-pillow', 'head', 0, C.h * 0.02, C.w * 0.5)
}
setInterval(fxTick, 90)
function hold(id, ms, at) { held = { id, until: Date.now() + ms, at } }

// ---------- Gapirish ----------
async function petSay(text, { face, pose, poseMs, loud } = {}) {
  if (face) setFace(face)
  if (pose) setPose(pose, poseMs)
  if (P.captions) { C.cap.textContent = text; C.cap.hidden = false; C.cap.classList.toggle('loud', !!loud); placeUI() }
  P.history.push({ role: 'assistant', content: text }); P.history = P.history.slice(-16); savePet()
  await Promise.race([speak(text, { gender: PET.gender, onStart: () => C.av?.setTalking(true) }), new Promise((r) => setTimeout(r, 4000 + text.length * 120))])
  C.av?.setTalking(false)
  setTimeout(() => { if (!C.av) return; C.cap.hidden = true }, 1200)
}

// ---------- Bosish: tinglaydi ----------
function bindPet() {
  C.el.addEventListener('click', petTap)
  C.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); petTap() } })
  C.el.addEventListener('contextmenu', (e) => { e.preventDefault(); showPill(true) })
  C.el.addEventListener('mouseenter', () => showPill(true))
  C.pill.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pet]'); if (!b) return
    const act = b.dataset.pet
    if (act === 'gift') openPanel('gift')
    if (act === 'game') openPanel('game')
    if (act === 'more') openPanel('more')
    if (act === 'type') { const f = C.pill.querySelector('.pet-type'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input').focus(); placeUI() }
    keepPill()
  })
  C.pill.querySelector('.pet-type').addEventListener('submit', (e) => {
    e.preventDefault()
    const inp = e.target.querySelector('input'); const t = inp.value.trim(); if (!t) return
    inp.value = ''; e.target.hidden = true; hidePill(); petHear(t)
  })
}
let pillT = 0
function showPill(auto) { C.pill.hidden = false; placeUI(); keepPill(auto ? 4000 : 6000) }
function keepPill(ms = 7000) { clearTimeout(pillT); pillT = setTimeout(() => { if (C.pill.matches(':hover') || C.el?.matches(':hover')) return keepPill(2500)
    if ( C.pill.querySelector('.pet-type').hidden && !document.querySelector('.pet-panel')) hidePill() }, ms) }
function hidePill() { C.pill.hidden = true; C.pill.querySelector('.pet-type').hidden = true }

async function petTap() {
  P.lastTouch = Date.now()
  showPill()
  if (C.rec) { const r = C.rec; r.spoke = true; petHeard(r, true); return }
  if (C.busy) { stopSpeaking(); C.av?.setTalking(false); return }
  if (P.sleeping) { const grumpy = P.energy < 60; wakeUp(); if (grumpy) { setFace('angry'); petSay(pick(LINES.grumpyWake), { face: 'angry' }) } else petSay(pick(LINES.wake), { face: 'happy' }); return }
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
  setPose(P.sleeping ? 'sleep' : 'think'); setFace('relaxed')
  const hour = new Date().getHours()
  try {
    const res = await fetch('/api/companion', {
      method: 'POST', headers: H(),
      body: JSON.stringify({
        text, history: P.history.slice(0, -1),
        companion: {
          name: PET.name, trait: PET.trait, owner: store.get('ownerName', ''),
          state: { hunger: Math.round(P.hunger), energy: Math.round(P.energy), mood: Math.round(P.mood), affection: Math.round(P.affection),
            sleeping: P.sleeping, sulking: P.sulking, gifts: P.gifts.slice(-3).join(', '), time: `${hour}:00, ${hour < 6 ? 'tun' : hour < 12 ? 'ertalab' : hour < 18 ? 'kunduzi' : 'kechqurun'}` },
        },
      }),
    })
    if (res.status === 401) { showGate(); throw new Error("Parol noto'g'ri") }
    const d = await res.json()
    if (!res.ok) throw new Error(d.detail || 'Xato')
    P.mood = clamp100(P.mood + d.mood_delta)
    if (d.insult) { P.affection = clamp100(P.affection - 6); if (P.mood < 35) P.sulking = true }
    savePet()
    await doAction(d)
  } catch (e) {
    applyLook()
    petSay("Kechirasiz, hozir o'ylay olmayapman… keyinroq gaplashamiz.", { face: 'sad' })
  } finally { C.busy = false }
}

const EMO_POSE = { cry: ['cry', 7000], love: ['love', 3500], shy: ['shy', 3500], angry: ['angry', 4000], sad: [null], surprised: [null], happy: [null] }
async function doAction(d) {
  const face = d.emotion === 'cry' ? 'cry' : d.emotion
  setFace(face)
  const [ep, ems] = EMO_POSE[d.emotion] || [null]
  const say = (opts = {}) => petSay(d.say, { face, ...opts })
  switch (d.action) {
    case 'go_edge': case 'go_left': case 'go_right': case 'go_center': case 'come_closer': {
      const spot = { go_edge: 'edge', go_left: 'left', go_right: 'right', go_center: 'center', come_closer: 'closer' }[d.action]
      if (P.sulking) { await say(); return }
      say(); walkTo(...SPOTS[spot]()); return
    }
    case 'sit': setPose('sit'); await say(); return
    case 'stand': P.sleeping = false; setPose('stand'); await say(); return
    case 'sleep':
      setPose('yawn', 2200); await say({ face: 'sleepy' })
      setTimeout(() => goSleep(), 400); return
    case 'wake': wakeUp(); await say({ face: 'happy' }); return
    case 'dance': setPose('dance', 9000); setFace('happy'); await say(); return
    case 'yawn': setPose('yawn', 2500); await say({ face: 'sleepy' }); return
    case 'wave': C.av?.wave(); await say(); return
    case 'turn_away': P.sulking = true; savePet(); setPose('sulk'); await say({ face: 'angry' }); return
    case 'turn_back': P.sulking = false; savePet(); setPose('stand'); await say(); return
    case 'eat': setPose('eat', 3500); await say(); return
    case 'hug': setPose('hug', 4000); setFace('love'); await say({ face: 'love' }); return
    case 'cry': setPose('cry', 7000); await say({ face: 'cry' }); return
    case 'cheer': setPose('cheer', 2500); await say(); return
    case 'game_tir': case 'game_rps': case 'game_hearts':
      await say(); Games.start(d.action.slice(5)); return
    default:
      if (ep) setPose(ep, ems)
      else if (C.pose === 'think' || C.pose === 'listen') setPose(baseIdle())
      if (d.emotion === 'happy' && Math.random() < 0.3) C.av?.nod()
      await say()
      if (!ep) applyLook()
  }
}

// ---------- Uyqu ----------
function goSleep() {
  if (C.pose === 'walk') return
  P.sleeping = true; P.sulking = false; savePet()
  setPose('sleep'); setFace('sleepy')
}
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
  if (g.kind === 'food' && P.hunger < 8) { petSay(pick(LINES.full), { face: 'happy' }); return }
  if (P.sleeping && g.kind !== 'sleep') { wakeUp() }
  P.gifts.push(g.name); P.gifts = P.gifts.slice(-10)
  P.hunger = clamp100(P.hunger + g.hunger); P.mood = clamp100(P.mood + g.mood); P.affection = clamp100(P.affection + g.aff)
  P.hungerAsks = 0
  const wasSulking = P.sulking
  if (P.sulking && P.mood >= 45) P.sulking = false
  savePet()
  if (g.kind === 'sleep') {
    P[id] = true; savePet()
    if (P.sleeping) { setFace('happy'); setTimeout(() => setFace('sleepy'), 2500); petSay(pick(LINES.cozy), { face: 'happy' }); return }
    if (P.energy < 45) { petSay(pick(LINES.cozy), { face: 'happy', pose: 'yawn', poseMs: 2000 }); setTimeout(goSleep, 2300); return }
    P[id] = false; savePet(); hold(id, 3000, 'chest'); petSay(pick(LINES.notSleepy), { face: 'shy', pose: 'hug', poseMs: 3000 }); return
  }
  if (g.kind === 'food') { hold(id, 4500, 'hand'); petSay(wasSulking && !P.sulking ? pick(LINES.forgive) : pick(LINES.thanksFood), { face: 'happy', pose: 'eat', poseMs: 4500 }); return }
  hold(id, 6000, id === 'teddy' ? 'chest' : 'hand')
  petSay(wasSulking && !P.sulking ? pick(LINES.forgive) : pick(LINES.thanksLove), { face: 'love', pose: id === 'teddy' ? 'hug' : 'love', poseMs: 6000 })
}

// ---------- Panellar (sovg'a, o'yin, sozlama) ----------
function openPanel(kind) {
  closePanel()
  const p = document.createElement('div'); p.className = 'pet-panel'; p.dataset.kind = kind
  if (kind === 'gift') {
    p.innerHTML = `<div class="pp-h">Sovg'a berish</div><div class="pp-grid">${GIFTS.map((g) => `<button data-gift="${g.id}"><i>${PROP_SVG[g.id]}</i><span>${g.name}</span></button>`).join('')}</div>`
  } else if (kind === 'game') {
    p.innerHTML = `<div class="pp-h">Birga o'ynaymiz</div><div class="pp-list">
      <button data-game="tir"><b>Tir</b><span>Nishonlarni urib, Shinobu bilan bellashing</span></button>
      <button data-game="rps"><b>Tosh-qaychi-qog'oz</b><span>5 raund, kim yutadi?</span></button>
      <button data-game="hearts"><b>Yurakcha ushlash</b><span>Tushayotgan yurakchalarni savatga yig'ing</span></button></div>`
  } else {
    p.innerHTML = `<div class="pp-h">${PET.name}</div>
      <div class="pp-stats">${[['Qorni', 100 - P.hunger], ['Uyqu', P.energy], ['Kayfiyat', P.mood], ['Mehr', P.affection]].map(([n, v]) => `<div><span>${n}</span><i style="--v:${Math.round(v)}%"></i></div>`).join('')}</div>
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
    const o = e.target.closest('[data-opt]')?.dataset.opt
    if (o === 'captions' || o === 'wander') { P[o] = !P[o]; savePet(); e.target.closest('[data-opt]').querySelector('.sw').classList.toggle('on', P[o]) }
    if (o === 'name') { const n = prompt('Shinobu sizni nima deb chaqirsin?', store.get('ownerName', '') || ''); if (n != null) { store.set('ownerName', n.trim().slice(0, 30)); openPanel('more') } }
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

// ---------- Hayot sikli: ochlik, uyqu, kayfiyat ----------
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
  if (!C.av?.ready() || C.busy || document.hidden || Games.active) return

  // Uyg'onish
  if (P.sleeping && P.energy >= 99) { wakeUp(); P.blanket = P.pillow = false; savePet(); petSay(pick(LINES.wake), { face: 'happy' }); return }
  if (P.sleeping) return
  // Ochlik
  if (P.hunger > 70 && now - P.lastHungerAsk > (P.hungerAsks >= 2 ? 4 : 6) * 60000) {
    P.lastHungerAsk = now; P.hungerAsks++
    if (P.hungerAsks >= 4 && !P.sulking) { P.sulking = true; P.mood = clamp100(P.mood - 10); savePet(); petSay(pick(LINES.sulk), { face: 'angry', pose: 'sulk' }); return }
    if (P.hungerAsks >= 3) { P.mood = clamp100(P.mood - 6); savePet(); petSay(pick(LINES.hungryAngry), { face: 'angry', pose: 'angry', poseMs: 4500, loud: true }); return }
    savePet(); petSay(pick(LINES.hungry), { face: 'sad' }); return
  }
  // Uyqu
  if (P.energy < 12) { petSay(pick(LINES.fallAsleep), { face: 'sleepy', pose: 'yawn', poseMs: 2000 }); setTimeout(goSleep, 2200); return }
  if (P.energy < 25 && now - P.lastSleepyAsk > 5 * 60000) { P.lastSleepyAsk = now; savePet(); petSay(pick(LINES.sleepy), { face: 'sleepy', pose: 'yawn', poseMs: 2500 }); return }
  // Zerikish
  if (now - P.lastTouch > 15 * 60000 && now - P.lastBored > 20 * 60000) { P.lastBored = now; savePet(); petSay(pick(LINES.bored), { face: P.sulking ? 'angry' : 'sad' }); return }
  // O'zi yurish va mayda harakatlar
  if (P.wander && !P.sulking && C.pose === 'stand' && !C.rec && Math.random() < 0.18) {
    const r = Math.random()
    if (r < 0.55) walkTo(8 + Math.random() * (innerWidth - C.w - 16), floorY() - Math.random() * 30)
    else if (r < 0.7) { setPose('sit', 12000) }
    else if (r < 0.8) C.av?.wave()
    else if (r < 0.9 && P.mood > 70) { setPose('dance', 4000); setFace('happy') }
    else { setPose('think', 2500) }
  }
}
setInterval(tick, 20000)

function greet() {
  applyLook()
  const away = Date.now() - (P.lastSeen || Date.now())
  P.lastSeen = Date.now(); savePet()
  setInterval(() => { P.lastSeen = Date.now(); savePet() }, 60000)
  tick()
  if (P.sleeping || P.sulking) return
  setTimeout(() => {
    C.av?.wave()
    const h = new Date().getHours()
    const hi = h < 11 ? 'Xayrli tong!' : h < 18 ? 'Salom!' : h < 23 ? 'Xayrli kech!' : 'Hali uxlamadingizmi?'
    petSay(away > 6 * 3600000 ? `${hi} ${pick(LINES.missed)}` : !store.get('petMet', false) ? pick(LINES.hello) : hi, { face: 'happy' })
    store.set('petMet', true)
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
      if (b.charging) { if (warned <= 20) { warned = 101; C.av && petSay(pick(LINES.charging), { face: 'happy' }) } return }
      if (p <= 10 && warned > 10) { warned = 10; C.av && petSay(pick(LINES.batteryCritical).replace('{p}', p), { face: 'surprised', pose: 'cheer', poseMs: 1500, loud: true }) }
      else if (p <= 20 && warned > 20) { warned = 20; C.av && petSay(pick(LINES.batteryLow).replace('{p}', p), { face: 'surprised' }) }
    }
    b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check)
    setTimeout(check, 5000)
  } catch { /* qo'llanmaydi */ }
})()

// ---------- Ko'rsatish / yashirish ----------
function togglePet(on) {
  P.on = on ?? !P.on; savePet()
  if (!P.on) { C.rec?.cancel(); C.rec = null; stopSpeaking(); C.av?.destroy(); C.av = null; document.querySelectorAll('.pet, .pet-pill, .pet-cap, .pet-panel').forEach((e) => e.remove()); C.el = null; renderPetToggle() }
  else buildPet()
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
    const map = { cheer: ['cheer', 'happy', 1600], win: ['cheer', 'happy', 2500], lose: ['angry', 'angry', 2500], sad: ['cry', 'cry', 3000], think: ['think', 'relaxed', 1500] }
    const [p, f, ms] = map[kind] || ['stand', 'neutral', 1000]
    setPose(p, ms); setFace(f)
    if (text) petSay(text, { face: f })
    setTimeout(applyLook, ms + 200)
  },
  mood(d) { P.mood = clamp100(P.mood + d); P.lastTouch = Date.now(); savePet() },
  get name() { return PET.name },
}

if (window.Avatar3D) buildPet(); else addEventListener('avatar3d-ready', buildPet, { once: true })
