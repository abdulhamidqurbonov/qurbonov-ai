// ============ Shinobu olami — 3.1: dunyo, resurslar, qurilish ============
// Izometrik 2D xarita. Hammasi brauzerda saqlanadi (localStorage: qai.world). Sayt yopiq bo'lsa ham resurs yig'iladi (12 soatgacha).

const $ = (id) => document.getElementById(id)
const store = {
  get(k, d) { try { const v = localStorage.getItem('qai.' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('qai.' + k, JSON.stringify(v)) } catch { /* */ } },
}
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const N = 22                 // xarita o'lchami (kataklar)
const TW = 64, TH = 32       // izometrik katak

// ---------- Resurs belgilari ----------
const RES = {
  wood: { name: "Yog'och", svg: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="4" fill="#b9814f"/><circle cx="19" cy="12" r="3.6" fill="#e7b98a"/><circle cx="19" cy="12" r="1.6" fill="#b9814f"/><path d="M6 10h8M6 14h6" stroke="#8a5a3c" stroke-width="1.2"/></svg>' },
  stone: { name: 'Tosh', svg: '<svg viewBox="0 0 24 24"><path d="M4 17l3-8 6-3 6 4 1 7-5 3H8z" fill="#a9adb6"/><path d="M7 9l6 2 6-1M13 11l2 9" stroke="#80848d" stroke-width="1.2" fill="none"/></svg>' },
  gold: { name: 'Oltin', svg: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="15" rx="8" ry="4" fill="#c99a2e"/><ellipse cx="12" cy="13" rx="8" ry="4" fill="#f4c542"/><ellipse cx="12" cy="13" rx="4.5" ry="2" fill="#ffe08a"/></svg>' },
  food: { name: 'Ovqat', svg: '<svg viewBox="0 0 24 24"><path d="M12 6c-5-3-9 1-8 6 1 6 5 9 8 7 3 2 7-1 8-7 1-5-3-9-8-6z" fill="#e2304b"/><path d="M12 6c0-2 1-3 3-4" stroke="#6b3d26" stroke-width="1.6" fill="none"/><path d="M13 4c3-2 6 0 5 1-2 1-4 0-5-1z" fill="#4fae5b"/></svg>' },
}
const RK = Object.keys(RES)

// ---------- Binolar ----------
// cost — 1-daraja narxi; har daraja ×1.8. prod — soatiga (daraja bilan ko'payadi). time — soniya.
const DEFS = {
  house: { name: 'Shinobu uyi', desc: "Shinobu shu yerda uxlaydi va dam oladi. Hamma narsa shundan boshlanadi.", size: 1, cost: { wood: 20 }, time: 15, max: 1, maxLvl: 3 },
  castle: { name: 'Qasr', desc: "Ombor sig'imini oshiradi, boshqa binolarni yuqori darajaga ko'tarishga ruxsat beradi.", size: 2, cost: { wood: 60, stone: 40 }, time: 45, max: 1, req: ['house'], maxLvl: 5 },
  farm: { name: 'Ferma', desc: 'Ovqat yetishtiradi.', size: 1, cost: { wood: 25 }, time: 20, prod: { food: 60 }, req: ['house'], maxLvl: 5 },
  lumber: { name: "Yog'ochxona", desc: "Yog'och tayyorlaydi. O'rmon yonida tezroq ishlaydi.", size: 1, cost: { wood: 15, stone: 5 }, time: 20, prod: { wood: 70 }, near: 'tree', req: ['house'], maxLvl: 5 },
  mine: { name: 'Kon', desc: "Tosh va ozgina oltin qazib oladi. Qoyalar yonida tezroq.", size: 1, cost: { wood: 30 }, time: 25, prod: { stone: 55, gold: 6 }, near: 'rock', req: ['house'], maxLvl: 5 },
  market: { name: 'Bozor', desc: 'Savdo qilib oltin topadi.', size: 1, cost: { wood: 40, stone: 30 }, time: 35, prod: { gold: 30 }, req: ['castle'], maxLvl: 5 },
  fountain: { name: 'Favvora', desc: "Chiroyli favvora. Shinobu'ning kayfiyatini ko'taradi.", size: 1, cost: { stone: 30, gold: 20 }, time: 20, max: 3, req: ['house'], maxLvl: 1 },
  tower: { name: 'Minora', desc: "Maxluqlarga yaqinlashganda o'q uzadi (5 katak masofaga).", size: 1, cost: { wood: 20, stone: 45 }, time: 30, req: ['castle'], maxLvl: 5 },
  wall: { name: 'Devor', desc: "Tosh devor. Maxluqlar zarbasini o'ziga oladi.", size: 1, cost: { stone: 8 }, time: 4, req: ['castle'], maxLvl: 3 },
  barracks: { name: 'Kazarma', desc: "Askar, kamonchi va ritsar tayyorlaydi. Darajasi oshsa — ko'proq va tezroq.", size: 1, cost: { wood: 80, stone: 60, gold: 30 }, time: 60, max: 1, req: ['castle'], maxLvl: 5 },
  guild: { name: 'Gildiya', desc: "Topshiriqlar beradi: bajarsangiz resurs, tajriba va Shinobu uchun sovg'a.", size: 1, cost: { wood: 100, stone: 80, gold: 60 }, time: 75, max: 1, req: ['castle'], reqLvl: 2, maxLvl: 5 },
}
const costOf = (type, lvl) => Object.fromEntries(Object.entries(DEFS[type].cost).map(([k, v]) => [k, Math.round(v * Math.pow(1.8, lvl - 1))]))
const timeOf = (type, lvl) => Math.round(DEFS[type].time * Math.pow(1.6, lvl - 1))

// ---------- Holat ----------
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
function newWorld() {
  const seed = Math.floor(Math.random() * 1e9), rnd = seeded(seed)
  const t = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let k = 'grass'
    const rx = Math.round(14 + Math.sin(y * 0.45) * 2.2 + (y > 12 ? 1 : 0))
    if (x === rx || x === rx + 1) k = 'water'
    else if (x + y < 9 && rnd() < 0.72) k = 'tree'
    else if (x > 17 && y > 14 && rnd() < 0.45) k = 'rock'
    else if (rnd() < 0.05) k = 'tree'
    else if (rnd() < 0.025) k = 'rock'
    t.push({ k, v: rnd(), f: k === 'grass' && rnd() < 0.08 })
  }
  // ko'prik
  const by = 11, bx = Math.round(14 + Math.sin(by * 0.45) * 2.2)
  t[by * N + bx].k = 'bridge'; t[by * N + bx + 1].k = 'bridge'
  return { v: 1, seed, tiles: t, b: [], res: { wood: 40, stone: 20, gold: 10, food: 20 }, last: Date.now(), xp: 0, cam: null, voice: true, met: false }
}
const W = store.get('world', null) || newWorld()
const save = () => { W.last = Date.now(); store.set('world', W) }
const tile = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? W.tiles[y * N + x] : null)

const has = (type, lvl = 1) => W.b.some((b) => b.type === type && b.lvl >= lvl && !b.building)
const castleLvl = () => Math.max(0, ...W.b.filter((b) => b.type === 'castle' && !b.building).map((b) => b.lvl))
const cap = () => 150 + castleLvl() * 350 + W.b.filter((b) => b.type === 'house' && !b.building).reduce((s, b) => s + b.lvl * 50, 0)
function nearBonus(b) {
  const d = DEFS[b.type]; if (!d.near) return 1
  let n = 0
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tile(b.x + dx, b.y + dy)?.k === d.near) n++
  return 1 + Math.min(0.6, n * 0.08)
}
function rates() {
  const r = { wood: 0, stone: 0, gold: 0, food: 0 }
  for (const b of W.b) {
    if (b.building || !DEFS[b.type].prod) continue
    const k = nearBonus(b)
    for (const [res, v] of Object.entries(DEFS[b.type].prod)) r[res] += v * b.lvl * k
  }
  return r
}
function produce(hours) {
  const r = rates(), c = cap(), got = {}
  for (const k of RK) {
    const add = r[k] * hours
    const before = W.res[k]
    W.res[k] = Math.min(c, W.res[k] + add)
    got[k] = W.res[k] - before
    if (W.stats?.made) W.stats.made[k] += got[k]
  }
  return got
}
const canPay = (cost) => Object.entries(cost).every(([k, v]) => W.res[k] >= v)
const pay = (cost) => { for (const [k, v] of Object.entries(cost)) W.res[k] -= v }

// ---------- Chizish ----------
const cv = $('cv'); let ctx = cv.getContext('2d')
let DPR = 1, VW = 0, VH = 0
const cam = W.cam || { x: 0, y: 0, z: innerWidth < 640 ? 0.8 : 1.1 }
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); VW = innerWidth; VH = innerHeight
  cv.width = VW * DPR; cv.height = VH * DPR
}
addEventListener('resize', resize); resize()
if (!W.cam) { cam.x = 0; cam.y = -N * TH / 2 }

const iso = (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 })
const toScreen = (wx, wy) => ({ x: (wx + cam.x) * cam.z + VW / 2, y: (wy + cam.y) * cam.z + VH / 2 })
function screenToGrid(sx, sy) {
  const wx = (sx - VW / 2) / cam.z - cam.x, wy = (sy - VH / 2) / cam.z - cam.y
  const gx = (wx / (TW / 2) + wy / (TH / 2)) / 2, gy = (wy / (TH / 2) - wx / (TW / 2)) / 2
  return { x: Math.round(gx), y: Math.round(gy), fx: gx, fy: gy }
}

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255
  r = clamp(Math.round(r * k), 0, 255); g = clamp(Math.round(g * k), 0, 255); b = clamp(Math.round(b * k), 0, 255)
  return `rgb(${r},${g},${b})`
}
function poly(pts, fill, stroke) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill() } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke() } }
// Izometrik quti: c — pastki markaz, hw/hh — yarim o'lcham, H — balandlik
function box(cx, cy, hw, hh, H, color) {
  poly([[cx - hw, cy - H], [cx, cy + hh - H], [cx, cy + hh], [cx - hw, cy]], shade(color, 0.78))
  poly([[cx, cy + hh - H], [cx + hw, cy - H], [cx + hw, cy], [cx, cy + hh]], shade(color, 0.92))
  poly([[cx, cy - hh - H], [cx + hw, cy - H], [cx, cy + hh - H], [cx - hw, cy - H]], shade(color, 1.08))
}
function roof(cx, cy, hw, hh, H, R, color) {
  const ax = cx, ay = cy - H - R
  poly([[cx - hw, cy - H], [cx, cy + hh - H], [ax, ay]], shade(color, 0.8))
  poly([[cx, cy + hh - H], [cx + hw, cy - H], [ax, ay]], shade(color, 1))
}
function shadow(cx, cy, rx, ry) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill() }

