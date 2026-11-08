// Qishloq va tabiat: Quaternius "Medieval Village MegaKit" + "Stylized Nature MegaKit" (CC0) bo'laklaridan binolar yig'ish
// O'lchov: to'plam metrda (devor 2 m eni, 3 m bo'yi). Dunyoda 1 katak ≈ 2.4 m, shuning uchun K = 0.41.
import * as THREE from 'three'

export const K = 0.41
const FLOOR = 3.0   // qavat balandligi (m)
const M = 2         // devor moduli eni (m)

export function createVillage(vGltf, nGltf, { shadow = false } = {}, cGltf = null) {
  const P = {}
  // Kenney Castle Kit ranglarini qishloq uslubiga moslaymiz: kulrang-bej tosh, terrakota tom
  const TINT = { wall: '#cbbfa9', wallDark: '#9e9381', roof: '#b4492b', FrontColor: '#d9cfbd' }
  if (cGltf) cGltf.scene.traverse((m) => { if (m.isMesh && !m.material.userData.tinted && TINT[m.material.name]) { m.material.color.set(TINT[m.material.name]); m.material.userData.tinted = true } })
  for (const src of [vGltf, nGltf, cGltf]) {
    if (!src) continue
    for (const o of src.scene.children) {
      o.traverse((m) => {
        if (!m.isMesh) return
        m.castShadow = shadow; m.receiveShadow = shadow
        const mt = m.material; if (mt.map) mt.map.colorSpace = THREE.SRGBColorSpace
        if (mt.alphaTest > 0 || mt.transparent) { mt.alphaTest = Math.max(mt.alphaTest, 0.45); mt.transparent = false; mt.side = THREE.DoubleSide }
      })
      P[o.name] = o
    }
  }
  const has = (n) => !!P[n]
  // bitta bo'lak: x, y, z — metrda; ry — burilish; s/sx/sy/sz — o'lcham
  function part(n, { x = 0, y = 0, z = 0, ry = 0, s = 1, sx, sy, sz } = {}) {
    const src = P[n]; if (!src) return new THREE.Group()
    const o = src.clone(true); o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.set(sx ?? s, sy ?? s, sz ?? s)
    return o
  }

  // To'rtburchak bino: w×d modul, qavat bo'yicha devorlar. pick(side, i, floor) → bo'lak nomi
  // side: 'f' old (+z), 'b' orqa, 'l' chap (−x), 'r' o'ng (+x)
  function walls(g, w, d, floor, pick, corner = 'Corner_Exterior_Wood') {
    const W = w * M, D = d * M, y = floor * FLOOR
    const put = (side, i, x, z, ry) => { const n = pick(side, i, floor); if (n) g.add(part(n, { x, y, z, ry })) }
    for (let i = 0; i < w; i++) { const x = -W / 2 + M / 2 + i * M; put('f', i, x, D / 2, 0); put('b', i, -x, -D / 2, Math.PI) }
    for (let i = 0; i < d; i++) { const z = -D / 2 + M / 2 + i * M; put('l', i, -W / 2, -z, -Math.PI / 2); put('r', i, W / 2, z, Math.PI / 2) }
    if (corner) for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(corner, { x: cx * W / 2, y, z: cz * D / 2 }))
  }
  // ichki qorong'ilik: derazadan qaraganda bino "teshik" ko'rinmasin
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1d1610', roughness: 1 })
  function inner(g, w, d, floors, x = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w * M - 0.5, floors * FLOOR - 0.1, d * M - 0.5), darkMat); m.position.set(x, floors * FLOOR / 2, z); g.add(m) }
  // eshik/deraza devor teshigiga
  function door(g, n, x, z, ry, y = 0, s = 1) { const o = part(n, { x, y, z, ry, s }); g.add(o); return o }
  // tom: 4×4 m tom bo'lagini kerakli o'lchamga cho'zamiz, old/orqa uchburchak (fronton) bilan
  function roof(g, w, d, floors, { gable = 'Roof_Front_Brick4' } = {}) {
    const W = w * M, D = d * M, y = floors * FLOOR
    const sx = W / 4, sz = D / 4, sy = Math.min(1.15, (sx + sz) / 2)
    g.add(part('Roof_RoundTiles_4x4', { y, sx, sy, sz }))
    if (gable) for (const zz of [1, -1]) g.add(part(gable, { y, z: zz * D / 2, ry: zz > 0 ? 0 : Math.PI, sx, sy, sz: 1 }))
  }
  // qasr tishlari (merlon)
  function crenels(g, x0, x1, z, y, ry = 0) {
    for (let x = x0 + 0.5; x <= x1 - 0.4; x += 2) {
      const o = part('Stairs_Exterior_SingleSideThick', { y, sz: 0.5, sy: 0.7 }); o.rotation.y = ry + Math.PI / 2
      const v = new THREE.Vector3(x + 0.5, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); o.position.set(v.x, y, v.z); g.add(o)
    }
  }
  const P0 = 'Wall_Plaster_Straight', PD = 'Wall_Plaster_Door_Round', PW = 'Wall_Plaster_Window_Wide_Round', PT = 'Wall_Plaster_Window_Thin_Round', PG = 'Wall_Plaster_WoodGrid'
  const B0 = 'Wall_UnevenBrick_Straight', BD = 'Wall_UnevenBrick_Door_Round', BT = 'Wall_UnevenBrick_Window_Thin_Round', BW = 'Wall_UnevenBrick_Window_Wide_Round'

  // ---------- Binolar ----------
  const R = {}
  // Shinobu uyi: kichkina uycha (1 katak)
  R.house = (L) => {
    const g = new THREE.Group(), fl = L >= 2 ? 2 : 1
    walls(g, 1, 1, 0, (s) => (s === 'f' ? PD : s === 'b' ? P0 : PT))
    if (fl > 1) walls(g, 1, 1, 1, (s) => (s === 'f' ? PW : s === 'b' ? P0 : PT))
    door(g, 'Door_1_Round', -0.53, 1.02, 0); inner(g, 1, 1, fl)
    roof(g, 1, 1, fl, { gable: 'Roof_Front_Brick2' })
    g.add(part('Prop_Chimney', { x: 0.55, y: fl * FLOOR + 0.2, z: -0.4, s: 0.55 }))
    if (L >= 3) { g.add(part('Prop_Vine1', { x: 0.6, z: 1.05, s: 0.9 })); g.add(part('WindowShutters_Thin_Round_Open', { x: 0, y: 3.9, z: 1.06, s: 0.8 })) }
    g.userData.door = { x: -0.0, z: 1.0 }
    return g
  }
  // Qurbonov uyi: 2×2 modul, ikki qavat (pastda tosh, tepada suvoq)
  R.home = (L) => {
    const g = new THREE.Group()
    walls(g, 2, 2, 0, (s, i) => (s === 'f' ? (i === 0 ? BD : BW) : s === 'b' ? B0 : BT), 'Corner_Exterior_Brick')
    walls(g, 2, 2, 1, (s, i) => (s === 'f' ? PW : s === 'b' ? (i ? P0 : PT) : i ? PW : P0))
    door(g, 'Door_1_Round', -1.53, 2.02, 0); inner(g, 2, 2, 2)
    roof(g, 2, 2, 2)
    g.add(part('Prop_Chimney', { x: 1.1, y: 6.4, z: -0.6, s: 0.9 }))
    if (L >= 2) g.add(part('Balcony_Simple_Straight', { x: 1, y: FLOOR, z: 2.15 }))
    if (L >= 3) { g.add(part('Prop_Vine5', { x: 1.5, y: 0.2, z: 2.1 })); g.add(part('Prop_Crate', { x: 2.5, z: 1.6, s: 0.7 })) }
    g.userData.door = { x: -1, z: 2 }
    return g
  }
  // Aholi uyi (cottage): 4 xil ko'rinish, joylashuviga qarab tanlanadi
  R.cottage = (L, b) => {
    const g = new THREE.Group(), v = b ? Math.abs(b.x * 7 + b.y * 13) % 4 : 0
    if (v === 0) {
      walls(g, 1, 1, 0, (s) => (s === 'f' ? PD : s === 'b' ? P0 : PT)); walls(g, 1, 1, 1, (s) => (s === 'f' ? PW : P0))
      door(g, 'Door_1_Round', -0.53, 1.02, 0); inner(g, 1, 1, 2); roof(g, 1, 1, 2, { gable: 'Roof_Front_Brick2' })
      g.add(part('Prop_Chimney', { x: -0.5, y: 6.2, z: -0.4, s: 0.5 }))
    } else if (v === 1) {
      walls(g, 1, 1, 0, (s) => (s === 'f' ? BD : s === 'b' ? B0 : BT), 'Corner_Exterior_Brick'); walls(g, 1, 1, 1, (s) => (s === 'f' ? PT : P0))
      door(g, 'Door_2_Flat', -0.53, 1.02, 0); inner(g, 1, 1, 2); roof(g, 1, 1, 2, { gable: 'Roof_Front_Brick2' })
      g.add(part('WindowShutters_Thin_Round_Open', { x: 0, y: 3.9, z: 1.06, s: 0.8 }))
    } else if (v === 2) {
      walls(g, 1, 1, 0, (s) => (s === 'f' ? PD : s === 'b' ? PG : PG)); door(g, 'Door_1_Round', -0.53, 1.02, 0); inner(g, 1, 1, 1)
      roof(g, 1, 1, 1, { gable: 'Roof_Front_Brick2' })
      g.add(part('Prop_WoodenFence_Single', { x: 1.4, z: 1.2, ry: Math.PI / 2, s: 0.6 })); g.add(part('Prop_Crate', { x: 1.2, z: -0.6, s: 0.45 }))
    } else {
      walls(g, 1, 1, 0, (s) => (s === 'f' ? PD : s === 'b' ? P0 : PW)); door(g, 'Door_1_Round', -0.53, 1.02, 0); inner(g, 1, 1, 1)
      roof(g, 1, 1, 1, { gable: 'Roof_Front_Brick2' }); g.add(part('Roof_Dormer_RoundTile', { x: 0, y: 3.4, z: 0.45, s: 0.5 }))
      g.add(part('Prop_Vine1', { x: 0.7, z: 1.05, s: 0.8 }))
    }
    return g
  }
  // Gildiya: 2×2, yog'och panjarali, baland, bayroqli
  R.guild = (L) => {
    const g = new THREE.Group(), fl = L >= 3 ? 3 : 2
    walls(g, 2, 2, 0, (s, i) => (s === 'f' ? (i === 0 ? PD : PG) : s === 'b' ? P0 : PW))
    for (let f = 1; f < fl; f++) walls(g, 2, 2, f, (s, i) => (s === 'f' ? PW : s === 'b' ? P0 : i ? PT : PG))
    door(g, 'Door_4_Round', -1.53, 2.02, 0); inner(g, 2, 2, fl)
    roof(g, 2, 2, fl)
    g.add(part('Roof_Dormer_RoundTile', { x: 0, y: fl * FLOOR + 0.4, z: 1.2, s: 0.8 }))
    g.userData.banner = { x: 1, y: 2.4, z: 2.12 }
    return g
  }
  // Kazarma: 2×2 tosh, past, yonida yashiklar
  R.barracks = (L) => {
    const g = new THREE.Group(), fl = L >= 3 ? 2 : 1
    walls(g, 2, 2, 0, (s, i) => (s === 'f' ? (i === 1 ? BD : BT) : s === 'b' ? B0 : BT), 'Corner_Exterior_Brick')
    if (fl > 1) walls(g, 2, 2, 1, (s) => (s === 'f' ? BW : B0), 'Corner_Exterior_Brick')
    door(g, 'Door_2_Flat', 0.47, 2.02, 0); inner(g, 2, 2, fl)
    roof(g, 2, 2, fl)
    g.add(part('Prop_Crate', { x: -1.6, z: 2.6, s: 0.8 })); g.add(part('Prop_Crate', { x: -0.7, z: 2.7, s: 0.6, ry: 0.4 }))
    if (L >= 2) g.add(part('Prop_MetalFence_Ornament', { x: 2.4, z: 2.4, ry: Math.PI / 2, s: 0.7 }))
    return g
  }
  // Minora (kuzatuv): 1×1 tosh minora, darajasiga qarab baland
  R.tower = (L) => {
    const g = new THREE.Group(), fl = Math.min(4, 1 + Math.ceil(L / 2))
    for (let f = 0; f < fl; f++) walls(g, 1, 1, f, (s) => (f === 0 ? (s === 'f' ? BD : B0) : f === fl - 1 ? BW : BT), 'Corner_Exterior_Brick')
    door(g, 'Door_2_Flat', -0.53, 1.02, 0); inner(g, 1, 1, fl)
    g.add(part('Roof_Tower_RoundTiles', { y: fl * FLOOR, s: 0.55 }))
    return g
  }
  // Yog'och tayyorlash: ochiq ayvon + g'o'lalar
  R.lumber = (L) => {
    const g = new THREE.Group()
    g.add(part(PG, { z: -0.9, ry: Math.PI, sy: 0.8 }))
    for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.9], [0.95, 0.9]]) g.add(part('Corner_Exterior_Wood', { x, z, sy: 0.8 }))
    g.add(part('Roof_RoundTiles_4x4', { y: 2.4, sx: 0.55, sy: 0.45, sz: 0.55 }))
    for (let i = 0; i < Math.min(4, L + 1); i++) g.add(part('Roof_Log', { x: -0.5 + (i % 2) * 0.55, y: 0.18 + Math.floor(i / 2) * 0.3, z: 0.1, sx: 0.35, sy: 0.3, sz: 0.17 }))
    g.add(part('Prop_Crate', { x: 0.7, z: 0.75, s: 0.45 }))
    return g
  }
  // Bozor: arava + yashiklar + soyabon
  R.market = (L) => {
    const g = new THREE.Group()
    for (const x of [-0.95, 0.95]) for (const z of [-0.5, 0.6]) g.add(part('Corner_Exterior_Wood', { x, z, sy: 0.75 }))
    g.add(part('Roof_RoundTiles_4x4', { y: 2.2, sx: 0.55, sy: 0.35, sz: 0.38 }))
    g.add(part('Prop_Crate', { x: -0.55, z: 0.1, s: 0.55 })); g.add(part('Prop_Crate', { x: 0.1, z: 0.1, s: 0.55 })); g.add(part('Prop_Crate', { x: 0.65, z: 0.1, s: 0.55 }))
    if (L >= 2) g.add(part('Prop_Wagon', { x: 0.2, z: 1.0, ry: Math.PI / 2, s: 0.4 }))
    if (L >= 3) g.add(part('Prop_Crate', { x: -0.3, y: 0.6, z: 0.1, s: 0.4, ry: 0.5 }))
    return g
  }
  // Qasr: 4×4 katak — 4 minora, 2 qavat tosh devor, tishlar, katta ikki tavaqali darvoza, ichkarida asosiy bino
  R.castle = (L) => {
    const g = new THREE.Group(), WL = L >= 4 ? 3 : 2   // devor qavatlari
    const E = 4   // devor chizig'i markazdan (m)
    // devorlar: har tomonda 3 modul (x = -2, 0, 2), old o'rtasi — darvoza
    for (let f = 0; f < WL; f++) for (const [side, ry] of [['f', 0], ['b', Math.PI], ['l', -Math.PI / 2], ['r', Math.PI / 2]]) {
      for (const i of [-1, 0, 1]) {
        if (side === 'f' && i === 0 && f === 0) continue   // darvoza teshigi
        const v = new THREE.Vector3(i * M, 0, E).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)
        g.add(part(f === WL - 1 && i !== 0 ? BT : B0, { x: v.x, y: f * FLOOR, z: v.z, ry }))
        const vi = new THREE.Vector3(i * M, 0, E - 0.36).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)   // ichki tomoni ham tosh
        g.add(part(B0, { x: vi.x, y: f * FLOOR, z: vi.z, ry: ry + Math.PI }))
      }
    }
    // tishlar devor ustida
    for (const ry of [0, Math.PI, -Math.PI / 2, Math.PI / 2]) crenels(g, -3, 3, E, WL * FLOOR, ry)
    // darvoza ustuni va eshiklar (har tavaqa 1 m × 2.9 m)
    for (const sx of [-1, 1]) g.add(part('Corner_ExteriorWide_Brick', { x: sx * 1.02, z: E, sy: 1 }))
    const doors = []
    for (const sd of [-1, 1]) {
      const h = new THREE.Group(); h.position.set(sd * 0.98, 0, E + 0.05)
      const d = part('Door_2_Flat', { ry: sd > 0 ? Math.PI : 0, sx: 0.92, sy: 1.38 }); h.add(d)
      h.userData.door = sd; g.add(h); doors.push(h)
    }
    // minoralar (burchaklarda, 2×2 m, devordan baland)
    const TF = WL + 1
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tg = new THREE.Group(); tg.position.set(cx * E, 0, cz * E)
      for (let f = 0; f < TF; f++) walls(tg, 1, 1, f, () => (f >= TF - 1 ? BT : B0), 'Corner_Exterior_Brick')
      inner(tg, 1, 1, TF)
      tg.add(part('Roof_Tower_RoundTiles', { y: TF * FLOOR, s: 0.6 }))
      g.add(tg)
    }
    // hovli toshi
    for (const x of [-2, 0, 2]) for (const z of [-2, 0, 2]) g.add(part('Floor_UnevenBrick', { x, z, y: 0.02 }))
    g.add(part('Floor_UnevenBrick', { x: 0, z: E, y: 0.02 }))
    // asosiy bino (keep) — orqada, 2×2 modul, 3 qavat
    const keep = new THREE.Group(); keep.position.set(0, 0, -1.5)
    const KF = L >= 3 ? 3 : 2
    for (let f = 0; f < KF; f++) walls(keep, 2, 1, f, (s, i) => (f === 0 ? (s === 'f' ? (i === 0 ? BD : BW) : B0) : s === 'f' ? BW : BT), 'Corner_Exterior_Brick')
    door(keep, 'Door_1_Round', -1.53, 1.02, 0); inner(keep, 2, 1, KF)
    keep.add(part('Roof_RoundTiles_4x4', { y: KF * FLOOR, sx: 1, sy: 0.9, sz: 0.5 }))
    for (const zz of [1, -1]) keep.add(part('Roof_Front_Brick4', { y: KF * FLOOR, z: zz * 1, ry: zz > 0 ? 0 : Math.PI, sy: 0.9 }))
    g.add(keep)
    g.userData.flagY = KF * FLOOR + 3.4; g.userData.flagZ = -1.5
    g.userData.doors = doors
    return g
  }
  // ---------- Kenney Castle Kit: baland qasr (katak birligida, VK bilan kichraytirilmaydi) ----------
  const CK = !!P.wall && !!P.towerSquareBase
  const WY = 1.6   // devorlarni balandroq qilish (bo'yiga cho'zish)
  // yon tomon bo'yicha joylash: side 'f' (+z), 'b', 'l', 'r'; t — tomon bo'ylab, d — markazdan uzoqlik
  const SIDE = { f: [0, 1, 0], b: [0, -1, Math.PI], l: [-1, 0, -Math.PI / 2], r: [1, 0, Math.PI / 2] }
  const at = (side, t, d) => { const [nx, nz, ry] = SIDE[side]; return nx ? { x: nx * d, z: t, ry } : { x: t, z: nz * d, ry } }
  function ckTower(g, x, z, mids, { roof = 'towerSquareTopRoofHigh', s = 1, sx, sz, base = 'towerSquareBase', mid = 'towerSquareMid', top = 'towerSquareMidWindows' } = {}) {
    let y = 0; const S = (o) => ({ sx: sx ?? s, sz: sz ?? s, sy: s })
    g.add(part(base, { x, z, ...S() })); y += 1.01 * s
    for (let i = 0; i < mids; i++) { g.add(part(i === mids - 1 ? top : mid, { x, y, z, ...S() })); y += 1.01 * s }
    g.add(part(roof, { x, y, z, ...S() }))
    return y
  }
  if (CK) {
    R.castle = (L) => {
      const g = new THREE.Group(); g.userData.scale = 1
      const mids = 2 + Math.floor(L / 2)
      // burchak minoralari
      for (const cx of [-1.5, 1.5]) for (const cz of [-1.5, 1.5]) ckTower(g, cx, cz, mids)
      // devorlar (old tomonda o'rtasi — darvoza)
      for (const side of ['f', 'b', 'l', 'r']) for (const t of [-0.5, 0.5]) {
        if (side === 'f') continue
        const p = at(side, t, 1.5); g.add(part('wall', { ...p, sy: WY }))
      }
      for (const sx of [-1, 1]) { const p = at('f', sx * 0.76, 1.5); g.add(part('wallNarrow', { ...p, sy: WY, sx: 0.96 })) }
      // katta darvoza (darvozaxona) va ko'tariladigan temir panjara
      g.add(part('wallNarrowGate', { x: 0, z: 1.5, s: 1.65 }))
      const pc = part('metalGate', { x: 0, z: 1.5, ry: Math.PI / 2, s: 1.45 }); pc.userData.portcullis = true; g.add(pc)
      for (const sx of [-1, 1]) g.add(part('flagBannerLong', { x: sx * 0.42, y: 0.2, z: 1.98, ry: Math.PI / 2, sy: 0.75 }))
      // asosiy bino (keep): orqa qatorda, eng baland, derazali
      const ky = ckTower(g, 0, -0.5, 2 + Math.min(3, L), { s: 1, sx: 1.9, sz: 0.95, base: 'towerSquareBaseColor', mid: 'towerSquareMidWindows', top: 'towerSquareMidWindows', roof: 'towerSquareTopRoof' })
      g.add(part('flagBannerLong', { x: -0.5, y: 0.6, z: -0.02, ry: Math.PI / 2 })); g.add(part('flagBannerLong', { x: 0.5, y: 0.6, z: -0.02, ry: Math.PI / 2 }))
      g.userData.flagY = ky + 0.9; g.userData.flagZ = -0.5
      // hovli
      for (const x of [-0.5, 0.5]) g.add(part('Floor_UnevenBrick', { x, z: 0.5, y: 0.01, s: 0.5 }))
      return g
    }
    // Devor (1 katak): baland qal'a devori
    R.wall = (L) => { const g = new THREE.Group(); g.userData.scale = 1; g.add(part('wall', { sy: WY + (L - 1) * 0.3 })); return g }
  }
  // ---------- Shaharni o'rab turuvchi devor (orol chetida), darvozalar va minoralar bilan ----------
  function cityWall(N, tiles, gates) {
    const g = new THREE.Group(); if (!CK) return g
    const isWater = (x, y) => { const t = tiles[y * N + x]; return t && (t.k === 'water' || t.k === 'bridge') }
    const gateAt = new Map(gates.map((q) => [q.x + ',' + q.y, q]))
    const cells = []
    for (let i = -1; i <= N; i++) { cells.push([i, -1, 'b'], [i, N, 'f']) }
    for (let i = 0; i < N; i++) { cells.push([-1, i, 'l'], [N, i, 'r']) }
    for (const [x, y, side] of cells) {
      const corner = (x === -1 || x === N) && (y === -1 || y === N)
      const inner = [Math.min(N - 1, Math.max(0, x)), Math.min(N - 1, Math.max(0, y))]
      const ry = SIDE[side][2]
      if (corner || (side === 'b' || side === 'f' ? (x + 1) % 6 === 0 : (y + 1) % 6 === 0)) { ckTower(g, x, y, corner ? 3 : 2, { roof: corner ? 'towerSquareTopRoofHigh' : 'towerSquareTopRoof' }); continue }
      if (gateAt.has(x + ',' + y)) {
        g.add(part('wallNarrowGate', { x, z: y, ry, s: 1.65 }))
        continue
      }
      if (isWater(...inner)) { g.add(part('towerSquareArch', { x, z: y, ry, sy: 1.4 })); continue }   // daryo devor ostidan o'tadi
      g.add(part('wall', { x, z: y, ry, sy: WY }))
    }
    return g
  }
  const recipes = R

  // ---------- Tabiat (instancing — yuzlab daraxt ham tez chiziladi) ----------
  function scatter() {
    const buckets = new Map()   // nom → matritsalar
    const tmp = new THREE.Object3D()
    return {
      add(n, x, y, z, ry = 0, s = 1, sy = s) {
        if (!P[n]) return
        tmp.position.set(x, y, z); tmp.rotation.set(0, ry, 0); tmp.scale.set(s, sy, s); tmp.updateMatrix()
        if (!buckets.has(n)) buckets.set(n, []); buckets.get(n).push(tmp.matrix.clone())
      },
      build() {
        const grp = new THREE.Group(), m = new THREE.Matrix4()
        for (const [n, list] of buckets) {
          const src = P[n]; src.updateMatrixWorld(true)
          const inv = new THREE.Matrix4().copy(src.matrixWorld).invert()
          src.traverse((o) => {
            if (!o.isMesh) return
            const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)
            const im = new THREE.InstancedMesh(o.geometry, o.material, list.length)
            list.forEach((mm, i) => im.setMatrixAt(i, m.multiplyMatrices(mm, local)))
            im.castShadow = o.castShadow && !/Grass|Flower|Clover|Fern|Plant|Pebble|RockPath|Mushroom/.test(n); im.receiveShadow = shadow
            im.computeBoundingSphere(); grp.add(im)
          })
        }
        return grp
      },
    }
  }
  return { has, part, recipes, scatter, cityWall, P, CK }
}