const TCOL = { grass: '#8fc46a', water: '#5bb6e8', tree: '#7fb85e', rock: '#94b46a', bridge: '#5bb6e8' }
function drawTile(t, x, y, time) {
  const p = iso(x, y), c = toScreen(p.x, p.y), z = cam.z
  const hw = TW / 2 * z, hh = TH / 2 * z
  let col = TCOL[t.k]
  if (t.k === 'grass' || t.k === 'tree' || t.k === 'rock') col = shade(col.startsWith('#') ? col : '#8fc46a', 0.94 + t.v * 0.1)
  if (t.k === 'water' || t.k === 'bridge') col = shade('#5bb6e8', 0.92 + Math.sin(time / 600 + x * 0.7 + y * 0.4) * 0.06)
  poly([[c.x, c.y - hh], [c.x + hw, c.y], [c.x, c.y + hh], [c.x - hw, c.y]], col)
  if (t.k === 'water') { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2 * z; ctx.beginPath(); const o = Math.sin(time / 500 + x + y) * 6 * z; ctx.moveTo(c.x - 10 * z + o, c.y); ctx.lineTo(c.x + 4 * z + o, c.y - 2 * z); ctx.stroke() }
  if (t.k === 'bridge') { box(c.x, c.y, hw * 0.95, hh * 0.95, 3 * z, '#b9814f'); ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 1 * z; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(c.x - hw * 0.6 + i * 6 * z, c.y - 3 * z - i * 3 * z); ctx.lineTo(c.x + hw * 0.2 + i * 6 * z, c.y + hh * 0.5 - 3 * z - i * 3 * z); ctx.stroke() } }
  if (t.f) { for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ffd6e6', '#fff4a8', '#ffffff'][i]; ctx.beginPath(); ctx.arc(c.x + (i - 1) * 7 * z, c.y + (i % 2) * 3 * z, 1.8 * z, 0, 7); ctx.fill() } }
}
function drawTree(x, y, t, time) {
  const p = iso(x, y), c = toScreen(p.x, p.y), z = cam.z
  const sway = Math.sin(time / 900 + x * 1.3 + y) * 1.2 * z, s = 0.85 + t.v * 0.35
  shadow(c.x, c.y + 2 * z, 14 * z * s, 6 * z * s)
  ctx.fillStyle = '#7a4f30'; ctx.fillRect(c.x - 2.5 * z, c.y - 16 * z * s, 5 * z, 16 * z * s)
  const g = ['#3f9a4a', '#4fae5b', '#68c272']
  ;[[0, -30, 13], [-7, -22, 10], [7, -22, 10], [0, -38, 9]].forEach(([dx, dy, r], i) => { ctx.fillStyle = g[i % 3]; ctx.beginPath(); ctx.arc(c.x + dx * z * s + sway, c.y + dy * z * s, r * z * s, 0, 7); ctx.fill() })
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(c.x - 4 * z * s + sway, c.y - 34 * z * s, 4 * z * s, 0, 7); ctx.fill()
}
function drawRock(x, y, t) {
  const p = iso(x, y), c = toScreen(p.x, p.y), z = cam.z, s = 0.8 + t.v * 0.4
  shadow(c.x, c.y + 2 * z, 14 * z * s, 6 * z * s)
  poly([[c.x - 13 * z * s, c.y + 2 * z], [c.x - 9 * z * s, c.y - 10 * z * s], [c.x + 1 * z, c.y - 15 * z * s], [c.x + 12 * z * s, c.y - 7 * z * s], [c.x + 13 * z * s, c.y + 3 * z]], '#9aa0aa')
  poly([[c.x + 1 * z, c.y - 15 * z * s], [c.x + 12 * z * s, c.y - 7 * z * s], [c.x + 13 * z * s, c.y + 3 * z], [c.x + 2 * z, c.y + 4 * z]], '#80868f')
}

// Bino rasmlari
function drawBuilding(b, time, ghost) {
  const d = DEFS[b.type], s = d.size
  const p = iso(b.x + (s - 1) / 2, b.y + (s - 1) / 2), c = toScreen(p.x, p.y), z = cam.z
  const hw = TW / 2 * z * s * 0.82, hh = TH / 2 * z * s * 0.82
  ctx.globalAlpha = ghost ? 0.6 : 1
  shadow(c.x, c.y + 3 * z, hw * 1.05, hh * 1.05)
  if (b.building && !ghost) {
    // qurilish: iskala
    box(c.x, c.y, hw, hh, 6 * z, '#c8a678')
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 2 * z
    for (const dx of [-hw * 0.7, 0, hw * 0.7]) { ctx.beginPath(); ctx.moveTo(c.x + dx, c.y + (dx === 0 ? hh * 0.7 : 0)); ctx.lineTo(c.x + dx, c.y - 28 * z * s + (dx === 0 ? hh * 0.7 : 0)); ctx.stroke() }
    ctx.beginPath(); ctx.moveTo(c.x - hw * 0.7, c.y - 18 * z * s); ctx.lineTo(c.x + hw * 0.7, c.y - 18 * z * s); ctx.stroke()
    const k = clamp(1 - (b.done - Date.now()) / (b.dur * 1000), 0, 1)
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(c.x - 22 * z, c.y - 40 * z * s, 44 * z, 6 * z)
    ctx.fillStyle = '#f4b544'; ctx.fillRect(c.x - 22 * z, c.y - 40 * z * s, 44 * z * k, 6 * z)
    ctx.globalAlpha = 1; return
  }
  const T = b.type, L = b.lvl || 1
  if (T === 'house') {
    box(c.x, c.y, hw, hh, 18 * z, '#fff4f6'); roof(c.x, c.y, hw * 1.08, hh * 1.08, 18 * z, 18 * z, '#ff8fb1')
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(c.x + hw * 0.25, c.y - 12 * z, 6 * z, 10 * z)
    ctx.fillStyle = '#7ad3ff'; ctx.fillRect(c.x - hw * 0.55, c.y - 13 * z, 6 * z, 5 * z)
    ctx.fillStyle = '#9aa0aa'; ctx.fillRect(c.x + hw * 0.35, c.y - 40 * z, 5 * z, 9 * z)
    if (isNight() || pet.inside) for (let i = 0; i < 2; i++) { ctx.fillStyle = 'rgba(255,224,138,.9)'; ctx.fillRect(c.x - hw * 0.55, c.y - 13 * z, 6 * z, 5 * z) }
    if (pet.inside) { ctx.fillStyle = '#c9c2ff'; ctx.font = `900 ${10 * z}px Manrope`; ctx.fillText('z', c.x + hw * 0.45 + Math.sin(time / 400) * 2, c.y - 44 * z - (time / 40 % 10) * z) }
  } else if (T === 'castle') {
    box(c.x, c.y, hw, hh, 26 * z, '#d9dde4')
    for (const [dx, dy] of [[-hw, 0], [hw, 0], [0, -hh], [0, hh]]) { box(c.x + dx * 0.85, c.y + dy * 0.85, 9 * z, 5 * z, 46 * z, '#c9ced6'); roof(c.x + dx * 0.85, c.y + dy * 0.85, 10 * z, 5.5 * z, 46 * z, 14 * z, '#6f63c9') }
    box(c.x, c.y, hw * 0.45, hh * 0.45, 54 * z, '#e4e7ec'); roof(c.x, c.y, hw * 0.5, hh * 0.5, 54 * z, 22 * z, '#7b6fd6')
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.moveTo(c.x, c.y - 76 * z); ctx.lineTo(c.x, c.y - 92 * z); ctx.stroke()
    poly([[c.x, c.y - 92 * z], [c.x + 12 * z + Math.sin(time / 300) * 2 * z, c.y - 88 * z], [c.x, c.y - 84 * z]], '#e2304b')
    ctx.fillStyle = '#6b3d26'; ctx.beginPath(); ctx.ellipse(c.x + hw * 0.32, c.y + hh * 0.2 - 8 * z, 6 * z, 9 * z, 0, Math.PI, 0); ctx.fill()
  } else if (T === 'farm') {
    poly([[c.x, c.y - hh], [c.x + hw, c.y], [c.x, c.y + hh], [c.x - hw, c.y]], '#a8743f')
    ctx.strokeStyle = '#7fbf4a'; ctx.lineWidth = 3 * z
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(c.x - hw * 0.7 + i * 7 * z, c.y + i * 3.5 * z - 4 * z); ctx.lineTo(c.x + i * 7 * z, c.y + hh * 0.7 + i * 3.5 * z - 4 * z); ctx.stroke() }
    box(c.x - hw * 0.45, c.y - hh * 0.35, 9 * z, 5 * z, 12 * z, '#e2304b'); roof(c.x - hw * 0.45, c.y - hh * 0.35, 10 * z, 5.5 * z, 12 * z, 8 * z, '#8a5a3c')
  } else if (T === 'lumber') {
    box(c.x - hw * 0.25, c.y - hh * 0.2, hw * 0.55, hh * 0.55, 14 * z, '#c98f5a'); roof(c.x - hw * 0.25, c.y - hh * 0.2, hw * 0.62, hh * 0.62, 14 * z, 10 * z, '#4fae5b')
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#b9814f'; ctx.beginPath(); ctx.ellipse(c.x + hw * 0.45, c.y + hh * 0.2 - i * 5 * z, 9 * z, 3 * z, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e7b98a'; ctx.beginPath(); ctx.arc(c.x + hw * 0.45 + 8 * z, c.y + hh * 0.2 - i * 5 * z, 2.5 * z, 0, 7); ctx.fill() }
    const sw = Math.sin(time / 150) * 3 * z; ctx.strokeStyle = '#9aa0aa'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(c.x + hw * 0.2 + sw, c.y - 8 * z); ctx.lineTo(c.x + hw * 0.55 + sw, c.y - 2 * z); ctx.stroke()
  } else if (T === 'mine') {
    poly([[c.x - hw, c.y + 2 * z], [c.x - hw * 0.6, c.y - 22 * z], [c.x + hw * 0.1, c.y - 30 * z], [c.x + hw * 0.8, c.y - 18 * z], [c.x + hw, c.y + 2 * z]], '#8f949d')
    poly([[c.x + hw * 0.1, c.y - 30 * z], [c.x + hw * 0.8, c.y - 18 * z], [c.x + hw, c.y + 2 * z], [c.x + hw * 0.2, c.y + 4 * z]], '#757a83')
    ctx.fillStyle = '#1b1d22'; ctx.beginPath(); ctx.ellipse(c.x - hw * 0.1, c.y - 2 * z, 9 * z, 12 * z, 0, Math.PI, 0); ctx.fill()
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.moveTo(c.x - hw * 0.1 - 10 * z, c.y - 2 * z); ctx.lineTo(c.x - hw * 0.1 - 10 * z, c.y - 14 * z); ctx.lineTo(c.x - hw * 0.1 + 10 * z, c.y - 14 * z); ctx.lineTo(c.x - hw * 0.1 + 10 * z, c.y - 2 * z); ctx.stroke()
    ctx.fillStyle = '#f4c542'; ctx.beginPath(); ctx.arc(c.x + hw * 0.5, c.y - 12 * z, 2 * z, 0, 7); ctx.fill()
  } else if (T === 'market') {
    box(c.x, c.y, hw * 0.8, hh * 0.8, 10 * z, '#c98f5a')
    for (let i = 0; i < 4; i++) poly([[c.x - hw * 0.9 + i * hw * 0.45, c.y - 24 * z + i * hh * 0.22], [c.x - hw * 0.45 + i * hw * 0.45, c.y - 24 * z + (i + 1) * hh * 0.22 - hh * 0.22], [c.x - hw * 0.45 + i * hw * 0.45, c.y - 14 * z + i * hh * 0.22], [c.x - hw * 0.9 + i * hw * 0.45, c.y - 14 * z + i * hh * 0.22 + hh * 0.22]], i % 2 ? '#fff4f6' : '#e2304b')
    ctx.fillStyle = '#f4c542'; ctx.beginPath(); ctx.arc(c.x, c.y - 8 * z, 3 * z, 0, 7); ctx.fill()
  } else if (T === 'fountain') {
    ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.ellipse(c.x, c.y, hw * 0.85, hh * 0.85, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#7ad3ff'; ctx.beginPath(); ctx.ellipse(c.x, c.y - 2 * z, hw * 0.65, hh * 0.65, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(c.x - 3 * z, c.y - 20 * z, 6 * z, 18 * z)
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + time / 500; ctx.fillStyle = 'rgba(160,220,255,.9)'; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * 8 * z, c.y - 18 * z + Math.abs(Math.sin(time / 200 + i)) * 10 * z, 1.6 * z, 0, 7); ctx.fill() }
  } else if (T === 'tower') {
    box(c.x, c.y, hw * 0.55, hh * 0.55, 44 * z, '#b8bcc4')
    for (let i = -1; i <= 1; i++) box(c.x + i * hw * 0.35, c.y - 44 * z + Math.abs(i) * 0, 4 * z, 2.5 * z, 6 * z, '#a3a8b1')
    ctx.fillStyle = '#1b1d22'; ctx.fillRect(c.x + 2 * z, c.y - 30 * z, 3 * z, 8 * z)
  } else if (T === 'wall') {
    box(c.x, c.y, hw * 0.95, hh * 0.95, 12 * z, '#a9adb6')
  } else if (T === 'barracks') {
    box(c.x, c.y, hw, hh, 18 * z, '#c9b8a0'); roof(c.x, c.y, hw * 1.05, hh * 1.05, 18 * z, 14 * z, '#b8323f')
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.moveTo(c.x + hw * 0.7, c.y - 4 * z); ctx.lineTo(c.x + hw * 0.7, c.y - 40 * z); ctx.stroke()
    poly([[c.x + hw * 0.7, c.y - 40 * z], [c.x + hw * 0.7 + 10 * z, c.y - 36 * z], [c.x + hw * 0.7, c.y - 32 * z]], '#b8323f')
  } else if (T === 'guild') {
    box(c.x, c.y, hw * 0.9, hh * 0.9, 30 * z, '#efe6d4'); roof(c.x, c.y, hw * 0.95, hh * 0.95, 30 * z, 20 * z, '#3f6fd6')
    ctx.fillStyle = '#f4c542'; ctx.beginPath(); ctx.arc(c.x + hw * 0.4, c.y - 18 * z, 4 * z, 0, 7); ctx.fill()
  }
  // daraja belgisi
  if (!ghost && (DEFS[T].maxLvl || 1) > 1) {
    ctx.fillStyle = 'rgba(16,18,24,.85)'; ctx.beginPath(); ctx.arc(c.x - hw * 0.8, c.y - 8 * z, 6.5 * z, 0, 7); ctx.fill()
    ctx.fillStyle = '#f4b544'; ctx.font = `800 ${8 * z}px Manrope`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L, c.x - hw * 0.8, c.y - 7.5 * z); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'
  }
  ctx.globalAlpha = 1
}

// ---------- Shinobu (kichkina chibi) ----------
const PETS = store.get('pet', {})
const face = new Image(); face.src = '/models/vampira.jpg'
const pet = { x: 10.5, y: 10.5, tx: 10.5, ty: 10.5, wait: 2, inside: false, say: '', sayT: 0, dir: 1, walkT: 0 }
function isNight() { const h = new Date().getHours(); return h >= 22 || h < 6 }
function drawPet(time) {
  if (pet.inside) return
  const p = iso(pet.x - 0.5, pet.y - 0.5), c = toScreen(p.x, p.y), z = cam.z
  const moving = Math.hypot(pet.tx - pet.x, pet.ty - pet.y) > 0.05
  const bob = moving ? Math.abs(Math.sin(time / 110)) * 2.5 * z : Math.sin(time / 600) * 0.8 * z
  shadow(c.x, c.y + 1 * z, 8 * z, 3.5 * z)
  // oyoqlar
  ctx.strokeStyle = '#2a2530'; ctx.lineWidth = 2.6 * z; ctx.lineCap = 'round'
  const lg = moving ? Math.sin(time / 110) * 3 * z : 0
  ctx.beginPath(); ctx.moveTo(c.x - 2.5 * z, c.y - 9 * z - bob); ctx.lineTo(c.x - 2.5 * z + lg, c.y - 1 * z); ctx.moveTo(c.x + 2.5 * z, c.y - 9 * z - bob); ctx.lineTo(c.x + 2.5 * z - lg, c.y - 1 * z); ctx.stroke()
  // ko'ylak
  poly([[c.x, c.y - 26 * z - bob], [c.x + 9 * z, c.y - 8 * z - bob], [c.x - 9 * z, c.y - 8 * z - bob]], '#22222a')
  ctx.strokeStyle = '#f4b544'; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(c.x - 8 * z, c.y - 9.5 * z - bob); ctx.lineTo(c.x + 8 * z, c.y - 9.5 * z - bob); ctx.stroke()
  // bosh (yuz rasmi)
  const r = 9 * z, hx = c.x, hy = c.y - 33 * z - bob
  ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.clip()
  if (face.complete && face.naturalWidth) { ctx.save(); if (pet.dir < 0) { ctx.translate(hx * 2, 0); ctx.scale(-1, 1) } ctx.drawImage(face, hx - r, hy - r, r * 2, r * 2); ctx.restore() } else { ctx.fillStyle = '#f6d7c3'; ctx.fill() }
  ctx.restore()
  ctx.strokeStyle = '#7a4f30'; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.stroke()
  ctx.lineCap = 'butt'
  if (pet.say && performance.now() < pet.sayT) bubble(hx, hy - r - 6 * z, pet.say)
}
function bubble(x, y, text) {
  ctx.font = '600 12.5px Manrope'
  const words = text.split(' '), lines = [''], maxW = 200
  for (const w of words) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (ctx.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t }
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20, h = lines.length * 17 + 12
  const bx = clamp(x - w / 2, 6, VW - w - 6), by = y - h
  ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 10); ctx.fill()
  poly([[x - 6, by + h - 1], [x + 6, by + h - 1], [x, by + h + 7]], 'rgba(255,255,255,.96)')
  ctx.fillStyle = '#1b1d22'; lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 20 + i * 17))
}

// ---------- Ovoz (Shinobu o'z ovozida, xohlasangiz) ----------
let audio = null
async function say(text, ms = 4500) {
  pet.say = text; pet.sayT = performance.now() + ms
  if (!W.voice || document.hidden) return
  try {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-qai-pass': store.get('pass', '') }, body: JSON.stringify({ text, lang: 'uz', gender: 'female', style: 'anime' }) })
    const d = await r.json(); if (!r.ok || !d.url) return
    audio?.pause(); audio = new Audio(d.url); audio.play().catch(() => {})
    pet.sayT = performance.now() + Math.max(ms, 6000)
  } catch { /* ovozsiz */ }
}

// ---------- Suzuvchi yozuvlar (+5) ----------
const floaters = []
function floatText(x, y, text, color = '#fff') { floaters.push({ x, y, text, color, t: performance.now() }) }

// ---------- Kadr ----------
let ghost = null, mode = null
function frame(time) {
  requestAnimationFrame(frame)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  // osmon/fon
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#6fae55'); g.addColorStop(1, '#5e9a49')
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH)
  // kataklar
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) drawTile(W.tiles[y * N + x], x, y, time)
  // bino egallagan kataklar
  const occ = new Map()
  for (const b of W.b) { const s = DEFS[b.type].size; for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) occ.set((b.y + dy) * N + b.x + dx, b) }
  // chuqurlik bo'yicha: daraxt, tosh, bino, Shinobu
  const items = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = W.tiles[y * N + x]
    if (t.k === 'tree') items.push({ d: x + y, f: () => drawTree(x, y, t, time) })
    if (t.k === 'rock') items.push({ d: x + y, f: () => drawRock(x, y, t) })
  }
  for (const b of W.b) { const s = DEFS[b.type].size; items.push({ d: b.x + b.y + (s - 1), f: () => drawBuilding(b, time) }) }
  items.push({ d: pet.x + pet.y - 0.5, f: () => drawPet(time) })
  warItems(items, time)
  if (ghost) {
    const ok = canPlace(ghost.type, ghost.x, ghost.y)
    const s = DEFS[ghost.type].size
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const p = iso(ghost.x + dx, ghost.y + dy), c = toScreen(p.x, p.y)
      poly([[c.x, c.y - TH / 2 * cam.z], [c.x + TW / 2 * cam.z, c.y], [c.x, c.y + TH / 2 * cam.z], [c.x - TW / 2 * cam.z, c.y]], ok ? 'rgba(79,209,139,.45)' : 'rgba(255,122,107,.5)')
    }
    items.push({ d: ghost.x + ghost.y + s, f: () => drawBuilding({ ...ghost, lvl: 1 }, time, true) })
  }
  items.sort((a, b) => a.d - b.d).forEach((i) => i.f())
  // tun
  if (isNight()) { ctx.fillStyle = 'rgba(20,24,70,.35)'; ctx.fillRect(0, 0, VW, VH) }
  drawArrows()
  // suzuvchi yozuvlar
  const now = performance.now()
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i], k = (now - f.t) / 1400
    if (k > 1) { floaters.splice(i, 1); continue }
    const p = toScreen(f.x, f.y)
    ctx.globalAlpha = 1 - k; ctx.font = '800 13px Manrope'; ctx.fillStyle = f.color; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3
    ctx.strokeText(f.text, p.x - 12, p.y - 50 - k * 30); ctx.fillText(f.text, p.x - 12, p.y - 50 - k * 30); ctx.globalAlpha = 1
  }
}

// ---------- Joylash ----------
function canPlace(type, x, y) {
  const s = DEFS[type].size
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
    const t = tile(x + dx, y + dy); if (!t || t.k !== 'grass') return false
    if (W.b.some((b) => { const bs = DEFS[b.type].size; return x + dx >= b.x && x + dx < b.x + bs && y + dy >= b.y && y + dy < b.y + bs })) return false
  }
  return true
}
function buildingAt(x, y) { return W.b.find((b) => { const s = DEFS[b.type].size; return x >= b.x && x < b.x + s && y >= b.y && y < b.y + s }) }
function lockReason(type) {
  const d = DEFS[type]
  if (d.max && W.b.filter((b) => b.type === type).length >= d.max) return 'Bitta yetadi'
  for (const r of d.req || []) if (!has(r, type === 'guild' ? d.reqLvl || 1 : 1)) return `Avval: ${DEFS[r].name}${d.reqLvl ? ` (${d.reqLvl}-daraja)` : ''}`
  return ''
}
function startPlace(type) {
  closePanel(); mode = 'place'; ghost = { type, x: -9, y: -9 }; cv.classList.add('place')
  $('hintText').textContent = `${DEFS[type].name}: yashil joyni bosing`; $('hint').hidden = false
}
function endPlace() { mode = null; ghost = null; cv.classList.remove('place'); $('hint').hidden = true }
$('hintX').onclick = endPlace
function place(x, y) {
  const type = ghost.type, cost = costOf(type, 1)
  if (!canPlace(type, x, y)) return toast("Bu yerga qurib bo'lmaydi")
  if (!canPay(cost)) return toast('Resurs yetmaydi')
  pay(cost)
  const dur = timeOf(type, 1)
  W.b.push({ type, x, y, lvl: 1, building: true, done: Date.now() + dur * 1000, dur })
  save(); endPlace(); renderHud()
  sayLine('build', DEFS[type].name)
  pet.tx = x + 1.2; pet.ty = y + 1.4; pet.wait = 3
}

// ---------- Panellar ----------
let panel = null
function closePanel() { panel?.remove(); panel = null }
function iconCanvas(type) {
  // bino rasmini kichik kanvasga chizamiz (asosiy chizgichni vaqtincha almashtirib)
  const c = document.createElement('canvas'); c.width = c.height = 92
  const oc = ctx, ocam = { ...cam }, ow = VW, oh = VH, s = DEFS[type].size
  try {
    ctx = c.getContext('2d'); VW = 92; VH = 92
    cam.z = 0.95 / s
    const m = iso((s - 1) / 2, (s - 1) / 2); cam.x = -m.x; cam.y = -m.y + 22 / cam.z
    drawBuilding({ type, x: 0, y: 0, lvl: 1 }, performance.now(), false)
  } finally { ctx = oc; Object.assign(cam, ocam); VW = ow; VH = oh }
  return c
}
function costHtml(cost) {
  return `<div class="cost">${Object.entries(cost).map(([k, v]) => `<span class="${W.res[k] >= v ? '' : 'no'}">${RES[k].svg}${v}</span>`).join('')}</div>`
}
function openBuild() {
  closePanel(); endPlace()
  panel = document.createElement('div'); panel.className = 'panel'
  panel.innerHTML = `<h3>Qurish<button class="x" data-x>✕</button></h3><div class="grid"></div>`
  const grid = panel.querySelector('.grid')
  for (const [type, d] of Object.entries(DEFS)) {
    const why = lockReason(type), cost = costOf(type, 1)
    const b = document.createElement('button'); b.className = 'card'; b.disabled = !!why
    b.innerHTML = `<b>${d.name}${d.soon ? '<span class="tag">tez orada</span>' : ''}</b><small>${why || d.desc}</small>${costHtml(cost)}`
    b.prepend(iconCanvas(type))
    b.onclick = () => startPlace(type)
    grid.appendChild(b)
  }
  panel.querySelector('[data-x]').onclick = closePanel
  document.body.appendChild(panel)
}
function openInfo(b) {
  closePanel(); endPlace()
  const d = DEFS[b.type]
  panel = document.createElement('div'); panel.className = 'panel info'
  const r = d.prod ? Object.entries(d.prod).map(([k, v]) => `${RES[k].name}: soatiga ${Math.round(v * b.lvl * nearBonus(b))}`).join(', ') : ''
  const next = b.lvl + 1, maxL = Math.min(d.maxLvl || 1, b.type === 'castle' ? 5 : Math.max(1, castleLvl() + 1))
  const ncost = costOf(b.type, next)
  let body = `<p>${d.desc}</p>${r ? `<p>Ishlab chiqarish — ${r}${d.near && nearBonus(b) > 1 ? ` <span class="tag">+${Math.round((nearBonus(b) - 1) * 100)}% joyi uchun</span>` : ''}</p>` : ''}`
  if (b.type === 'castle') body += `<p>Ombor sig'imi: ${cap()} (har resurs uchun)</p>`
  if (b.building) body += `<p>Qurilmoqda… ${Math.max(0, Math.ceil((b.done - Date.now()) / 1000))} soniya qoldi.</p>`
  else if (b.lvl < (d.maxLvl || 1)) {
    if (next > maxL) body += `<p>Keyingi daraja uchun avval Qasrni ${next - 1}-darajaga ko'taring.</p>`
    else body += `<p>${next}-darajaga ko'tarish (${timeOf(b.type, next)} soniya):</p>${costHtml(ncost)}`
  }
  panel.innerHTML = `<h3>${d.name} <span class="tag">${b.lvl}-daraja</span><button class="x" data-x>✕</button></h3>${body}
    <div class="row">${!b.building && b.lvl < (d.maxLvl || 1) && next <= maxL ? `<button class="btn pri" data-up ${canPay(ncost) ? '' : 'disabled'}>Ko'tarish</button>` : ''}
    ${b.building ? `<button class="btn" data-fast ${W.res.gold >= 5 ? '' : 'disabled'}>Tezlashtirish (5 oltin)</button>` : ''}
    ${b.type !== 'house' ? '<button class="btn danger" data-del>Buzish (yarmi qaytadi)</button>' : ''}</div>`
  panel.querySelector('[data-x]').onclick = closePanel
  panel.querySelector('[data-up]')?.addEventListener('click', () => {
    if (!canPay(ncost)) return
    pay(ncost); b.building = true; b.dur = timeOf(b.type, next); b.done = Date.now() + b.dur * 1000; b.upTo = next
    save(); renderHud(); closePanel(); sayLine('upgrade', d.name)
  })
  panel.querySelector('[data-fast]')?.addEventListener('click', () => { W.res.gold -= 5; b.done = Math.min(b.done, Date.now() + 500); save(); renderHud(); closePanel() })
  panel.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`${d.name} buzilsinmi?`)) return
    const c = costOf(b.type, b.lvl); for (const [k, v] of Object.entries(c)) W.res[k] = Math.min(cap(), W.res[k] + Math.floor(v / 2))
    W.b.splice(W.b.indexOf(b), 1); save(); renderHud(); closePanel()
  })
  document.body.appendChild(panel)
}

// ---------- HUD ----------
function renderHud() {
  const c = cap(), r = rates()
  $('res').innerHTML = RK.map((k) => `<div class="r ${W.res[k] >= c ? 'full' : ''}" title="${RES[k].name} — soatiga +${Math.round(r[k])}"><i>${RES[k].svg}</i><b>${Math.floor(W.res[k])}</b><small>/${c}</small></div>`).join('')
  const built = W.b.filter((b) => !b.building).length
  const L = playerLevel(), x0 = 40 * (L - 1) ** 2, x1 = 40 * L ** 2
  $('lvl').innerHTML = `Daraja <b>${L}</b><span class="xp"><i style="width:${clamp((W.xp - x0) / (x1 - x0) * 100, 0, 100)}%"></i></span> · Qasr <b>${castleLvl() || '—'}</b> · Qo'shin <b>${typeof armyCount === 'function' ? UK.reduce((s, u) => s + W.army[u], 0) : 0}</b>`
  const ab = $('armyBtn'), gb = $('guildBtn')
  if (ab) ab.hidden = !W.b.some((b) => b.type === 'barracks' && !b.building)
  if (gb) { gb.hidden = !W.b.some((b) => b.type === 'guild' && !b.building); const n = gb.hidden ? 0 : readyQuests(); gb.querySelector('em').textContent = n || ''; gb.querySelector('em').hidden = !n }
}
let toastT = 0
function toast(t) { document.querySelector('.toast')?.remove(); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 2600) }

// ---------- Shinobu gaplari ----------
const LINES = {
  first: ["Bu mening olamim! Hozircha bo'm-bo'sh… Avval menga uycha quring, iltimos!", "Salom! Bu yerda hech narsa yo'q. Keling, birga quramiz. Avval uycha kerak!"],
  build: ["Voy, {n} quryapmiz? Zo'r!", "{n}! Tezroq bitsin-a!", "Men ham yordam beraman… ozgina."],
  done: ["{n} tayyor bo'ldi! Qarang!", "Ura! {n} bitdi!", "{n} juda chiroyli chiqdi!"],
  upgrade: ["{n} yanada kattaroq bo'ladi!", "Kuchliroq {n}! Zo'r g'oya."],
  houseDone: ["Voy, uyim! Rahmat! Endi qasr ham quramizmi?", "Mening uycham! Juda shirin!"],
  idle: ["Bu yerga ferma qursak, ovqat ko'p bo'ladi.", "Daraxtlarni bossangiz, yog'och olasiz.", "Qasr qursak, ombor kattalashadi!", "Daryo bo'yi juda chiroyli…", "Bozor qursak, oltin ko'payadi!", "Qachondir bu yerda katta shahar bo'ladi!"],
  full: ["Ombor to'lib qoldi! Qasrni kattalashtirish kerak.", "Joy qolmadi! Qasrni ko'taraylik."],
  night: ["Kech bo'ldi… men uyga kiraman.", "Uyqum keldi, uyga kirdim…"],
  morning: ["Xayrli tong! Qarang, resurslar ko'paygan!"],
  fed: ["Mmm, mazali! Rahmat!", "Qornim to'ydi, rahmat!"],
  noFood: ["Ovqat yo'q-ku… Ferma quring!", "Omborda ovqat qolmadi…"],
  tree: ["Yog'och!", "Daraxt kesildi."],
}
function sayLine(kind, n = '') { say(pick(LINES[kind]).replace('{n}', n)) }

// ---------- Hayot sikli ----------
let lastTick = performance.now(), saveAcc = 0, floatAcc = 0, idleAcc = 0
function tick() {
  const now = Date.now()
  // qurilish tugadimi
  for (const b of W.b) if (b.building && now >= b.done) {
    b.building = false; if (b.upTo) { b.lvl = b.upTo; delete b.upTo }
    W.xp += 10 * b.lvl
    const p = iso(b.x, b.y); floatText(p.x, p.y, '✓', '#4fd18b')
    if (b.type === 'house' && b.lvl === 1) sayLine('houseDone'); else sayLine('done', DEFS[b.type].name)
    renderHud(); save()
  }
  const t = performance.now(), dt = (t - lastTick) / 1000; lastTick = t
  const got = produce(dt / 3600)
  floatAcc += dt
  if (floatAcc > 6) {
    floatAcc = 0
    for (const b of W.b) {
      if (b.building || !DEFS[b.type].prod) continue
      const [k, v] = Object.entries(DEFS[b.type].prod)[0]
      if (W.res[k] < cap()) { const p = iso(b.x, b.y); floatText(p.x, p.y, `+${Math.max(1, Math.round(v * b.lvl * nearBonus(b) / 600))}`, '#ffe08a') }
    }
  }
  warTick(dt)
  saveAcc += dt; if (saveAcc > 5) { saveAcc = 0; save(); renderHud() }
  void got
  // Shinobu
  const house = W.b.find((b) => b.type === 'house' && !b.building)
  const sleepy = isNight() || PETS.sleeping
  if (sleepy && house && !pet.inside) { pet.tx = house.x + 0.5; pet.ty = house.y + 1.2; if (Math.hypot(pet.tx - pet.x, pet.ty - pet.y) < 0.15) { pet.inside = true; sayLine('night') } }
  if (!sleepy && pet.inside) { pet.inside = false; pet.x = house ? house.x + 0.5 : pet.x; pet.y = house ? house.y + 1.3 : pet.y; sayLine('morning') }
  if (!pet.inside) {
    const dx = pet.tx - pet.x, dy = pet.ty - pet.y, d = Math.hypot(dx, dy)
    if (d > 0.05) { const sp = Math.min(d, dt * 1.3); pet.x += dx / d * sp; pet.y += dy / d * sp; pet.dir = dx - dy >= 0 ? 1 : -1 }
    else if ((pet.wait -= dt) <= 0) {
      pet.wait = 3 + Math.random() * 6
      const spots = W.b.filter((b) => !b.building)
      if (spots.length && Math.random() < 0.6) { const b = pick(spots); pet.tx = b.x + 1.3; pet.ty = b.y + 1.3 }
      else { let tries = 0; do { pet.tx = 4 + Math.random() * 14; pet.ty = 4 + Math.random() * 14; tries++ } while (tile(Math.floor(pet.tx), Math.floor(pet.ty))?.k === 'water' && tries < 10) }
      pet.tx = clamp(pet.tx, 0.5, N - 0.5); pet.ty = clamp(pet.ty, 0.5, N - 0.5)
    }
    idleAcc += dt
    if (idleAcc > 55) { idleAcc = 0; const full = RK.some((k) => W.res[k] >= cap()); if (full && castleLvl() < 5) sayLine('full'); else if (Math.random() < 0.5) sayLine('idle') }
  }
}
setInterval(tick, 250)

// ---------- Boshqaruv: surish, kattalashtirish, bosish ----------
const pts = new Map(); let dragged = false, pinch = 0, start = null
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragged = false; start = { x: e.clientX, y: e.clientY } })
cv.addEventListener('pointermove', (e) => {
  if (mode === 'place' && pts.size === 0) { const g = screenToGrid(e.clientX, e.clientY); const s = DEFS[ghost.type].size; ghost.x = g.x - (s > 1 ? 1 : 0); ghost.y = g.y - (s > 1 ? 1 : 0) }
  const p = pts.get(e.pointerId); if (!p) return
  if (pts.size === 2) {
    const [a, b] = [...pts.values()]; const d0 = Math.hypot(a.x - b.x, a.y - b.y)
    p.x = e.clientX; p.y = e.clientY
    const [a2, b2] = [...pts.values()]; const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y)
    if (d0 > 0) cam.z = clamp(cam.z * d1 / d0, 0.45, 2.4); dragged = true; return
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y
  if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) { dragged = true; cv.classList.add('drag') }
  if (dragged) { cam.x += dx / cam.z; cam.y += dy / cam.z }
  p.x = e.clientX; p.y = e.clientY
  if (mode === 'place') { const g = screenToGrid(e.clientX, e.clientY); const s = DEFS[ghost.type].size; ghost.x = g.x - (s > 1 ? 1 : 0); ghost.y = g.y - (s > 1 ? 1 : 0) }
})
cv.addEventListener('pointerup', (e) => {
  pts.delete(e.pointerId); cv.classList.remove('drag')
  if (dragged) { W.cam = cam; W.camSet = true; return }
  const g = screenToGrid(e.clientX, e.clientY)
  if (mode === 'place') { const s = DEFS[ghost.type].size; return place(g.x - (s > 1 ? 1 : 0), g.y - (s > 1 ? 1 : 0)) }
  if (hitMonster(e.clientX, e.clientY)) return
  // Shinobu'ni bosish
  const pp = toScreen(iso(pet.x - 0.5, pet.y - 0.5).x, iso(pet.x - 0.5, pet.y - 0.5).y)
  if (!pet.inside && Math.hypot(e.clientX - pp.x, e.clientY - (pp.y - 25 * cam.z)) < 22 * cam.z) return say(pick(["Hi-hi, nima bo'ldi?", "Meni chaqirdingizmi?", "Qurilish zo'r ketyapti!", "Menga ham donut olib keling!"]))
  const b = buildingAt(g.x, g.y)
  if (b && !b.building && b.type === 'barracks') return openArmy()
  if (b && !b.building && b.type === 'guild') return openGuild()
  if (b) return openInfo(b)
  const t = tile(g.x, g.y)
  if (t?.k === 'tree') { t.k = 'grass'; W.stats.cut++; W.res.wood = Math.min(cap(), W.res.wood + 6); const p = iso(g.x, g.y); floatText(p.x, p.y, '+6', '#e7b98a'); save(); renderHud(); if (Math.random() < 0.25) sayLine('tree'); return }
  if (t?.k === 'rock') { t.k = 'grass'; W.stats.cut++; W.res.stone = Math.min(cap(), W.res.stone + 5); if (Math.random() < 0.2) W.res.gold = Math.min(cap(), W.res.gold + 2); const p = iso(g.x, g.y); floatText(p.x, p.y, '+5', '#c9ced6'); save(); renderHud(); return }
  closePanel()
})
cv.addEventListener('pointercancel', (e) => pts.delete(e.pointerId))
cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.z = clamp(cam.z * (e.deltaY < 0 ? 1.1 : 0.9), 0.45, 2.4); W.cam = cam }, { passive: false })
addEventListener('keydown', (e) => { if (e.key === 'Escape') { endPlace(); closePanel() } })

$('buildBtn').onclick = openBuild
$('armyBtn').onclick = openArmy
$('guildBtn').onclick = openGuild
$('feedBtn').onclick = () => {
  if (W.res.food < 10) return sayLine('noFood')
  W.res.food -= 10
  const pp = store.get('pet', {}); pp.hunger = Math.max(0, (pp.hunger ?? 30) - 25); pp.mood = Math.min(100, (pp.mood ?? 60) + 5); store.set('pet', pp)
  save(); renderHud(); sayLine('fed')
}
const voiceIcon = () => { $('voiceBtn').style.opacity = W.voice ? 1 : 0.45; $('voiceBtn').title = W.voice ? 'Ovoz yoqilgan' : "Ovoz o'chiq" }
$('voiceBtn').onclick = () => { W.voice = !W.voice; save(); voiceIcon(); if (!W.voice) audio?.pause() }
voiceIcon()

// ================= 3.2 QO'SHIN VA MAXLUQLAR HUJUMI =================
const UNITS = {
  soldier: { name: 'Askar', desc: "Qilichli askar. Arzon va ishonchli.", cost: { food: 12, gold: 6 }, time: 20, atk: 3, hp: 12, need: 1, color: '#4f7fe0' },
  archer: { name: 'Kamonchi', desc: 'Uzoqdan otadi, maxluq yetib kelguncha ham zarar beradi.', cost: { wood: 10, food: 8, gold: 10 }, time: 30, atk: 4, hp: 7, need: 2, color: '#4fae5b' },
  knight: { name: 'Ritsar', desc: "Og'ir zirhli, eng kuchli jangchi.", cost: { stone: 10, food: 20, gold: 28 }, time: 60, atk: 9, hp: 30, need: 3, color: '#d9b13b' },
}
const UK = Object.keys(UNITS)
const MON = {
  bat: { name: "Ko'rshapalak", hp: 5, atk: 2, speed: 1.3, loot: 2, pts: 1 },
  wolf: { name: "Bo'ri", hp: 11, atk: 3, speed: 1.1, loot: 3, pts: 2 },
  goblin: { name: 'Goblin', hp: 16, atk: 4, speed: 0.9, loot: 5, pts: 4 },
  troll: { name: 'Trol', hp: 70, atk: 12, speed: 0.55, loot: 22, pts: 14 },
}
W.army ??= { soldier: 0, archer: 0, knight: 0 }
W.train ??= []
W.stats ??= {}
W.stats = Object.assign({ kills: 0, wins: 0, losses: 0, trained: 0, cut: 0, made: { wood: 0, stone: 0, gold: 0, food: 0 } }, W.stats)
W.raidN ??= 0
W.quests ??= []
W.qdone ??= 0
W.lvl ??= 1

const bLvl = (type) => Math.max(0, ...W.b.filter((b) => b.type === type && !b.building).map((b) => b.lvl))
const armyCap = () => (bLvl('barracks') ? 5 + bLvl('barracks') * 5 + castleLvl() * 2 : 0)
const armyCount = () => UK.reduce((s, u) => s + W.army[u], 0) + W.train.length
const towerPower = () => W.b.filter((b) => b.type === 'tower' && !b.building).reduce((s, b) => s + b.lvl * 6, 0)
const wallHp = () => W.b.filter((b) => b.type === 'wall' && !b.building).reduce((s, b) => s + b.lvl * 15, 0)
const armyPower = (a = W.army) => UK.reduce((s, u) => s + a[u] * UNITS[u].atk, 0)
const raidsOn = () => castleLvl() >= 1
const playerLevel = () => 1 + Math.floor(Math.sqrt(W.xp / 40))
function scheduleRaid(from = Date.now()) { W.nextRaid = from + (18 + Math.random() * 22) * 60000 }   // 18–40 daqiqada bir
if (raidsOn() && !W.nextRaid) scheduleRaid()

function makeWave(n) {
  let p = 5 + n * 3 + playerLevel() * 2
  const list = []
  while (p > 0) {
    const r = Math.random()
    const t = n >= 6 && r < 0.12 && p >= 14 ? 'troll' : n >= 2 && r < 0.4 && p >= 4 ? 'goblin' : r < 0.72 && p >= 2 ? 'wolf' : 'bat'
    list.push(t); p -= MON[t].pts
  }
  return list
}
// Jangni hisoblash: himoyachilar va maxluqlar navbatma-navbat uradi
function resolveBattle(mons) {
  mons = mons.map((m) => ({ ...m }))
  let wall = wallHp()
  const army = { ...W.army }, lost = { soldier: 0, archer: 0, knight: 0 }
  const total = mons.length
  for (let round = 0; round < 14 && mons.length; round++) {
    let dmg = towerPower() + armyPower(army) + 2
    while (dmg > 0 && mons.length) { const m = mons[0], d = Math.min(dmg, m.hp); m.hp -= d; dmg -= d; if (m.hp <= 0) mons.shift() }
    let md = mons.reduce((s, m) => s + MON[m.type].atk, 0)
    const w = Math.min(wall, md); wall -= w; md -= w
    for (const u of ['knight', 'soldier', 'archer']) while (md >= UNITS[u].hp * 0.6 && army[u] > 0) { army[u]--; lost[u]++; md -= UNITS[u].hp }
  }
  return { win: mons.length === 0, killed: total - mons.length, lost, army, left: mons.length, total }
}
function applyBattle(res, mons) {
  W.army = res.army; W.stats.kills += res.killed
  const loot = {}, stolen = {}
  if (res.win) {
    W.stats.wins++
    loot.gold = mons.reduce((s, m) => s + MON[m.type].loot, 0); W.res.gold = Math.min(cap(), W.res.gold + loot.gold)
    W.xp += 15 + mons.length * 2
  } else {
    W.stats.losses++
    for (const k of RK) { const s = Math.floor(W.res[k] * Math.min(0.3, 0.05 * res.left)); W.res[k] -= s; if (s) stolen[k] = s }
    W.xp += 5
  }
  W.raidN++; scheduleRaid(); save(); renderHud()
  return { loot, stolen }
}
function battleModal(res, extra, live) {
  const m = document.createElement('div'); m.className = 'modal'
  const lost = UK.filter((u) => res.lost[u]).map((u) => `${UNITS[u].name}: ${res.lost[u]}`).join(', ')
  m.innerHTML = `<div class="box"><h2>${res.win ? "G'alaba!" : "Mag'lubiyat…"}</h2>
    <p>${res.win ? `${res.total} ta maxluq yengildi${live ? ' — yordamingiz uchun rahmat!' : '.'}` : `Maxluqlarning ${res.left} tasi qasrga yetib keldi va omborni talon-taroj qildi.`}</p>
    ${lost ? `<p>Yo'qotishlar — ${lost}</p>` : ''}
    <div class="gain">${Object.entries(res.win ? extra.loot : extra.stolen).map(([k, v]) => `<span>${RES[k].svg}${res.win ? '+' : '−'}${v}</span>`).join('')}</div>
    <button class="btn pri">Yaxshi</button></div>`
  m.querySelector('button').onclick = () => m.remove()
  document.body.appendChild(m)
  say(res.win ? pick(["Ura! Yutdik! Siz qahramonsiz!", "Maxluqlar qochib ketdi! Rahmat!", "Qo'rqib ketdim… lekin biz yutdik!"]) : pick(["Voy… ular omborimizni talashdi…", "Ko'proq askar va minora kerak ekan…", "Keyingi safar albatta yutamiz!"]))
}

// --- Jonli hujum (sahifa ochiq bo'lsa ko'rinadi, siz maxluqlarni bosib yordam berasiz) ---
let raid = null
const arrows = []
function castlePos() { const c = W.b.find((b) => b.type === 'castle' && !b.building); return c ? { x: c.x + 1, y: c.y + 1 } : { x: 11, y: 11 } }
function startRaid() {
  const types = makeWave(W.raidN)
  const cp = castlePos()
  raid = { t0: performance.now(), mons: types.map((type, i) => {
    const edge = Math.random()
    const sx = edge < 0.5 ? Math.random() * 6 : -1, sy = edge < 0.5 ? -1 : Math.random() * 6
    return { type, hp: MON[type].hp, max: MON[type].hp, x: sx - i * 0.35, y: sy - i * 0.25, tx: cp.x + (Math.random() - 0.5) * 1.6, ty: cp.y + (Math.random() - 0.5) * 1.6, arrived: false, hit: 0 }
  }), towerT: 0, done: false }
  const kinds = [...new Set(types)].map((t) => MON[t].name.toLowerCase())
  // Shinobu har doim emas, ba'zan baqiradi
  if (Math.random() < 0.7) say(pick([`Hujum! O'rmondan ${kinds.join(', ')} kelyapti! Qutqaring!`, `Yordam bering! ${kinds[0]} hujum qilyapti!`, 'Voy, maxluqlar! Ularni bosing, urib tushiring!']), 6000)
  toast("Maxluqlar hujum qilyapti! Ularni bosib urib tushiring")
}
function raidTick(dt) {
  if (!raid || raid.done) return
  const cp = castlePos()
  for (const m of raid.mons) {
    if (m.hp <= 0 || m.arrived) continue
    const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy)
    if (d < 0.15) { m.arrived = true; continue }
    const sp = MON[m.type].speed * 0.55 * dt
    m.x += dx / d * Math.min(d, sp); m.y += dy / d * Math.min(d, sp)
  }
  const alive = raid.mons.filter((m) => m.hp > 0)
  // minoralar otadi
  raid.towerT -= dt
  if (raid.towerT <= 0) {
    raid.towerT = 1.1
    for (const t of W.b.filter((b) => b.type === 'tower' && !b.building)) {
      const tg = alive.filter((m) => Math.hypot(m.x - t.x, m.y - t.y) < 5).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0]
      if (tg) { tg.hp -= t.lvl * 3; tg.hit = performance.now(); arrows.push({ x0: t.x, y0: t.y, x1: tg.x, y1: tg.y, t: performance.now(), c: '#ffe08a' }) }
    }
    // kamonchilar uzoqdan, askarlar yaqinda
    const near = alive.filter((m) => Math.hypot(m.x - cp.x, m.y - cp.y) < 5)
    if (W.army.archer && alive.length) { const tg = alive.sort((a, b) => Math.hypot(a.x - cp.x, a.y - cp.y) - Math.hypot(b.x - cp.x, b.y - cp.y))[0]; if (Math.hypot(tg.x - cp.x, tg.y - cp.y) < 7) { tg.hp -= W.army.archer * 1.2; tg.hit = performance.now(); arrows.push({ x0: cp.x, y0: cp.y, x1: tg.x, y1: tg.y, t: performance.now(), c: '#9dffc6' }) } }
    if (near.length) { const melee = W.army.soldier * 0.9 + W.army.knight * 2.5; near[0].hp -= melee; if (melee) near[0].hit = performance.now() }
  }
  for (const m of raid.mons) if (m.hp <= 0 && !m.dead) { m.dead = true; W.stats.kills++; const p = iso(m.x, m.y); floatText(p.x, p.y, `+${MON[m.type].loot}`, '#ffe08a'); W.res.gold = Math.min(cap(), W.res.gold + MON[m.type].loot) }
  const left = raid.mons.filter((m) => m.hp > 0)
  const over = !left.length || left.every((m) => m.arrived) || performance.now() - raid.t0 > 60000
  if (over) {
    raid.done = true
    const res = resolveBattle(left.map((m) => ({ type: m.type, hp: m.hp })))
    res.total = raid.mons.length; res.killed += raid.mons.length - left.length
    W.stats.kills -= raid.mons.length - left.length   // jonli o'ldirilganlar allaqachon sanalgan
    const extra = applyBattle(res, raid.mons)
    setTimeout(() => { battleModal(res, extra, true); raid = null }, 600)
  }
}
function hitMonster(sx, sy) {
  if (!raid || raid.done) return false
  for (const m of raid.mons) {
    if (m.hp <= 0) continue
    const p = iso(m.x - 0.5, m.y - 0.5), c = toScreen(p.x, p.y)
    if (Math.hypot(sx - c.x, sy - (c.y - 10 * cam.z)) < 20 * cam.z) { m.hp -= 3 + playerLevel(); m.hit = performance.now(); floatText(p.x, p.y, `-${3 + playerLevel()}`, '#ff7a6b'); return true }
  }
  return false
}
function drawMonster(m, time) {
  if (m.hp <= 0) return
  const p = iso(m.x - 0.5, m.y - 0.5), c = toScreen(p.x, p.y), z = cam.z
  const flash = performance.now() - m.hit < 120
  const bob = Math.abs(Math.sin(time / 120 + m.x * 3)) * 2 * z
  shadow(c.x, c.y + 1 * z, (m.type === 'troll' ? 13 : 8) * z, 3.5 * z)
  if (m.type === 'bat') {
    const f = Math.sin(time / 60) * 6 * z, y = c.y - 22 * z - bob * 2
    poly([[c.x, y], [c.x - 14 * z, y - 4 * z + f], [c.x - 6 * z, y + 4 * z]], flash ? '#fff' : '#3a2c55'); poly([[c.x, y], [c.x + 14 * z, y - 4 * z + f], [c.x + 6 * z, y + 4 * z]], flash ? '#fff' : '#3a2c55')
    ctx.fillStyle = flash ? '#fff' : '#4b3a6b'; ctx.beginPath(); ctx.arc(c.x, y, 5 * z, 0, 7); ctx.fill()
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(c.x - 3 * z, y - 1.5 * z, 1.6 * z, 1.6 * z); ctx.fillRect(c.x + 1.4 * z, y - 1.5 * z, 1.6 * z, 1.6 * z)
  } else if (m.type === 'wolf') {
    ctx.fillStyle = flash ? '#fff' : '#7d7f88'; ctx.beginPath(); ctx.ellipse(c.x, c.y - 8 * z - bob, 10 * z, 5.5 * z, 0, 0, 7); ctx.fill()
    ctx.beginPath(); ctx.arc(c.x + 9 * z, c.y - 12 * z - bob, 4.5 * z, 0, 7); ctx.fill()
    poly([[c.x + 7 * z, c.y - 15 * z - bob], [c.x + 9 * z, c.y - 21 * z - bob], [c.x + 11 * z, c.y - 15 * z - bob]], flash ? '#fff' : '#62646d')
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(c.x + 10 * z, c.y - 13 * z - bob, 1.6 * z, 1.6 * z)
    ctx.strokeStyle = '#5a5c64'; ctx.lineWidth = 2 * z; ctx.beginPath(); for (const dx of [-6, -2, 3, 7]) { ctx.moveTo(c.x + dx * z, c.y - 5 * z - bob); ctx.lineTo(c.x + dx * z, c.y) } ctx.stroke()
  } else {
    const big = m.type === 'troll' ? 1.9 : 1, col = m.type === 'troll' ? '#6b8a7a' : '#5e9a3a'
    ctx.fillStyle = flash ? '#fff' : col
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 11 * z * big - bob, 6 * z * big, 8 * z * big, 0, 0, 7); ctx.fill()
    ctx.beginPath(); ctx.arc(c.x, c.y - 23 * z * big - bob, 5 * z * big, 0, 7); ctx.fill()
    poly([[c.x - 4 * z * big, c.y - 25 * z * big - bob], [c.x - 10 * z * big, c.y - 28 * z * big - bob], [c.x - 3 * z * big, c.y - 21 * z * big - bob]], flash ? '#fff' : col)
    poly([[c.x + 4 * z * big, c.y - 25 * z * big - bob], [c.x + 10 * z * big, c.y - 28 * z * big - bob], [c.x + 3 * z * big, c.y - 21 * z * big - bob]], flash ? '#fff' : col)
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(c.x - 2.5 * z * big, c.y - 24 * z * big - bob, 1.8 * z, 1.8 * z); ctx.fillRect(c.x + 1 * z * big, c.y - 24 * z * big - bob, 1.8 * z, 1.8 * z)
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 2 * z * big; ctx.beginPath(); ctx.moveTo(c.x + 6 * z * big, c.y - 12 * z * big - bob); ctx.lineTo(c.x + 11 * z * big, c.y - 24 * z * big - bob); ctx.stroke()
  }
  // jon chizig'i
  const w = 20 * z, k = Math.max(0, m.hp / m.max)
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(c.x - w / 2, c.y - (m.type === 'troll' ? 62 : 36) * z, w, 3.5 * z)
  ctx.fillStyle = k > 0.5 ? '#4fd18b' : k > 0.25 ? '#f4b544' : '#ff7a6b'; ctx.fillRect(c.x - w / 2, c.y - (m.type === 'troll' ? 62 : 36) * z, w * k, 3.5 * z)
}
// Qasr oldida turgan qo'shin
function drawArmy(time) {
  const cp = castlePos(), list = []
  for (const u of UK) for (let i = 0; i < Math.min(W.army[u], 8); i++) list.push(u)
  const fight = raid && !raid.done
  return list.map((u, i) => {
    const row = Math.floor(i / 4), col = i % 4
    const gx = cp.x + 1.3 + row * 0.45, gy = cp.y - 0.8 + col * 0.5
    return { d: gx + gy, f: () => {
      const p = iso(gx - 0.5, gy - 0.5), c = toScreen(p.x, p.y), z = cam.z
      const j = fight ? Math.abs(Math.sin(time / 90 + i)) * 2 * z : 0
      shadow(c.x, c.y, 5 * z, 2 * z)
      ctx.fillStyle = UNITS[u].color; ctx.fillRect(c.x - 3 * z, c.y - 12 * z - j, 6 * z, 9 * z)
      ctx.fillStyle = '#f6d7c3'; ctx.beginPath(); ctx.arc(c.x, c.y - 15 * z - j, 3 * z, 0, 7); ctx.fill()
      ctx.fillStyle = u === 'knight' ? '#c9ced6' : '#555'; ctx.fillRect(c.x - 3.2 * z, c.y - 18.5 * z - j, 6.4 * z, 2.4 * z)
      ctx.strokeStyle = u === 'archer' ? '#8a5a3c' : '#d9dde4'; ctx.lineWidth = 1.4 * z; ctx.beginPath()
      if (u === 'archer') ctx.arc(c.x + 4 * z, c.y - 10 * z - j, 4 * z, -1.2, 1.2); else { ctx.moveTo(c.x + 4 * z, c.y - 6 * z - j); ctx.lineTo(c.x + 4 * z, c.y - 17 * z - j) }
      ctx.stroke()
    } }
  })
}
function warItems(items, time) {
  items.push(...drawArmy(time))
  if (raid) for (const m of raid.mons) items.push({ d: m.x + m.y - 0.5, f: () => drawMonster(m, time) })
}
function drawArrows() {
  const now = performance.now()
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i], k = (now - a.t) / 260
    if (k > 1) { arrows.splice(i, 1); continue }
    const p0 = iso(a.x0 - 0.5, a.y0 - 0.5), p1 = iso(a.x1 - 0.5, a.y1 - 0.5)
    const s0 = toScreen(p0.x, p0.y - 30), s1 = toScreen(p1.x, p1.y - 12)
    const x = s0.x + (s1.x - s0.x) * k, y = s0.y + (s1.y - s0.y) * k - Math.sin(k * Math.PI) * 20 * cam.z
    ctx.strokeStyle = a.c; ctx.lineWidth = 2 * cam.z; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (s1.x - s0.x) * 0.06, y - (s1.y - s0.y) * 0.06); ctx.stroke()
  }
  if (raid && !raid.done) { ctx.fillStyle = 'rgba(120,0,0,.12)'; ctx.fillRect(0, 0, VW, VH) }
}

// --- Askar tayyorlash ---
function trainSpeed() { return 1 + (bLvl('barracks') - 1) * 0.15 }
function enqueue(u) {
  const d = UNITS[u]
  if (bLvl('barracks') < d.need) return toast(`Kazarma ${d.need}-darajada bo'lishi kerak`)
  if (armyCount() >= armyCap()) return toast("Qo'shin uchun joy yo'q — Kazarma yoki Qasrni ko'taring")
  if (!canPay(d.cost)) return toast('Resurs yetmaydi')
  pay(d.cost)
  const last = W.train.length ? W.train[W.train.length - 1].done : Date.now()
  W.train.push({ u, done: Math.max(Date.now(), last) + d.time / trainSpeed() * 1000 })
  save(); renderHud()
}
function trainTick() {
  let ch = false
  while (W.train.length && W.train[0].done <= Date.now()) { const t = W.train.shift(); W.army[t.u]++; W.stats.trained++; W.xp += 2; ch = true }
  if (ch) { save(); renderHud(); if (panel?.dataset.kind === 'army') openArmy() }
}
function openArmy() {
  const b = W.b.find((x) => x.type === 'barracks')
  closePanel(); endPlace()
  panel = document.createElement('div'); panel.className = 'panel info'; panel.dataset.kind = 'army'
  const mins = W.nextRaid ? Math.max(0, Math.round((W.nextRaid - Date.now()) / 60000)) : null
  panel.innerHTML = `<h3>Qo'shin <span class="tag">${armyCount()}/${armyCap()}</span><button class="x" data-x>✕</button></h3>
    <p>Hujum kuchi: <b>${armyPower() + towerPower()}</b> (qo'shin ${armyPower()} + minoralar ${towerPower()}) · Devorlar: <b>${wallHp()}</b> jon</p>
    <p>${raidsOn() ? (raid && !raid.done ? '<b style="color:var(--bad)">Hozir hujum ketyapti!</b>' : `Keyingi hujum taxminan ${mins < 1 ? 'hozir' : mins + ' daqiqadan keyin'}.`) : "Hujumlar Qasr qurilgandan keyin boshlanadi."}</p>
    <div class="grid">${UK.map((u) => { const d = UNITS[u], lock = bLvl('barracks') < d.need; return `<button class="card" data-u="${u}" ${lock ? 'disabled' : ''}>
      <i class="unit" style="--c:${d.color}"></i><b>${d.name} <span class="tag">${W.army[u]}</span></b><small>${lock ? `Kazarma ${d.need}-daraja kerak` : `${d.desc} Kuch ${d.atk}, jon ${d.hp}.`}</small>${costHtml(d.cost)}</button>` }).join('')}</div>
    ${W.train.length ? `<p style="margin-top:10px">Tayyorlanmoqda: ${W.train.map((t) => UNITS[t.u].name).join(', ')} — birinchisi ${Math.max(0, Math.ceil((W.train[0].done - Date.now()) / 1000))} soniyada.</p>` : ''}
    <div class="row">${b ? '<button class="btn" data-info>Kazarma haqida / ko\'tarish</button>' : ''}</div>`
  panel.querySelector('[data-x]').onclick = closePanel
  panel.querySelector('[data-info]')?.addEventListener('click', () => openInfo(b))
  panel.querySelectorAll('[data-u]').forEach((el) => el.onclick = () => { enqueue(el.dataset.u); openArmy() })
  document.body.appendChild(panel)
}

// --- Siz yo'qligingizda bo'lgan hujumlar ---
function offlineRaids() {
  const reports = []
  let guard = 0
  while (raidsOn() && W.nextRaid && W.nextRaid < Date.now() - 4 * 60000 && guard++ < 3) {
    const mons = makeWave(W.raidN).map((type) => ({ type, hp: MON[type].hp }))
    const res = resolveBattle(mons)
    const at = W.nextRaid
    const extra = applyBattle(res, mons)
    W.nextRaid = Math.max(W.nextRaid, at + 20 * 60000)
    reports.push({ res, extra })
  }
  if (W.nextRaid && W.nextRaid < Date.now() - 4 * 60000) scheduleRaid()
  return reports
}

// ================= 3.3 GILDIYA: TOPSHIRIQLAR, MUKOFOTLAR, DARAJA =================
const QPOOL = [
  { k: 'build', t: 'farm', n: 2, txt: '2 ta ferma quring' }, { k: 'build', t: 'lumber', n: 2, txt: "2 ta yog'ochxona quring" },
  { k: 'build', t: 'mine', n: 2, txt: '2 ta kon quring' }, { k: 'build', t: 'market', n: 1, txt: 'Bozor quring' },
  { k: 'build', t: 'tower', n: 2, txt: '2 ta minora quring' }, { k: 'build', t: 'wall', n: 6, txt: '6 ta devor quring' },
  { k: 'build', t: 'fountain', n: 1, txt: 'Favvora quring' }, { k: 'build', t: 'tower', n: 4, txt: '4 ta minora quring' },
  { k: 'castle', n: 2, txt: "Qasrni 2-darajaga ko'taring" }, { k: 'castle', n: 3, txt: "Qasrni 3-darajaga ko'taring" },
  { k: 'castle', n: 4, txt: "Qasrni 4-darajaga ko'taring" }, { k: 'castle', n: 5, txt: "Qasrni 5-darajaga ko'taring" },
  { k: 'kills', n: 10, txt: '10 ta maxluqni yenging' }, { k: 'kills', n: 30, txt: '30 ta maxluqni yenging' }, { k: 'kills', n: 80, txt: '80 ta maxluqni yenging' },
  { k: 'wins', n: 1, txt: 'Bitta hujumni qaytaring' }, { k: 'wins', n: 3, txt: '3 ta hujumni qaytaring' }, { k: 'wins', n: 8, txt: '8 ta hujumni qaytaring' },
  { k: 'trained', n: 5, txt: '5 ta jangchi tayyorlang' }, { k: 'trained', n: 15, txt: '15 ta jangchi tayyorlang' },
  { k: 'cut', n: 15, txt: '15 ta daraxt yoki qoyani tozalang' },
  { k: 'made', r: 'wood', n: 500, txt: "500 yog'och to'plang" }, { k: 'made', r: 'stone', n: 400, txt: "400 tosh to'plang" },
  { k: 'made', r: 'gold', n: 300, txt: "300 oltin to'plang" }, { k: 'made', r: 'food', n: 500, txt: "500 ovqat to'plang" },
]
const qkey = (q) => `${q.k}:${q.t || q.r || ''}:${q.n}`
function qstat(q) {
  if (q.k === 'build') return W.b.filter((b) => b.type === q.t && !b.building).length
  if (q.k === 'castle') return castleLvl()
  if (q.k === 'made') return W.stats.made[q.r]
  return W.stats[q.k] || 0
}
const qProgress = (q) => (['build', 'castle'].includes(q.k) ? qstat(q) : qstat(q) - q.base)
function qReward(q) {
  const m = 1 + W.qdone * 0.08
  const r = { xp: Math.round(25 * m) }
  const base = { build: { wood: 60, stone: 40 }, castle: { gold: 120, stone: 100 }, kills: { gold: 60 }, wins: { gold: 80, food: 60 }, trained: { food: 80 }, cut: { wood: 50 }, made: { gold: 50 } }[q.k]
  for (const [k, v] of Object.entries(base)) r[k] = Math.round(v * m * (1 + Math.log10(q.n + 1) * 0.6))
  if (Math.random() < 0.35 || q.k === 'castle') r.gift = true
  return r
}
const questSlots = () => (bLvl('guild') ? Math.min(5, 2 + bLvl('guild')) : 0)
function fillQuests() {
  const used = new Set([...W.quests.map(qkey), ...(W.qhist || [])])
  while (W.quests.length < questSlots()) {
    const opts = QPOOL.filter((q) => !used.has(qkey(q)) && !(q.k === 'castle' && castleLvl() >= q.n) && !(q.k === 'build' && qstat(q) >= q.n))
    if (!opts.length) { W.qhist = []; if (!QPOOL.some((q) => !used.has(qkey(q)))) break; continue }
    const q = { ...pick(opts) }; q.base = qstat(q); q.reward = qReward(q)
    W.quests.push(q); used.add(qkey(q))
  }
}
function claim(i) {
  const q = W.quests[i]; if (!q || qProgress(q) < q.n) return
  const r = q.reward
  for (const k of RK) if (r[k]) W.res[k] = Math.min(cap(), W.res[k] + r[k])
  W.xp += r.xp; W.qdone++
  if (r.gift) {
    const pp = store.get('pet', {}); pp.affection = Math.min(100, (pp.affection ?? 40) + 10); pp.mood = Math.min(100, (pp.mood ?? 60) + 15)
    pp.gifts = [...(pp.gifts || []), 'Gildiya sovg\'asi'].slice(-10); store.set('pet', pp)
    say(pick(["Gildiyadan menga sovg'a?! Voy, rahmat!", "Hi-hi, sovg'a! Siz eng zo'risiz!"]))
  } else say(pick(['Topshiriq bajarildi! Barakalla!', "Zo'r! Gildiya sizdan mamnun.", 'Yana bittasi bitdi!']))
  W.qhist = [...(W.qhist || []), qkey(q)].slice(-12)
  W.quests.splice(i, 1); fillQuests(); save(); renderHud(); openGuild()
}
function openGuild() {
  const b = W.b.find((x) => x.type === 'guild')
  closePanel(); endPlace(); fillQuests()
  panel = document.createElement('div'); panel.className = 'panel info'; panel.dataset.kind = 'guild'
  panel.innerHTML = `<h3>Gildiya <span class="tag">${W.qdone} ta bajarilgan</span><button class="x" data-x>✕</button></h3>
    <p>Topshiriqlarni bajaring — resurs, tajriba va Shinobu uchun sovg'alar oling. Gildiya darajasi oshsa, topshiriqlar ko'payadi.</p>
    <div class="quests">${W.quests.map((q, i) => { const p = clamp(qProgress(q), 0, q.n), ok = p >= q.n; return `<div class="quest ${ok ? 'ok' : ''}">
      <div><b>${q.txt}</b><div class="qbar"><i style="width:${p / q.n * 100}%"></i></div><small>${Math.floor(p)} / ${q.n}</small></div>
      <div class="qr">${RK.filter((k) => q.reward[k]).map((k) => `<span>${RES[k].svg}${q.reward[k]}</span>`).join('')}<span>✦${q.reward.xp}</span>${q.reward.gift ? '<span title="Shinobu uchun sovg\'a">🎁</span>' : ''}</div>
      <button class="btn ${ok ? 'pri' : ''}" data-c="${i}" ${ok ? '' : 'disabled'}>Olish</button></div>` }).join('')}</div>
    <div class="row">${b ? '<button class="btn" data-info>Gildiya haqida / ko\'tarish</button>' : ''}</div>`
  panel.querySelector('[data-x]').onclick = closePanel
  panel.querySelector('[data-info]')?.addEventListener('click', () => openInfo(b))
  panel.querySelectorAll('[data-c]').forEach((el) => el.onclick = () => claim(+el.dataset.c))
  document.body.appendChild(panel)
}
const readyQuests = () => W.quests.filter((q) => qProgress(q) >= q.n).length

// --- Daraja ---
let shownLvl = W.lvl
function levelCheck() {
  const l = playerLevel()
  if (l > shownLvl) {
    shownLvl = l; W.lvl = l; save()
    const m = document.createElement('div'); m.className = 'modal'
    m.innerHTML = `<div class="box"><h2>${l}-daraja!</h2><p>Olamingiz o'sib bormoqda. Maxluqlar ham kuchliroq bo'ladi — himoyani unutmang.</p><button class="btn pri">Zo'r!</button></div>`
    m.querySelector('button').onclick = () => m.remove(); document.body.appendChild(m)
    say(pick(['Voy, yangi daraja! Biz kuchayib boryapmiz!', 'Ura! Daraja oshdi!']))
  }
}
function warTick(dt) {
  trainTick()
  if (raidsOn() && !W.nextRaid) scheduleRaid()
  if (raidsOn() && !raid && W.nextRaid && Date.now() >= W.nextRaid && !document.hidden) startRaid()
  raidTick(dt)
  levelCheck()
}

// ---------- Ochilish: siz yo'qligingizda nima bo'ldi ----------
function welcome() {
  // kamera: qasr yoki uy markazda bo'lsin
  const home = W.b.find((b) => b.type === 'castle') || W.b.find((b) => b.type === 'house')
  if (home && !W.camSet) { const p = iso(home.x + 0.5, home.y + 0.5); cam.x = -p.x; cam.y = -p.y + 40 }
  const away = (Date.now() - W.last) / 3600000
  // tugagan qurilishlar
  for (const b of W.b) if (b.building && Date.now() >= b.done) { b.building = false; if (b.upTo) { b.lvl = b.upTo; delete b.upTo } }
  const got = produce(Math.min(12, away))
  const reports = offlineRaids()
  save(); renderHud()
  if (reports.length) {
    const wins = reports.filter((r) => r.res.win).length
    const stolen = {}; const loot = {}
    for (const r of reports) { for (const [k, v] of Object.entries(r.extra.stolen)) stolen[k] = (stolen[k] || 0) + v; for (const [k, v] of Object.entries(r.extra.loot)) loot[k] = (loot[k] || 0) + v }
    setTimeout(() => {
      const m = document.createElement('div'); m.className = 'modal'
      m.innerHTML = `<div class="box"><h2>Siz yo'qligingizda ${reports.length} marta hujum bo'ldi</h2><p>${wins} tasi qaytarildi, ${reports.length - wins} tasida maxluqlar omborni talashdi.</p>
        <div class="gain">${Object.entries(loot).map(([k, v]) => `<span>${RES[k].svg}+${v}</span>`).join('')}${Object.entries(stolen).map(([k, v]) => `<span style="color:var(--bad)">${RES[k].svg}−${v}</span>`).join('')}</div>
        <button class="btn pri">Tushunarli</button></div>`
      m.querySelector('button').onclick = () => m.remove(); document.body.appendChild(m)
    }, 300)
  }
  const sum = Object.entries(got).filter(([, v]) => v >= 1)
  if (!W.met) { W.met = true; save(); setTimeout(() => sayLine('first'), 800); return }
  if (away > 0.05 && sum.length) {
    const m = document.createElement('div'); m.className = 'modal'
    m.innerHTML = `<div class="box"><h2>Qaytib keldingiz!</h2><p>Siz yo'qligingizda (${away < 1 ? Math.round(away * 60) + ' daqiqa' : Math.min(12, Math.round(away)) + ' soat'}) binolaringiz ishladi:</p>
      <div class="gain">${sum.map(([k, v]) => `<span>${RES[k].svg}+${Math.floor(v)}</span>`).join('')}</div><button class="btn pri">Zo'r!</button></div>`
    m.querySelector('button').onclick = () => { m.remove(); say(pick(LINES.morning)) }
    document.body.appendChild(m)
  }
}

welcome()
requestAnimationFrame(frame)
window.__world = { W, cam, pet, iso, toScreen, canPlace, startRaid: () => startRaid(), get raid() { return raid }, openArmy: () => openArmy(), openGuild: () => openGuild() }   // sinov uchun
