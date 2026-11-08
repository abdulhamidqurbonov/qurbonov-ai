// ============ Shinobu olami — 3D ko'rinish (4.1) ============
// world.js o'yin mantig'ini boshqaradi (binolar, resurslar, hujumlar). Bu fayl faqat 3D'da chizadi.
// Grafika: Past / O'rta / Yuqori. Kamera: Clash'dagidek tepadan — surish, kattalashtirish, aylantirish.
// Modellar: Kenney Retro Fantasy Kit (CC0), personajlar — VRM + Mixamo.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '/vendor/three/three-vrm.module.js'
import { loadMixamo } from '/mixamo.js'
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js'
import { createVillage, K as VK } from '/village.js'
import { createLand, createSky, farTrees, WATER_Y, WORLD_R } from '/land.js'
import { loadOlam } from '/olam.js'
import { makeHumanoid, animateHumanoid, setLoad, VILLAGER, SOLDIER, makeMonster3D, animateMonster, flashMonster, makeAnimal, animateAnimal, setShadows } from '/creatures.js'

const store = {
  get(k, d) { try { const v = localStorage.getItem('qai.' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('qai.' + k, JSON.stringify(v)) } catch { /* */ } },
}
const GFX = Object.assign({ mode: '3d', q: innerWidth < 760 ? 'low' : 'med' }, store.get('gfx', {}))
const Q = { low: { pr: 0.75, shadow: 0, aa: false, deco: false }, med: { pr: 1, shadow: 1024, aa: true, deco: true }, high: { pr: Math.min(2, devicePixelRatio || 1), shadow: 2048, aa: true, deco: true } }[GFX.q] || {}
const N = 22
const lerp = (a, b, k) => a + (b - a) * k

function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }

function init() {
  const G = window.__world
  if (!G) return
  addSettingsUI(G)
  if (GFX.mode !== '3d' || !webglOk()) return

  // ---------- Sahna ----------
  const canvas = document.createElement('canvas'); canvas.id = 'cv3'
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0'
  document.body.prepend(canvas)
  document.getElementById('cv').style.background = 'transparent'
  document.body.style.background = '#87b9e0'
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Q.pr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
  if (Q.shadow) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap }
  const scene = new THREE.Scene()
  setShadows(!!Q.shadow)
  const sky = new THREE.Color('#bfe0f5'); scene.background = sky
  scene.fog = new THREE.Fog(sky, 55, 175)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 480)
  const SKY = createSky(scene)   // osmon gumbazi, quyosh, bulutlar, tunda yulduzlar
  const hemi = new THREE.HemisphereLight(0xdff1ff, 0x4f6b3a, 1.6); scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.position.set(18, 26, 8); scene.add(sun); scene.add(sun.target)
  if (Q.shadow) {
    sun.castShadow = true; sun.shadow.mapSize.set(Q.shadow, Q.shadow)
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02
  }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }
  addEventListener('resize', resize); resize()

  // ---------- Kamera (orbit atrofida: target, masofa, burchak) ----------
  const view = Object.assign({ tx: 10.5, tz: 10.5, dist: innerWidth < 760 ? 20 : 16, az: Math.PI / 4, el: 0.95 }, store.get('cam3d', {}))
  const home = G.W.b.find((b) => b.type === 'castle') || G.W.b.find((b) => b.type === 'house')
  if (home && !store.get('cam3d', null)) { view.tx = home.x + 0.5; view.tz = home.y + 0.5 }
  const saveView = () => store.set('cam3d', view)
  function placeCamera() {
    const d = view.dist, h = Math.sin(view.el) * d, r = Math.cos(view.el) * d
    const g0 = OL ? gy(view.tx, view.tz) : 0
    camera.position.set(view.tx + Math.sin(view.az) * r, h + g0, view.tz + Math.cos(view.az) * r)
    camera.lookAt(view.tx, g0, view.tz)
    sun.position.set(view.tx + 14, 26, view.tz + 6); sun.target.position.set(view.tx, 0, view.tz)
  }

  // ---------- Modellar (Kenney) ----------
  const loader = new GLTFLoader()
  const kit = {}
  const KIT = ['wall-paint-door', 'wall-door', 'wall-window', 'wall-paint-window', 'wall-fortified', 'wall-fortified-gate', 'wall-fortified-window', 'wall-fortified-paint',
    'roof', 'roof-high-side', 'tower-base', 'tower', 'tower-paint', 'tower-top', 'wall-low', 'battlement', 'structure', 'structure-wall', 'overhang', 'pulley',
    'wall-flat-gate', 'detail-crate', 'detail-crate-small', 'barrels', 'detail-barrel', 'fence-wood', 'tree-large', 'tree-shrub', 'wood-floor-railing', 'dock-side', 'column-wood', 'bricks']
  let kitReady = false
  Promise.all(KIT.map((n) => loader.loadAsync(`/kit/${n}.glb`).then((g) => {
    const s = g.scene
    s.traverse((o) => { if (o.isMesh) { o.castShadow = !!Q.shadow; o.receiveShadow = !!Q.shadow; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace } })
    const box = new THREE.Box3().setFromObject(s), c = box.getCenter(new THREE.Vector3())
    const wrap = new THREE.Group(); s.position.set(-c.x, -box.min.y, -c.z); wrap.add(s)
    wrap.userData.size = box.getSize(new THREE.Vector3())
    kit[n] = wrap
  }).catch(() => {}))).then(() => { kitReady = true; rebuildAll() })
  // Quaternius qishloq + tabiat to'plamlari (real uylar, daraxtlar, o'tlar)
  let V = null
  Promise.all([loader.loadAsync('/models/village.glb'), loader.loadAsync('/models/nature.glb').catch(() => null), loader.loadAsync('/models/castle.glb').catch(() => null)])
    .then(([v, n, c]) => { V = createVillage(v, n, { shadow: !!Q.shadow }, c); if (kitReady) rebuildAll() })
    .catch((e) => console.warn('qishloq modellari yuklanmadi', e))
  function piece(n, { x = 0, y = 0, z = 0, s = 1, sy, sz, ry = 0, tint } = {}) {
    const src = kit[n]; if (!src) return new THREE.Group()
    const o = src.clone(true)
    const k = s / Math.max(src.userData.size.x, src.userData.size.z)
    const m = Math.max(src.userData.size.x, src.userData.size.z); o.scale.set(k, (sy ?? s) / m, (sz ?? s) / m)
    o.position.set(x, y, z); o.rotation.y = ry
    if (tint) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)) } })
    return o
  }
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !!Q.shadow; o.receiveShadow = !!Q.shadow; return o }

  // ---------- Yer ----------
  const world = new THREE.Group(); scene.add(world)
  let cityWall = null
  let ground = null, waterMesh = null, waterTex = null, deco = new THREE.Group(), tilesKey = ''
  world.add(deco)
  const texLoader = new THREE.TextureLoader()
  waterTex = texLoader.load('/kit/Textures/water.png', (t) => { t.colorSpace = THREE.SRGBColorSpace }); waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping
  // ---------- Relyefli yer (land.js): shahar ichida bo'rtiqlar, tashqarida adirlar va tog'lar ----------
  // ---------- Unity'da yasalgan olam (models/olam) — bor bo'lsa, shu ishlatiladi ----------
  let OL = null
  loadOlam({ loader: new GLTFLoader(), N, shadow: !!Q.shadow, waterTex }).then((o) => {
    OL = o; world.add(o.group)
    for (const x of [ground, waterMesh, cityWall, deco, base, baseTop]) if (x) x.visible = false
    bGroup.visible = false
    scene.fog.near = 90; scene.fog.far = 330; camera.far = 900; camera.updateProjectionMatrix()
    PL.x = o.spawn[0]; PL.z = o.spawn[1]; PL.y = 0; PL.vy = 0; PL.yaw = Math.PI; SH.x = PL.x + 0.6; SH.z = PL.z - 0.4
    Object.assign(view, { tx: (N - 1) / 2, tz: o.spawn[1] + 6, dist: 70, el: 0.62, az: Math.PI })   // tepadan: butun shahar ko'rinadi
  }).catch((e) => console.info("Unity olami yo'q — oddiy olam ishlaydi:", e?.message || e))
  let outsideHouses = []
  let land = null, LH = null, LHseg = 0, outsideTrees = new Map(), landKey = ''
  const LRES = Q.shadow ? 2 : GFX.q === 'low' ? 1 : 2
  function bFlats() { return G.W.b.map((b) => { const s = G.DEFS[b.type].size; return { cx: b.x + (s - 1) / 2, cz: b.y + (s - 1) / 2, hw: s / 2 + 0.1 } }) }
  function buildGround() {
    if (OL) return
    if (ground) { world.remove(ground); ground.geometry.dispose() }
    if (waterMesh) { world.remove(waterMesh) }
    const tiles = G.W.tiles
    land = createLand({ N, tiles, gates: G.cityGates ? G.cityGates() : [] })
    land.setBuildings(bFlats())
    ground = land.buildMesh(LRES); ground.receiveShadow = !!Q.shadow
    const pos = ground.geometry.attributes.position; LHseg = Math.round(Math.sqrt(pos.count)) - 1
    LH = new Float32Array(pos.count); for (let i = 0; i < pos.count; i++) LH[i] = pos.getY(i)
    const S = WORLD_R * 2
    const water = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: waterTex, color: '#6fc4f0', roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.88 }))
    water.rotation.x = -Math.PI / 2; water.position.set((N - 1) / 2, WATER_Y, (N - 1) / 2); waterTex.repeat.set(S / 2, S / 2)
    world.add(ground); world.add(water); waterMesh = water
    base.visible = baseTop.visible = false
    // shahar devori — darvozalar G.cityGates() bilan bir xil
    if (cityWall) world.remove(cityWall)
    if (V?.CK) { cityWall = V.cityWall(N, tiles, G.cityGates ? G.cityGates() : []); world.add(cityWall) }
    if (terrain) ground.visible = water.visible = false
    landKey = G.W.b.map((b) => b.type + b.x + ',' + b.y).join('|')
  }
  // binolar o'zgarsa — ostini tekislab yerni qayta quramiz
  function refreshLand() { const k = G.W.b.map((b) => b.type + b.x + ',' + b.y).join('|'); if (k !== landKey && land) buildGround() }
  // Orol ostidagi tuproq (Clash'dagidek suzib turgan orol)
  const base = mesh(new THREE.BoxGeometry(N + 0.4, 2.2, N + 0.4), mat('#8a5a3c'), (N - 1) / 2, -1.6, (N - 1) / 2); base.receiveShadow = false; scene.add(base)
  const baseTop = mesh(new THREE.BoxGeometry(N + 0.6, 0.18, N + 0.6), mat('#5f9a43'), (N - 1) / 2, -0.52, (N - 1) / 2); scene.add(baseTop)

  // Daraxtlar, qoyalar, gullar
  const rockGeo = new THREE.DodecahedronGeometry(0.32, 0), rockMat = mat('#9aa0aa')
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.36, 6), trunkMat = mat('#7a4f30')
  const pineGeo = new THREE.ConeGeometry(0.34, 0.42, 7), blobGeo = new THREE.IcosahedronGeometry(0.3, 0)
  const leafMats = [mat('#3f9a4a'), mat('#4fae5b'), mat('#68c272')]
  function buildDeco() {
    if (OL) return
    world.remove(deco); deco = new THREE.Group(); world.add(deco)
    queueMicrotask(() => { if (HG) for (const o of deco.children) o.position.y += gy(o.position.x, o.position.z) })
    const tiles = G.W.tiles
    if (V && V.has('CommonTree_1')) { natureDeco(tiles); return }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = tiles[y * N + x]
      if ((t.k === 'tree' || t.k === 'rock') && custom[t.k]) { const o = customPiece(t.k, t.k === 'tree' ? 0.8 + t.v * 0.4 : 0.6 + t.v * 0.3); o.position.set(x, 0, y); o.rotation.y = t.v * 6; deco.add(o); continue }
      if (t.k === 'tree') {
        // past-poligonli daraxt: qarag'ay yoki dumaloq
        const tr = new THREE.Group(), k = 0.75 + t.v * 0.5
        tr.add(mesh(trunkGeo, trunkMat, 0, 0.18 * k, 0)).scale.setScalar(k)
        if (t.v > 0.45) { for (let i = 0; i < 3; i++) { const c = mesh(pineGeo, leafMats[i % 3], 0, (0.42 + i * 0.22) * k, 0); c.scale.setScalar((1 - i * 0.24) * k); tr.add(c) } }
        else { const a = mesh(blobGeo, leafMats[1], 0, 0.55 * k, 0); a.scale.setScalar(k); tr.add(a); const b2 = mesh(blobGeo, leafMats[2], 0.12 * k, 0.7 * k, 0.05 * k); b2.scale.setScalar(0.65 * k); tr.add(b2) }
        tr.position.set(x + (t.v - 0.5) * 0.3, 0, y + (0.5 - t.v) * 0.3); tr.rotation.y = t.v * 6
        tr.userData.sway = t.v * 10; deco.add(tr)
      } else if (t.k === 'rock') {
        const r = mesh(rockGeo, rockMat, x, 0.12, y); r.scale.set(1 + t.v * 0.6, 0.7 + t.v * 0.5, 1 + t.v * 0.4); r.rotation.y = t.v * 5; deco.add(r)
        if (t.v > 0.5) { const r2 = mesh(rockGeo, rockMat, x + 0.25, 0.06, y + 0.2); r2.scale.setScalar(0.5); deco.add(r2) }
      } else if (t.k === 'bridge') {
        deco.add(piece('wood-floor-railing', { x, y: -0.14, z: y, s: 1, ry: Math.PI / 2 }))
      } else if (t.f && Q.deco) {
        for (let i = 0; i < 3; i++) deco.add(mesh(new THREE.SphereGeometry(0.035, 5, 4), mat(['#ffd6e6', '#fff4a8', '#ffffff'][i], { flatShading: false }), x + (i - 1) * 0.18, 0.04, y + ((i % 2) - 0.5) * 0.2))
      }
    }
  }

  // ---------- Tabiat: haqiqiy daraxtlar, butalar, o'tlar, gullar, toshlar (instancing) ----------
  function natureDeco(tiles) {
    const sc0 = V.scatter(), sc = { add: (n, x, y, z, ...r) => sc0.add(n, x, gy(x, z) + y, z, ...r) }, rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) }
    const occupied = new Set(); for (const b of G.W.b) { const s = G.DEFS[b.type].size; for (let dy = -1; dy <= s; dy++) for (let dx = -1; dx <= s; dx++) occupied.add((b.y + dy) * N + b.x + dx) }
    const nearTree = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tiles[(y + dy) * N + x + dx]?.k === 'tree')
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, t = tiles[i]
      if (custom[t.k] && (t.k === 'tree' || t.k === 'rock')) { const o = customPiece(t.k, t.k === 'tree' ? 0.8 + t.v * 0.4 : 0.6 + t.v * 0.3); o.position.set(x, 0, y); o.rotation.y = t.v * 6; deco.add(o); continue }
      if (t.k === 'tree') {
        const pine = t.v > 0.45, n = (pine ? 'Pine_' : 'CommonTree_') + (1 + Math.floor(rnd(i, 1) * 5))
        sc.add(n, x + (rnd(i, 2) - 0.5) * 0.35, 0, y + (rnd(i, 3) - 0.5) * 0.35, rnd(i, 4) * 6.28, 0.26 + rnd(i, 5) * 0.1)
        if (Q.deco && rnd(i, 6) > 0.55) sc.add(rnd(i, 7) > 0.5 ? 'Fern_1' : 'Bush_Common', x + 0.3, 0, y - 0.25, rnd(i, 8) * 6, 0.18)
        if (Q.deco && rnd(i, 9) > 0.85) sc.add('Mushroom_Common', x - 0.3, 0, y + 0.3, rnd(i, 10) * 6, 0.3)
      } else if (t.k === 'rock') {
        sc.add('Rock_Medium_' + (1 + Math.floor(rnd(i, 1) * 3)), x, -0.05, y, rnd(i, 2) * 6.28, 0.24 + t.v * 0.1)
        if (rnd(i, 3) > 0.4) sc.add('Pebble_Round_' + (1 + Math.floor(rnd(i, 4) * 2)), x + 0.35, 0, y + 0.3, rnd(i, 5) * 6, 0.4)
      } else if (t.k === 'bridge') {
        deco.add(piece('wood-floor-railing', { x, y: -0.14, z: y, s: 1, ry: Math.PI / 2 }))
      } else if (t.k === 'grass' && Q.deco && !occupied.has(i)) {
        // o't tuplari, gullar; o'rmon chetida butalar
        const cnt = GFX.q === 'high' ? 4 : 2
        for (let k = 0; k < cnt; k++) sc.add(['Grass_Common_Short', 'Grass_Wispy_Short', 'Grass_Common_Tall'][Math.floor(rnd(i, 20 + k) * 3)], x + (rnd(i, 30 + k) - 0.5) * 0.9, 0, y + (rnd(i, 40 + k) - 0.5) * 0.9, rnd(i, 50 + k) * 6, 0.13 + rnd(i, 60 + k) * 0.06)
        if (t.f) sc.add(rnd(i, 70) > 0.5 ? 'Flower_3_Group' : 'Flower_4_Group', x + (rnd(i, 71) - 0.5) * 0.6, 0, y + (rnd(i, 72) - 0.5) * 0.6, rnd(i, 73) * 6, 0.11)
        if (nearTree(x, y) && rnd(i, 80) > 0.6) sc.add(rnd(i, 81) > 0.5 ? 'Bush_Common_Flowers' : 'Bush_Common', x + (rnd(i, 82) - 0.5) * 0.5, 0, y + (rnd(i, 83) - 0.5) * 0.5, rnd(i, 84) * 6, 0.2)
      }
    }
    // devordan tashqaridagi o'rmonlar, adirlar o'ti, toshlar
    if (land) { outsideTrees = new Map(); const tl = land.scatterOutside(sc0, GFX.q); deco.add(farTrees(tl.far, !!Q.shadow)); for (const [x, z] of tl) { const k = Math.floor(x) + ',' + Math.floor(z); if (!outsideTrees.has(k)) outsideTrees.set(k, []); outsideTrees.get(k).push([x, z]) } }
    // devor tashqarisidagi qishloqchalar: har darvoza yo'li bo'ylab uylar va dalalar
    outsideHouses = []
    if (land && V?.recipes.cottage) {
      const fieldM = new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 1 }), cropM = new THREE.MeshStandardMaterial({ color: '#6fae3c', roughness: 0.9, flatShading: true })
      for (const g of G.cityGates ? G.cityGates() : []) {
        let k = 0
        for (const along of [5, 8.5, 12, 15.5, 19]) for (const sign of [1, -1]) {
          k++
          const side = sign * (2.3 + (k % 3) * 0.4)
          const x = g.dx ? g.x + g.dx * along : g.x + side, z = g.dx ? g.y + side : g.y + g.dy * along
          if (land.roadAt(x, z) > 0.05) continue
          const h = gy(x, z); if (h < WATER_Y + 0.1 || h > 3) continue
          if (Math.abs(gy(x + 0.5, z) - gy(x - 0.5, z)) + Math.abs(gy(x, z + 0.5) - gy(x, z - 0.5)) > 0.45) continue
          const ry = g.dx ? (sign > 0 ? Math.PI : 0) : (sign > 0 ? -Math.PI / 2 : Math.PI / 2)
          if ((k + along) % 3 === 0) {   // dala
            const f = new THREE.Group(); f.position.set(x, h + 0.01, z); f.rotation.y = ry
            const pl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 1.1), fieldM); pl.receiveShadow = !!Q.shadow; f.add(pl)
            for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), cropM); cr.position.set(-0.65 + c * 0.26, 0.1, -0.4 + r * 0.27); f.add(cr) }
            deco.add(f); continue
          }
          const inner = V.recipes.cottage(1, { x: Math.round(x * 3), y: Math.round(z * 5) }), wrap = new THREE.Group()
          wrap.scale.setScalar(VK); wrap.add(inner); wrap.position.set(x, h - 0.06, z); wrap.rotation.y = ry; deco.add(wrap)
          outsideHouses.push([x, z])
        }
      }
    }
    deco.add(sc0.build())
  }

  // ---------- Binolar ----------
  const bGroup = new THREE.Group(); world.add(bGroup)
  let bKey = ''
  const ROOF = { house: '#ff9fbf', castle: '#9d8cff', guild: '#6f9dff', barracks: '#ff7a7a', market: '#ffb060' }
  function makeBuilding(b) {
    const g = new THREE.Group(), T = b.type, L = b.lvl || 1
    const s = G.DEFS[T].size
    g.position.set(b.x + (s - 1) / 2, 0, b.y + (s - 1) / 2)
    if (b.building) {
      g.add(piece('structure', { s: 0.9 * s, sy: 0.9 }))
      g.add(mesh(new THREE.BoxGeometry(0.8 * s, 0.08, 0.8 * s), mat('#c8a678'), 0, 0.04, 0))
      return g
    }
    const up = (o) => { g.add(o); return o }
    if (V && V.recipes[T]) {
      const inner = V.recipes[T](L, b), wrap = new THREE.Group(); wrap.scale.setScalar(inner.userData.scale ?? VK); wrap.add(inner); g.add(wrap)
      inner.traverse((o) => { if (o.userData.portcullis) o.userData.y0 = o.position.y })
      g.userData.door = inner.userData.door
      if (T === 'castle') {
        const u = inner.userData.scale === 1 ? 0.4 : 1   // Castle Kit — katak birligida
        const pole = mesh(new THREE.CylinderGeometry(0.05 * u, 0.05 * u, 2.4 * u), mat('#555'), 0, inner.userData.flagY + 1.2 * u, inner.userData.flagZ); inner.add(pole)
        const flag = mesh(new THREE.PlaneGeometry(1.4 * u, 0.85 * u), mat('#e2304b', { side: THREE.DoubleSide }), 0.72 * u, inner.userData.flagY + 2.0 * u, inner.userData.flagZ); flag.userData.flag = true; inner.add(flag)
      }
      if (inner.userData.banner) { const bn = inner.userData.banner, f = mesh(new THREE.PlaneGeometry(0.8, 1.4), mat('#3a5bd9', { side: THREE.DoubleSide }), bn.x, bn.y, bn.z); f.userData.flag = true; inner.add(f) }
      return g
    }
    if (T === 'castle') g.scale.setScalar(G.DEFS.castle.size / 3)   // zaxira (Kenney) qasr — 4×4 ga moslab
    if (T === 'house') {
      up(piece('wall-paint-door', { s: 0.82, ry: 0 }))
      up(piece('roof', { y: 0.82, s: 0.86, tint: ROOF.house }))
      if (L >= 2) up(piece('detail-barrel', { x: 0.42, z: 0.32, s: 0.22 }))
    } else if (T === 'castle') {
      // Haqiqiy qasr: 3×3 katak, 2 m qalin devorlar (o'yinchidan ~3 barobar baland), 4 minora, markaziy bino, katta darvoza
      const H = 0.5, layers = 3 + Math.min(2, Math.floor(L / 2))   // devor balandligi darajaga qarab o'sadi
      const W0 = 1.25   // devor markazi (markazdan)
      const wallAt = (x, z, ry) => { for (let i = 0; i < layers; i++) up(piece(i === layers - 1 ? 'wall-fortified-window' : 'wall-fortified', { x, z, y: i * H, s: H, ry })) }
      for (let i = -2; i <= 2; i++) {
        const o = i * H
        wallAt(o, -W0, 0); wallAt(-W0, o, Math.PI / 2); wallAt(W0, o, Math.PI / 2)
        if (Math.abs(i) > 0) wallAt(o, W0, Math.PI)      // old devor: o'rtasi darvoza
      }
      // darvoza: keng va baland ark, ustida devor
      up(piece('wall-fortified-gate', { x: 0, z: W0, s: 1.0, sy: 1.3, sz: H, ry: Math.PI }))
      for (let y = 1.3; y < layers * H - 0.05; y += H) up(piece('wall-fortified', { x: 0, z: W0, y, s: 1.0, sy: Math.min(H, layers * H - y), sz: H, ry: Math.PI }))
      // tepadagi tishli panjara (battlement)
      for (let i = -2; i <= 2; i++) for (const [x, z, ry] of [[i * H, -W0 - 0.18, 0], [i * H, W0 + 0.18, 0], [-W0 - 0.18, i * H, Math.PI / 2], [W0 + 0.18, i * H, Math.PI / 2]]) up(piece('battlement', { x, z, y: layers * H, s: H, ry }))
      // ikki tavaqali katta yog'och darvoza (o'yinchi yaqinlashsa ochiladi)
      const doorMat = mat('#6b4423'), ironMat = mat('#3a3d44', { metalness: 0.5 })
      for (const sd of [-1, 1]) {
        const hinge = new THREE.Group(); hinge.position.set(sd * 0.3, 0, W0 + 0.2)
        const leaf = mesh(new THREE.BoxGeometry(0.3, 0.98, 0.05), doorMat, -sd * 0.15, 0.49, 0)
        for (const y of [0.2, 0.75]) leaf.add(mesh(new THREE.BoxGeometry(0.3, 0.035, 0.06), ironMat, 0, y - 0.49, 0))
        hinge.add(leaf); hinge.userData.door = sd; g.add(hinge)
      }
      // ichki hovli — tosh pol
      g.add(mesh(new THREE.BoxGeometry(2.1, 0.03, 2.1), mat('#b7ad9d'), 0, 0.015, 0))
      // burchak minoralari
      const TH = layers * H + 0.6
      for (const [dx, dz] of [[-W0, -W0], [W0, -W0], [-W0, W0], [W0, W0]]) {
        up(piece('tower-base', { x: dx, z: dz, s: 0.72 }))
        for (let y = 0.66; y < TH - 0.1; y += 0.66) up(piece('tower', { x: dx, z: dz, y, s: 0.66 }))
        up(piece('tower-top', { x: dx, z: dz, y: Math.ceil((TH - 0.66) / 0.66) * 0.66 + 0.66, s: 0.8 }))
        const c = mesh(new THREE.ConeGeometry(0.42, 0.7, 8), mat(ROOF.castle), dx, Math.ceil((TH - 0.66) / 0.66) * 0.66 + 0.66 + 0.55, dz); g.add(c)
      }
      // markaziy bino (keep) — orqa tomonda, eng baland
      const KH = layers * H + 1.1
      for (let y = 0; y < KH - 0.05; y += 0.55) up(piece(y > 0.5 ? 'wall-fortified-window' : 'wall-fortified-paint', { x: 0, z: -0.45, y, s: 1.0, sy: 0.55 }))
      up(piece('roof', { x: 0, z: -0.45, y: Math.ceil(KH / 0.55) * 0.55, s: 1.05, tint: ROOF.castle }))
      const top = Math.ceil(KH / 0.55) * 0.55 + 1.0
      const pole = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), mat('#555'), 0, top + 0.4, -0.45); g.add(pole)
      const flag = mesh(new THREE.PlaneGeometry(0.5, 0.3), mat('#e2304b', { side: THREE.DoubleSide }), 0.26, top + 0.68, -0.45); flag.userData.flag = true; g.add(flag)
    } else if (T === 'farm') {
      g.add(mesh(new THREE.BoxGeometry(0.92, 0.06, 0.92), mat('#8a5a2c'), 0, 0.03, 0))
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        const c = mesh(new THREE.ConeGeometry(0.06, 0.16 + L * 0.03, 5), mat(L > 2 ? '#d9b13b' : '#7fbf4a'), i * 0.17, 0.12, j * 0.17); c.userData.crop = (i + j) * 0.7; g.add(c)
      }
      up(piece('fence-wood', { z: 0.48, s: 0.9 })); up(piece('fence-wood', { x: 0.48, s: 0.9, ry: Math.PI / 2 }))
    } else if (T === 'lumber') {
      up(piece('overhang', { x: -0.12, z: -0.1, s: 0.75 }))
      for (let i = 0; i < 3; i++) { const l = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 7), mat('#b9814f'), 0.25, 0.08 + i * 0.13, 0.2 - (i % 2) * 0.07); l.rotation.z = Math.PI / 2; g.add(l) }
      up(piece('pulley', { x: -0.35, z: 0.3, s: 0.45 }))
    } else if (T === 'mine') {
      up(piece('wall-flat-gate', { s: 0.75 }))
      for (const [dx, dz, k] of [[-0.42, 0.1, 0.9], [0.42, -0.1, 0.8], [0.1, -0.4, 1.1]]) { const r = mesh(rockGeo, rockMat, dx, 0.18, dz); r.scale.setScalar(k * 1.3); g.add(r) }
      const ore = mesh(new THREE.OctahedronGeometry(0.08), mat('#f4c542', { emissive: '#5a4400' }), 0.32, 0.3, 0.34); ore.userData.spin = true; g.add(ore)
      up(piece('detail-crate-small', { x: 0.35, z: 0.38, s: 0.2 }))
    } else if (T === 'market') {
      up(piece('structure', { s: 0.8, sy: 0.75 }))
      for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.9), mat(i % 2 ? '#fff4f6' : ROOF.market), -0.3 + i * 0.2, 0.82, 0))
      up(piece('barrels', { x: 0.3, z: 0.3, s: 0.3 })); up(piece('detail-crate', { x: -0.28, z: 0.28, s: 0.25 }))
    } else if (T === 'fountain') {
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 14), mat('#c9ced6'), 0, 0.09, 0))
      g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 14), new THREE.MeshStandardMaterial({ map: waterTex, color: '#8fdcff', roughness: 0.2 }), 0, 0.17, 0))
      g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), mat('#c9ced6'), 0, 0.4, 0))
      const top = mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: '#bfeaff', transparent: true, opacity: 0.8 }), 0, 0.7, 0); top.userData.bob = true; g.add(top)
    } else if (T === 'tower') {
      up(piece('tower-base', { s: 0.7 })); up(piece('tower-paint', { y: 0.7, s: 0.7 }))
      if (L >= 3) up(piece('tower', { y: 1.4, s: 0.7 }))
      up(piece('tower-top', { y: L >= 3 ? 2.1 : 1.4, s: 0.74 }))
    } else if (T === 'wall') {
      up(piece('battlement', { s: 1.0, sy: 0.7 + L * 0.15 }))
    } else if (T === 'barracks') {
      up(piece('wall-fortified-paint', { s: 0.85 })); up(piece('roof', { y: 0.85, s: 0.88, tint: ROOF.barracks }))
      const pole = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), mat('#555'), 0.42, 0.7, 0.42); g.add(pole)
      const flag = mesh(new THREE.PlaneGeometry(0.32, 0.2), mat('#b8323f', { side: THREE.DoubleSide }), 0.58, 1.3, 0.42); flag.userData.flag = true; g.add(flag)
    } else if (T === 'home') {
      // Qurbonov uyi: 2×2, ikki qavatli, katta eshik (eshik oldida E — kirish)
      up(piece('wall-paint-door', { x: 0, z: 0.3, s: 1.6, sy: 1.1, sz: 0.8 })); up(piece('wall-paint-window', { x: 0, z: -0.45, s: 1.6, sy: 1.1, sz: 0.7 }))
      up(piece('wall-paint-window', { x: 0, z: -0.08, y: 1.1, s: 1.6, sy: 0.9, sz: 1.5 }))
      up(piece('roof', { x: 0, z: -0.08, y: 2.0, s: 1.75, sz: 1.65, tint: '#4fae7f' }))
      if (L >= 2) { up(piece('detail-barrel', { x: 0.75, z: 0.65, s: 0.25 })); up(piece('fence-wood', { x: -0.6, z: 0.85, s: 0.6 })) }
      if (L >= 3) up(piece('overhang', { x: 0.7, z: -0.3, s: 0.55 }))
      const win = mesh(new THREE.BoxGeometry(0.2, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffb64a', emissiveIntensity: 0 }), -0.4, 1.55, 0.68); win.userData.nightWin = true; g.add(win)
    } else if (T === 'guild') {
      up(piece('wall-paint-window', { s: 0.84 })); up(piece('wall-paint-window', { y: 0.84, s: 0.8 })); up(piece('roof', { y: 1.64, s: 0.86, tint: ROOF.guild }))
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), mat('#f4c542', { emissive: '#3a2a00' }), 0.43, 1.1, 0.15)).rotation.z = Math.PI / 2
    }
    return g
  }
  // O'zingiz yasagan modellar: public/models/world/list.json → {"house": "uy.glb", "tree": "daraxt.glb", ...}
  // Blender / Unity'dan .glb qilib eksport qiling — o'lchami katakka avtomatik moslanadi.
  const custom = {}
  fetch('/models/world/list.json').then((r) => (r.ok ? r.json() : {})).then((list) => Promise.all(Object.entries(list).map(([k, f]) =>
    new GLTFLoader().loadAsync('/models/world/' + f).then((g) => {
      const s = g.scene
      s.traverse((o) => { if (o.isMesh) { o.castShadow = !!Q.shadow; o.receiveShadow = !!Q.shadow } })
      const box = new THREE.Box3().setFromObject(s), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3())
      const wrap = new THREE.Group(); s.position.set(-c.x, -box.min.y, -c.z); wrap.add(s)
      wrap.userData.fit = 1 / Math.max(sz.x, sz.z, 1e-3); wrap.userData.h = sz.y || 1; wrap.userData.clips = g.animations || []; custom[k] = wrap
      if (k === 'terrain') setTerrain(wrap, sz)
    }).catch((e) => console.warn('model yuklanmadi:', f, e)))).then(() => { if (Object.keys(custom).length && kitReady) { rebuildAll(); animalKey = ''; folkKey = ''; unitKey = '' } })).catch(() => {})
  // ---------- Siz yasagan yer (relyef): o'yin maydoniga (22×22) cho'ziladi, hamma uning ustida yuradi ----------
  let terrain = null, HG = null; const HR = 2   // har katakka 2 ta balandlik nuqtasi
  function setTerrain(wrap, sz) {
    terrain = wrap; const k = (N + 0.4) / Math.max(sz.x, sz.z)
    wrap.scale.set(k, k, k); wrap.position.set((N - 1) / 2, 0, (N - 1) / 2); scene.add(wrap); wrap.updateMatrixWorld(true)
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), M = N * HR + 1, hs = []
    HG = new Float32Array(M * M)
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      ray.set(new THREE.Vector3(i / HR - 0.5, 500, j / HR - 0.5), down)
      const h = ray.intersectObject(wrap, true)[0]; HG[j * M + i] = h ? h.point.y : NaN; if (h) hs.push(h.point.y)
    }
    hs.sort((a, b) => a - b); const mid = hs.length ? hs[Math.floor(hs.length / 2)] : 0   // o'rtacha yer sathi = 0
    wrap.position.y = -mid; for (let i = 0; i < HG.length; i++) HG[i] = isNaN(HG[i]) ? 0 : HG[i] - mid
    for (const o of [ground, waterMesh, base, baseTop]) if (o) o.visible = false
    rebuildAll()
  }
  function gy(x, z) {   // yer balandligi
    if (OL) return OL.gy(x, z)
    if (!HG && LH) {
      const S = WORLD_R * 2, x0 = (N - 1) / 2 - WORLD_R, z0 = (N - 1) / 2 - WORLD_R, n = LHseg
      const fx = Math.max(0, Math.min(n - 0.001, (x - x0) / S * n)), fz = Math.max(0, Math.min(n - 0.001, (z - z0) / S * n))
      const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, w = n + 1
      return (LH[j * w + i] * (1 - a) + LH[j * w + i + 1] * a) * (1 - b) + (LH[(j + 1) * w + i] * (1 - a) + LH[(j + 1) * w + i + 1] * a) * b
    }
    if (!HG) return 0
    const M = N * HR + 1, fx = Math.max(0, Math.min(M - 1.001, (x + 0.5) * HR)), fz = Math.max(0, Math.min(M - 1.001, (z + 0.5) * HR))
    const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j
    return (HG[j * M + i] * (1 - a) + HG[j * M + i + 1] * a) * (1 - b) + (HG[(j + 1) * M + i] * (1 - a) + HG[(j + 1) * M + i + 1] * a) * b
  }
  // ---------- Siz yasagan JONLI modellar (hayvon, odam, dushman) — animatsiyasi bilan ----------
  const LIVE_H = { flyer: 0.42, villager: 0.62, soldier: 0.64, archer: 0.64, knight: 0.68, sheep: 0.38, chicken: 0.2, rabbit: 0.16, deer: 0.6, bat: 0.3, wolf: 0.45, goblin: 0.62, troll: 1.1, enemy: 0.62 }
  const PICK = { idle: /idle|stand|breath|wait/i, walk: /walk|move|locomot|fast_fly/i, run: /run|sprint|gallop|jog/i, attack: /attack|punch|bite|slash|strike|swing|headbutt|hit(?!.?(react|recie))/i, die: /die|death|dead|fall/i, work: /work|chop|dig|mine|farm|gather|fixing|interact|pick/i, cheer: /cheer|dance|victory|happy|jump/i }
  const CHAIN = { idle: ['idle'], move: ['walk', 'run'], walk: ['walk', 'run'], run: ['run', 'walk'], carry: ['walk', 'run'], attack: ['attack', 'idle'], work: ['work', 'attack', 'idle'], cheer: ['cheer', 'idle'], die: ['die'] }
  const enemyKeys = () => Object.keys(custom).filter((k) => /^enemy\d*$/.test(k))
  function liveKey(...keys) { for (const k of keys) if (k && custom[k]) return k; return null }
  // ---------- Quaternius maxluqlari va odamlari (to'plamlardan) ----------
  const LIVE_SRC = {}   // id → shablon (wrap + clips)
  const MSET = { bat: [], wolf: [], goblin: [], troll: [] }
  const BIG = /Yeti|MushroomKing|Dino|BlueDemon|Orc_Skull|Demon$/
  let PEOPLE = null
  function wrapTemplate(node, clips) {
    const wrap = new THREE.Group(); node.position.set(0, 0, 0); wrap.add(node); wrap.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(wrap), c = box.getCenter(new THREE.Vector3())
    node.position.set(-c.x, -box.min.y, -c.z)
    node.traverse((o) => { if (o.isMesh) { o.castShadow = !!Q.shadow; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace } })
    wrap.userData.h = box.max.y - box.min.y || 1; wrap.userData.clips = clips; return wrap
  }
  setTimeout(() => {
    loader.loadAsync('/models/monsters.glb').then((g) => {
      for (const node of [...g.scene.children]) {
        const id = node.name, clips = g.animations.filter((a) => a.name.startsWith(id + '|')).map((a) => { const c = a.clone(); c.name = a.name.split('|')[1]; return c })
        LIVE_SRC[id] = wrapTemplate(node, clips)
        if (id.startsWith('Flying_')) MSET.bat.push(id)
        else if (id === 'Blob_Chicken' || id === 'Blob_Pigeon') continue
        else if (id.startsWith('Blob_')) MSET.wolf.push(id)
        else if (BIG.test(id)) MSET.troll.push(id)
        else MSET.goblin.push(id)
      }
      animalKey = ''
    }).catch((e) => console.warn('maxluqlar yuklanmadi', e))
    loader.loadAsync('/models/people.glb').then((g) => { PEOPLE = prepPeople(g); folkKey = ''; unitKey = '' }).catch((e) => console.warn('aholi yuklanmadi', e))
  }, 1200)
  // Odamlar: kiyim (Peasant/Ranger) + Universal Animation Library skeleti; boshi — manekenning faqat bosh qismi
  function prepPeople(g) {
    const man = g.scene.getObjectByName('Mannequin'), outfits = {}
    for (const n of ['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger']) outfits[n] = g.scene.getObjectByName(n)
    // manekendan faqat bosh va bo'yinni qoldiramiz (kiyim ichidan chiqib turmasin)
    man.traverse((o) => {
      if (!o.isSkinnedMesh) return
      const bones = o.skeleton.bones, keep = new Set(['Head', 'neck_01'].map((n) => bones.findIndex((b) => b.name === n)))
      const geo = o.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index.array, out = []
      const dom = (v) => { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; bi = si.getComponent(v, k) } } return bi }
      for (let i = 0; i < idx.length; i += 3) if (keep.has(dom(idx[i])) && keep.has(dom(idx[i + 1])) && keep.has(dom(idx[i + 2]))) out.push(idx[i], idx[i + 1], idx[i + 2])
      const ng = geo.clone(); ng.setIndex(out); o.geometry = ng
      o.material = new THREE.MeshStandardMaterial({ color: '#e9b98f', roughness: 0.8 }); o.userData.skin = true
    })
    // soch va ko'zlar (bosh suyagiga biriktiriladi)
    man.updateMatrixWorld(true)
    const head = man.getObjectByName('Head'), hb = new THREE.Box3()
    man.traverse((o) => { if (o.isSkinnedMesh) { o.computeBoundingBox(); hb.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)) } })   // skinlangan (suyak bo'yicha) chegaralar
    const hc = hb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3())
    const toHead = (obj, wp) => { head.add(obj); obj.position.copy(head.worldToLocal(wp.clone())); obj.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert()) }
    const hairM = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 })
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); cap.scale.set(hs.x * 0.56, hs.y * 0.5, hs.z * 0.6); cap.userData.hair = 'cap'
    toHead(cap, new THREE.Vector3(hc.x, hc.y + hs.y * 0.18, hc.z - hs.z * 0.04))
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(1, 2, 4, 8), hairM); tail.scale.set(hs.x * 0.36, hs.y * 0.3, hs.z * 0.2); tail.userData.hair = 'long'
    toHead(tail, new THREE.Vector3(hc.x, hc.y - hs.y * 0.1, hc.z - hs.z * 0.42))
    const eyeM = new THREE.MeshBasicMaterial({ color: '#2a1d16' })
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(hs.x * 0.07, 8, 6), eyeM); toHead(e, new THREE.Vector3(hc.x + sx * hs.x * 0.18, hc.y + hs.y * 0.06, hc.z + hs.z * 0.45)) }
    const tpl = wrapTemplate(man, g.animations.map((a) => a.clone()))
    return { tpl, outfits }
  }
  const SKIN = ['#f0c9a4', '#e3b088', '#c98f63', '#9a6a45'], HAIR = ['#2a1d16', '#5a3a22', '#8a5a2b', '#c9a15a', '#3b2f2f', '#7a2e1d']
  function makePerson(outfit, hKey = 'villager', seed = Math.random()) {
    if (!PEOPLE) return null
    const src = PEOPLE.tpl, inner = skClone(src)
    const arm = inner.getObjectByName('Armature') || inner, bones = {}
    inner.traverse((o) => { if (o.isBone) bones[o.name] = o })
    const ofit = skClone(PEOPLE.outfits[outfit])
    const sms = []; ofit.traverse((o) => { if (o.isSkinnedMesh) sms.push(o) })
    for (const sm of sms) {
      const sk = sm.skeleton, nb = sk.bones.map((b) => bones[b.name] || b)
      arm.add(sm); sm.bind(new THREE.Skeleton(nb, sk.boneInverses), sm.bindMatrix)
      sm.material = sm.material.clone(); sm.material.color.offsetHSL(0, 0, (seed - 0.5) * 0.15); sm.castShadow = !!Q.shadow; sm.frustumCulled = false
    }
    const female = outfit.startsWith('Female'), hood = outfit.includes('Ranger')
    const hc = new THREE.Color(HAIR[Math.floor(seed * 97) % HAIR.length]), sc = new THREE.Color(SKIN[Math.floor(seed * 31) % SKIN.length])
    inner.traverse((o) => {
      if (o.userData.hair) { o.material = o.material.clone(); o.material.color.copy(hc); o.visible = !hood && (o.userData.hair === 'cap' || female) }
      if (o.userData.skin) { o.material = o.material.clone(); o.material.color.copy(sc); o.frustumCulled = false }
    })
    inner.scale.setScalar((LIVE_H[hKey] || 0.62) / src.userData.h)
    const o = new THREE.Group(); o.add(inner)
    o.userData.live = { inner, mixer: new THREE.AnimationMixer(inner), clips: src.userData.clips, acts: {}, cur: null, state: '' }
    return o
  }
  function makeLive(key, hKey) {
    const src = custom[key] || LIVE_SRC[key]; if (!src) return null
    const inner = skClone(src); inner.scale.setScalar((LIVE_H[hKey || key] || LIVE_H[key.replace(/\d+$/, '')] || 0.6) / src.userData.h)
    inner.traverse((o) => { if (o.isMesh) { o.castShadow = !!Q.shadow; o.frustumCulled = false } })
    const o = new THREE.Group(); o.add(inner)
    const mixer = new THREE.AnimationMixer(inner), clips = src.userData.clips
    o.userData.live = { inner, mixer, clips, acts: {}, cur: null, state: '' }
    return o
  }
  function liveAnim(o, state, dt) {
    const L = o.userData.live; if (!L) return false
    if (L.state !== state) {
      L.state = state
      let clip = null
      for (const n of CHAIN[state] || [state]) { clip = L.clips.find((c) => PICK[n]?.test(c.name)); if (clip) break }
      if (!clip && state !== 'die') clip = L.clips[0]
      if (clip) {
        const a = L.acts[clip.name] || (L.acts[clip.name] = L.mixer.clipAction(clip))
        if (state === 'die') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true }
        if (a !== L.cur) { a.reset().fadeIn(0.2).play(); L.cur?.fadeOut(0.2); L.cur = a }
      }
    }
    L.mixer.update(dt)
    if (!L.clips.length) L.inner.position.y = /move|walk|run|carry/.test(state) ? Math.abs(Math.sin(performance.now() / 110)) * 0.025 : 0   // animatsiyasiz model — sakrab yuradi
    return true
  }
  function customPiece(k, size) {
    const src = custom[k]; if (!src) return null
    const o = src.clone(true); o.scale.setScalar(src.userData.fit * size * 0.95); return o
  }
  function rebuildBuildings() {
    while (bGroup.children.length) bGroup.remove(bGroup.children[0])
    for (const b of G.W.b) {
      let o = null
      if (!b.building && custom[b.type]) { const s = G.DEFS[b.type].size; o = new THREE.Group(); o.position.set(b.x + (s - 1) / 2, 0, b.y + (s - 1) / 2); o.add(customPiece(b.type, s)) }
      if (!o) o = makeBuilding(b)
      // har bino o'z materialiga ega — kamera yaqinida shaffof qilish uchun
      o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.userData.op = m.material.opacity; m.userData.tr = m.material.transparent } })
      o.position.y = gy(o.position.x, o.position.z); o.userData.b = b; o.userData.fade = 1; bGroup.add(o)
    }
  }
  // Kamera bilan o'yinchi orasidagi yoki kameraga juda yaqin binolar shaffof bo'ladi
  const fadeRay = new THREE.Raycaster()
  function fadeBuildings() {
    const on = camMode !== 'top' && player
    let hits = new Set()
    if (on) {
      const eye = new THREE.Vector3(PL.x, PL.y + 0.45, PL.z), dir = eye.clone().sub(camera.position), len = dir.length(); dir.normalize()
      fadeRay.set(camera.position, dir); fadeRay.far = Math.max(0.1, len - 0.2)
      for (const h of fadeRay.intersectObjects(bGroup.children, true)) { let o = h.object; while (o.parent && o.parent !== bGroup) o = o.parent; hits.add(o) }
    }
    // daraxt va toshlar ham: kameraga juda yaqin bo'lsa shaffof
    for (const o of deco.children) {
      const near = on && Math.hypot(camera.position.x - o.position.x, camera.position.z - o.position.z) < 0.7
      const want = near ? 0.25 : 1, f0 = o.userData.fade ?? 1
      if (Math.abs(f0 - want) < 0.01) continue
      if (!o.userData.own) { o.traverse((m) => { if (m.isMesh) m.material = m.material.clone() }); o.userData.own = true }
      const f = Math.abs(f0 - want) < 0.05 ? want : lerp(f0, want, 0.25); o.userData.fade = f
      o.traverse((m) => { if (m.isMesh) { m.material.transparent = f < 1; m.material.opacity = f; m.material.depthWrite = f >= 1 } })
    }
    for (const g of bGroup.children) {
      const b = g.userData.b, s = G.DEFS[b.type].size
      if (b.type === 'castle' || b.type === 'home') continue
      const near = on && Math.hypot(camera.position.x - g.position.x, camera.position.z - g.position.z) < s * 0.6 + 0.55
      const want = on && (near || hits.has(g)) ? 0.22 : 1
      if (Math.abs(g.userData.fade - want) < 0.01) continue
      g.userData.fade = lerp(g.userData.fade, want, 0.25); if (Math.abs(g.userData.fade - want) < 0.02) g.userData.fade = want
      const f = g.userData.fade
      g.traverse((m) => { if (!m.isMesh) return; m.material.transparent = f < 1 || m.userData.tr; m.material.opacity = (m.userData.op ?? 1) * f; m.material.depthWrite = f >= 1; m.castShadow = f >= 1 && !!Q.shadow })
    }
  }
  function rebuildAll() { buildGround(); buildDeco(); rebuildBuildings(); tilesKey = tkey(); bKey = bkey() }
  const tkey = () => G.W.tiles.map((t) => t.k[0]).join('')
  const bkey = () => G.W.b.map((b) => `${b.type}${b.x},${b.y},${b.lvl},${b.building ? 1 : 0}`).join('|')
  buildGround()

  // Joylashtirish "arvohi"
  const ghostMesh = mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: '#4fd18b', transparent: true, opacity: 0.55 }), 0, 0.03, 0)
  ghostMesh.visible = false; scene.add(ghostMesh)

  // ---------- Personajlar (VRM) ----------
  const vrmLoader = new GLTFLoader(); vrmLoader.register((p) => new VRMLoaderPlugin(p))
  async function loadChar(url, height) {
    const g = await vrmLoader.loadAsync(url)
    const vrm = g.userData.vrm
    VRMUtils.removeUnnecessaryVertices(g.scene); VRMUtils.combineSkeletons?.(g.scene); VRMUtils.rotateVRM0(vrm)
    vrm.scene.traverse((o) => { o.frustumCulled = false; if (o.isMesh) o.castShadow = !!Q.shadow })
    const holder = new THREE.Group(); holder.add(vrm.scene)
    const box = new THREE.Box3().setFromObject(vrm.scene); const k = height / (box.max.y - box.min.y)
    holder.scale.setScalar(k)
    // Soch/kiyim fizikasi: kichraytirilganda to'qnashuv sharlari ham kichrayishi shart, aks holda soch tikka bo'lib qoladi
    const M = vrm.springBoneManager
    if (M) { for (const j of M.joints) j.settings.hitRadius *= k; for (const c of M.colliders) { if (c.shape?.radius != null) c.shape.radius *= k } holder.updateMatrixWorld(true); M.setInitState?.() }
    const mixer = new THREE.AnimationMixer(vrm.scene)
    const ch = { vrm, holder, mixer, acts: {}, pend: {}, cur: null, height }
    ch.play = async (file, { fade = 0.3 } = {}) => {
      if (ch.want === file) return; ch.want = file
      const a = await getAct(ch, file)
      if (!a || ch.want !== file) return
      a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false
      a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (ch.cur && ch.cur !== a) ch.cur.fadeOut(fade); ch.cur = a
    }
    return ch
  }
  // Fayl topilmasa (yuklanmagan bo'lsa) — o'xshash animatsiya bilan almashtiriladi, T-poza bo'lib qolmaydi
  const FALLBACK = { idle2: 'idle', walk2: 'walk', run: 'walk2', jump2: 'jump', attack: 'fight', attack2: 'attack', kick: 'attack', die: 'cry' }
  // Oyoq sirpanmasligi uchun: animatsiya tezligi yurish tezligiga moslanadi (rootSpeed — o'lchab olingan)
  function getAct(ch, file) {
    if (!ch.pend[file]) ch.pend[file] = (async () => {
      let name = file, clip = null
      for (let i = 0; i < 3 && name && !clip; i++) { try { clip = (await loadMixamo(`/anims/${name}.fbx`, ch.vrm, { inPlace: true })).clone() } catch { name = FALLBACK[name] } }
      if (!clip) return null
      const a = ch.mixer.clipAction(clip); ch.acts[file] = a; return a
    })()
    return ch.pend[file]
  }
  // Mixamo klipining tabiiy yurish tezligi (bo'y uzunligiga nisbatan), sirpanishni yo'qotish uchun
  const NATURAL = { walk: 0.87, walk2: 0.87, run: 2.6 }   // o'lchangan: oyoq yerga tekkanda bo'y/sek
  const setSpeed = (ch, file, speed) => { const a = ch.acts[file]; if (a && NATURAL[file]) a.timeScale = Math.max(0.6, Math.min(1.8, speed / (NATURAL[file] * ch.height))) }
  let shino = null
  const SH = { x: 0, z: 0, ry: 0, follow: false }
  loadChar('/models/vampira.vrm', 0.62).then((c) => { shino = c; scene.add(c.holder); SH.x = G.pet.x - 0.5; SH.z = G.pet.y - 0.5; c.play('idle') }).catch(() => {})

  // ================= 4.2 O'YINCHI: Qurbonov (3-shaxs / 1-shaxs) =================
  const PL = { name: store.get('playerName', 'Qurbonov'), x: 9.5, z: 11.5, yaw: Math.PI / 4, pitch: 0.25, vy: 0, y: 0, hp: 100, maxHp: 100, dead: 0, combo: 0, busyUntil: 0, hitAt: 0, hitDone: true, hurtT: 0 }
  const hb = G.W.b.find((b) => b.type === 'castle') || G.W.b.find((b) => b.type === 'house')
  const spawnAt = () => { if (OL) { PL.x = OL.spawn[0]; PL.z = OL.spawn[1]; return } const c = G.W.b.find((b) => b.type === 'castle'); if (c) { const s = G.DEFS.castle.size; PL.x = c.x + (s - 1) / 2; PL.z = c.y + (s - 1) / 2 + 2.6 } else if (hb) { PL.x = hb.x; PL.z = hb.y + 1.2 } }
  spawnAt()
  Object.assign(PL, store.get('player3d', {}), { hp: 100, dead: 0, vy: 0, y: 0 })
  let camMode = store.get('camMode', 'top')   // top | third | first
  let player = null, sword = null
  loadChar('/models/player.vrm', 0.7).then((c) => {
    player = c; scene.add(c.holder); c.play('idle2')
    try { c.vrm.firstPerson?.setup() } catch { /* */ }
    // qilich: o'ng qo'lga ulanadi
    sword = new THREE.Group()
    const blade = mesh(new THREE.BoxGeometry(0.025, 0.55, 0.008), mat('#dfe6ef', { metalness: 0.35, roughness: 0.3, emissive: '#2a3038' }), 0, 0.33, 0)
    const guard = mesh(new THREE.BoxGeometry(0.12, 0.02, 0.03), mat('#d9b13b', { metalness: 0.6 }), 0, 0.05, 0)
    const grip = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.1, 6), mat('#3a2418'), 0, 0, 0)
    sword.add(blade, guard, grip)
    const hand = c.vrm.humanoid.getRawBoneNode('rightHand')
    if (hand) {
      // Dam olish holatida (T-poza) hisoblaymiz: tig' oldinga qaraydi, dasta kaft ichida
      c.holder.updateMatrixWorld(true)
      const qh = hand.getWorldQuaternion(new THREE.Quaternion()), qH = c.holder.getWorldQuaternion(new THREE.Quaternion())
      const want = qH.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
      const hp = hand.getWorldPosition(new THREE.Vector3()), mid = c.vrm.humanoid.getRawBoneNode('rightMiddleProximal')
      const grip = mid ? hp.clone().lerp(mid.getWorldPosition(new THREE.Vector3()), 0.7) : hp
      const ws = hand.getWorldScale(new THREE.Vector3()).x
      hand.add(sword); sword.position.copy(hand.worldToLocal(grip.clone()))
      sword.quaternion.copy(qh.invert().multiply(want)); sword.scale.setScalar(0.72 / ws)
    }
    sword.visible = camMode !== 'top'
    applyCamLayers()
  }).catch(() => {})
  function applyCamLayers() {
    if (!player?.vrm.firstPerson) return
    const fp = player.vrm.firstPerson
    camera.layers.set(0)
    if (camMode === 'first') { camera.layers.enable(fp.firstPersonOnlyLayer) } else { camera.layers.enable(fp.thirdPersonOnlyLayer) }
  }
  // Qasr ichi: devorlar qattiq, hovli va (ochiq) darvoza orqali o'tish mumkin
  let gateOpen = 0
  // Qasr (4×4): devor chizig'i markazdan 4 m (=1.64), minoralar burchakda, orqada asosiy bino
  const CE = 4 * VK
  const castleC = (b) => { const s = G.DEFS.castle.size; return { x: b.x + (s - 1) / 2, z: b.y + (s - 1) / 2 } }
  function castleSolid(b, x, z) {
    const c = castleC(b), lx = x - c.x, lz = z - c.z, ax = Math.abs(lx), az = Math.abs(lz)
    if (V?.CK) {   // Castle Kit qasri: 4×4 katak, chetdagi qator — devor/minora, orqa qator — asosiy bino, oldda hovli
      if (ax > 2.05 || az > 2.05) return null
      if (ax > 0.92 || az > 0.92) return !(lz > 0.9 && ax < 0.3 && gateOpen > 0.6)
      return lz < 0.02
    }
    if (ax > CE + 0.45 || az > CE + 0.45) return null   // qasr tashqarisi
    if (ax > CE - 1 * VK - 0.08 && az > CE - 1 * VK - 0.08) return true   // burchak minoralari
    if (ax < 2 * VK + 0.1 && lz > -2.5 * VK - 0.1 && lz < -0.5 * VK + 0.1) return true   // asosiy bino
    const inWall = (v) => v > CE - 0.5 * VK - 0.1 && v < CE + 0.2 * VK + 0.08
    if (inWall(az) && ax < CE) { if (lz > 0 && ax < 0.85 * VK && gateOpen > 0.6) return false; return true }   // old/orqa devor (darvoza o'rtada)
    if (inWall(ax) && az < CE) return true
    return false
  }
  function solidAt(x, z) {
    if (OL) return OL.solid(x, z)
    const gx = Math.round(x), gz = Math.round(z)
    if (gx < 0 || gz < 0 || gx >= N || gz >= N) return outsideSolid(x, z)
    const k = G.W.tiles[gz * N + gx].k
    if (k === 'water' || k === 'tree' || k === 'rock') return true
    for (const b of G.W.b) {
      if (b.type === 'farm') continue
      if (b.type === 'castle' && !b.building) { const r = castleSolid(b, x, z); if (r !== null) { if (r) return true; continue } }
      const s = G.DEFS[b.type].size
      if (gx >= b.x && gx < b.x + s && gz >= b.y && gz < b.y + s) return true
    }
    return false
  }
  // Shahar tashqarisi: devor (faqat darvozadan o'tiladi), suv, tik qoyalar, daraxtlar
  function outsideSolid(x, z) {
    if (!land || !V?.CK) return true
    const C = (N - 1) / 2; if (Math.hypot(x - C, z - C) > WORLD_R - 5) return true
    const o = land.outside(x, z)
    if (o < 1.02) {   // devor qatori
      for (const g of G.cityGates()) { const along = g.dx ? Math.abs(z - g.y) : Math.abs(x - g.x); const across = g.dx ? Math.abs(x - g.x) : Math.abs(z - g.y); if (along < 0.3 && across < 0.6) return false }
      return true
    }
    const h = gy(x, z); if (h < WATER_Y + 0.05) return true
    if (Math.abs(gy(x + 0.2, z) - gy(x - 0.2, z)) + Math.abs(gy(x, z + 0.2) - gy(x, z - 0.2)) > 0.55) return true   // juda tik
    for (const [hx, hz] of outsideHouses) if (Math.abs(hx - x) < 0.55 && Math.abs(hz - z) < 0.55) return true
    const t = outsideTrees.get(Math.floor(x) + ',' + Math.floor(z)) || []
    for (const [tx, tz] of t) if (Math.hypot(tx - x, tz - z) < 0.22) return true
    return false
  }
  const walkable = (x, z) => !solidAt(x, z)
  const walkableOld = (x, z) => {
    const gx = Math.round(x), gz = Math.round(z)
    if (gx < 0 || gz < 0 || gx >= N || gz >= N) return false
    const t = G.W.tiles[gz * N + gx]
    if (t.k === 'water' || t.k === 'tree' || t.k === 'rock') return false
    return !G.W.b.some((b) => { const s = G.DEFS[b.type].size; return gx >= b.x && gx < b.x + s && gz >= b.y && gz < b.y + s && b.type !== 'farm' })
  }
  // Boshqaruv: klaviatura + telefon joystigi
  const keys = {}
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input,textarea')) return
    keys[e.code] = true
    if (camMode === 'top') return
    if (e.code === 'Space') { e.preventDefault(); jump() }
    if (e.code === 'KeyF' || e.code === 'KeyJ' || e.code === 'Enter') attack()
  })
  addEventListener('keyup', (e) => { keys[e.code] = false })
  const joy = { x: 0, y: 0, id: null }
  function jump() { if (PL.dead || PL.y > 0.01) return; PL.vy = 3.2; player?.play('jump2', { fade: 0.15 }); PL.busyUntil = performance.now() + 700 }
  const COMBO = ['attack', 'attack2', 'kick']
  function attack() {
    if (!player || PL.dead) return
    const now = performance.now()
    if (now < PL.busyUntil - 250) return
    const f = COMBO[PL.combo % 3]; PL.combo++
    const a = player.acts[f]
    // sichqoncha bilan qaralayotgan bo'lsa — qaragan tomonga uradi
    if (camMode === 'third' && locked()) player.holder.rotation.y = PL.yaw + Math.PI
    playOnce(player, f)
    const dur = (a?.getClip().duration || 1.1) * 1000
    PL.busyUntil = now + Math.min(dur, 1300); PL.hitAt = now + Math.min(dur * 0.45, 500); PL.hitDone = false
    clearTimeout(PL.comboT); PL.comboT = setTimeout(() => { PL.combo = 0 }, 1800)
  }
  async function playOnce(ch, file) {
    const a = await getAct(ch, file); if (!a) return
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 1
    a.reset().setEffectiveWeight(1).fadeIn(0.12).play(); if (ch.cur && ch.cur !== a) ch.cur.fadeOut(0.12); ch.cur = a; ch.want = file
  }
  const DMG = []
  // ---------- Uy: eshik oldida E — kirish, ichida uxlash ----------
  const homeB = () => G.W.b.find((b) => b.type === 'home' && !b.building)
  const doorOf = (b) => { const o = bGroup.children.find((g) => g.userData.b === b), d = o?.userData.door; return d ? { x: b.x + 0.5 + d.x * VK, z: b.y + 0.5 + d.z * VK + 0.3 } : { x: b.x + 0.5, z: b.y + 1.65 } }
  const hp = document.createElement('div'); hp.className = 'pl-house'; document.body.appendChild(hp)
  const room = document.createElement('div'); room.className = 'pl-room'; room.hidden = true
  room.innerHTML = `<div class="box"><h2>Qurbonov uyi</h2><p class="rt">Uydasiz. Bu yerda xavfsiz — maxluqlar kira olmaydi.</p>
    <div class="row"><button class="btn pri" data-r="sleep">Uxlash</button><button class="btn" data-r="out">Chiqish</button></div></div><div class="zz">Z z z…</div>`
  document.body.appendChild(room)
  function enterHouse() {
    const b = homeB(); if (!b || PL.dead) return
    PL.inside = true; room.hidden = false; room.classList.remove('sleeping'); hp.classList.remove('on')
    if (locked()) document.exitPointerLock?.()
    room.querySelector('.rt').textContent = G.isNight() ? "Kech bo'ldi. Uxlab olsangiz tong otadi, joningiz to'ladi." : "Uydasiz. Dam olsangiz joningiz to'ladi."
  }
  function leaveHouse() {
    const b = homeB(); PL.inside = false; room.hidden = true
    if (b) { const d = doorOf(b); PL.x = d.x; PL.z = d.z + 0.25 }
    player && (player.holder.rotation.y = 0)
  }
  function sleep() {
    room.classList.add('sleeping'); const night = G.isNight()
    setTimeout(() => {
      PL.hp = PL.maxHp
      if (night) G.skipNight?.()
      room.classList.remove('sleeping')
      room.querySelector('.rt').textContent = night ? 'Tong otdi! Yaxshi dam oldingiz.' : "Yaxshi dam oldingiz. Joningiz to'ldi."
      if (night) G.bubbleSay?.('Xayrli tong! Yaxshi uxladingizmi?')
    }, 3500)
  }
  room.addEventListener('click', (e) => { const r = e.target.closest('[data-r]')?.dataset.r; if (r === 'sleep') sleep(); if (r === 'out') leaveHouse() })
  hp.addEventListener('click', () => enterHouse())
  addEventListener('keydown', (e) => {
    if (camMode === 'top' || e.code !== 'KeyE') return
    if (PL.inside) leaveHouse(); else if (hp.classList.contains('on')) enterHouse()
  })
  function houseTick() {
    const b = homeB(), show = b && camMode !== 'top' && !PL.inside && !PL.dead && (() => { const d = doorOf(b); return Math.hypot(PL.x - d.x, PL.z - d.z) < 0.7 })()
    if (show && !hp.classList.contains('on')) hp.innerHTML = matchMedia('(pointer: coarse)').matches ? '🏠 Uyga kirish' : '<b>E</b> — uyga kirish'
    hp.classList.toggle('on', !!show)
  }
  function doHit() {
    const raid = G.raid; if (!raid) return
    const ry = player.holder.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry)   // personaj qaragan tomon
    let hit = 0
    for (const m of raid.mons) {
      if (m.hp <= 0) continue
      const dx = m.x - 0.5 - PL.x, dz = m.y - 0.5 - PL.z, d = Math.hypot(dx, dz)
      if (d < 1.05 && (d < 0.45 || (dx * fx + dz * fz) / (d || 1) > -0.1)) {
        const dmg = 8 + (G.W.lvl || 1) * 2 + (PL.combo % 3 === 0 ? 6 : 0); m.hp -= dmg; m.hit = performance.now(); hit++
        DMG.push({ x: m.x - 0.5, z: m.y - 0.5, y: m.type === 'troll' ? 0.9 : 0.55, t: performance.now(), txt: '-' + dmg })
        if (m.hp <= 0) { G.W.stats.kills = (G.W.stats.kills || 0) }
      }
    }
    if (hit) { G.W.stats.taps = (G.W.stats.taps || 0) + hit }
  }
  function playerTick(dt, time) {
    if (!player) return
    const now = performance.now()
    if (!PL.checked) { PL.checked = true; if (solidAt(PL.x, PL.z)) spawnAt() }   // devor ichida qolib ketmasin
    houseTick()
    if (PL.inside) { player.holder.visible = false; player.mixer.update(dt); return }
    player.holder.visible = true
    let mx = 0, mz = 0
    if (camMode !== 'top' && !PL.dead) {
      const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + (-joy.y)
      const r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x
      // kamera yo'nalishiga nisbatan
      const cy = camMode === 'first' ? PL.yaw : PL.yaw
      const fwx = -Math.sin(cy), fwz = -Math.cos(cy), rtx = Math.cos(cy), rtz = -Math.sin(cy)
      mx = fwx * f + rtx * r; mz = fwz * f + rtz * r
      const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len }
    }
    const moving = Math.hypot(mx, mz) > 0.1
    const running = moving && (keys.ShiftLeft || keys.ShiftRight || Math.hypot(joy.x, joy.y) > 0.85)
    const speed = running ? 1.7 : 0.75, sp = speed * dt
    if (moving && now > PL.busyUntil - 300) {
      const nx = PL.x + mx * sp, nz = PL.z + mz * sp
      if (walkable(nx, PL.z) && !blocked(nx, PL.z)) PL.x = nx
      if (walkable(PL.x, nz) && !blocked(PL.x, nz)) PL.z = nz
      if (camMode === 'third') player.holder.rotation.y = lerpAngle(player.holder.rotation.y, Math.atan2(mx, mz), 0.25)
    }
    if (camMode === 'first') player.holder.rotation.y = PL.yaw + Math.PI
    // sakrash fizikasi
    PL.vy -= 9 * dt; PL.y = Math.max(0, PL.y + PL.vy * dt); if (PL.y === 0) PL.vy = Math.max(0, PL.vy)
    player.holder.position.set(PL.x, PL.y + gy(PL.x, PL.z), PL.z)
    // zarba vaqti
    if (!PL.hitDone && now >= PL.hitAt) { PL.hitDone = true; doHit() }
    // maxluqlar o'yinchiga hujum qiladi
    const raid = G.raid
    if (raid && !raid.done && camMode !== 'top' && !PL.dead) {
      for (const m of raid.mons) {
        if (m.hp <= 0) continue
        const d = Math.hypot(m.x - 0.5 - PL.x, m.y - 0.5 - PL.z)
        if (d < 3) { m.tx = PL.x + 0.5; m.ty = PL.z + 0.5; m.arrived = false }
        if (d < 0.55 && now - (m.bite || 0) > 900) { m.bite = now; PL.hp -= G.MON[m.type].atk * 2; PL.hurtT = now }
      }
      if (PL.hp <= 0) { PL.dead = now; playOnce(player, 'die') }
    }
    if (PL.dead && now - PL.dead > 3500) { PL.dead = 0; PL.hp = PL.maxHp; spawnAt(); player.want = null }
    if (!raid && PL.hp < PL.maxHp) PL.hp = Math.min(PL.maxHp, PL.hp + 8 * dt)
    // animatsiya
    if (!PL.dead && now > PL.busyUntil) { const f = moving ? (running ? 'run' : 'walk2') : 'idle2'; player.play(f, { fade: 0.2 }); if (moving) setSpeed(player, f, speed) }
    player.mixer.update(dt); player.vrm.update(Math.min(dt, 1 / 30))
    if (sword) sword.visible = camMode !== 'top'
    if (time % 3000 < 20) store.set('player3d', { x: PL.x, z: PL.z, yaw: PL.yaw })
  }
  const camRay = new THREE.Raycaster()
  function cameraFor() {
    if (camMode === 'top' || !player) return false
    if (camMode === 'third') {
      const eye = new THREE.Vector3(PL.x, PL.y + gy(PL.x, PL.z) + 0.58, PL.z)
      const dir = new THREE.Vector3(Math.sin(PL.yaw) * Math.cos(PL.pitch), Math.sin(PL.pitch) + 0.15, Math.cos(PL.yaw) * Math.cos(PL.pitch)).normalize()
      let d = PL.camD || 2.2
      // devor yoki bino orqasida qolmasin — kamerani yaqinlashtiramiz
      camRay.set(eye, dir); camRay.far = d
      const solidB = bGroup.children.filter((o) => o.userData.b?.type === 'castle' || o.userData.b?.type === 'home')
      const decoSolid = deco.children.filter((o) => !o.isInstancedMesh && !(o.isGroup && o.children[0]?.isInstancedMesh))
      const hit = camRay.intersectObjects([...decoSolid, ...solidB], true).find((h) => Number.isFinite(h.distance))   // qasr va uy devori orqasiga o'tmaydi — kamera yaqinlashadi; boshqa binolar shaffof bo'ladi
      if (hit) d = Math.max(0.6, hit.distance - 0.15)
      if (!Number.isFinite(d)) d = 2.2
      camera.position.copy(eye).addScaledVector(dir, d)
      camera.lookAt(eye)
    } else {
      const head = player.vrm.humanoid.getRawBoneNode('head'); const p = new THREE.Vector3(); head?.getWorldPosition(p)
      camera.position.set(p.x - Math.sin(PL.yaw) * 0.06, p.y + 0.02, p.z - Math.cos(PL.yaw) * 0.06)
      camera.lookAt(camera.position.x - Math.sin(PL.yaw) * 2, camera.position.y - PL.pitch * 2, camera.position.z - Math.cos(PL.yaw) * 2)
    }
    sun.position.set(PL.x + 14, 26, PL.z + 6); sun.target.position.set(PL.x, 0, PL.z)
    return true
  }
  // Kamera rejimi tugmasi va telefon boshqaruvi
  const ui = document.createElement('div'); ui.className = 'pl-ui'
  ui.innerHTML = `<button class="cam-btn" title="Kamera"><svg viewBox="0 0 24 24"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg><span></span></button>
    <div class="joy"><i></i></div><div class="acts"><button data-a="atk">⚔</button><button data-a="jmp">⤒</button></div>`
  document.body.appendChild(ui)
  const css = document.createElement('style'); css.textContent = `
  .pl-ui .cam-btn{position:fixed;top:58px;right:10px;z-index:6;height:40px;padding:0 12px;border-radius:12px;background:rgba(16,18,24,.94);border:1px solid #2a2f3a;color:#ece8e1;display:flex;align-items:center;gap:6px;font-weight:700;font-size:12.5px}
  .pl-ui .cam-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
  .pl-ui .joy{position:fixed;left:20px;bottom:90px;width:120px;height:120px;border-radius:50%;background:rgba(16,18,24,.35);border:2px solid rgba(255,255,255,.25);z-index:6;display:none;touch-action:none}
  .pl-ui .joy i{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px;border-radius:50%;background:rgba(255,255,255,.7)}
  .pl-ui .acts{position:fixed;right:20px;bottom:90px;display:none;gap:12px;z-index:6;flex-direction:column}
  .pl-ui .acts button{width:64px;height:64px;border-radius:50%;background:rgba(16,18,24,.6);border:2px solid rgba(255,255,255,.35);color:#fff;font-size:26px}
  .pl-ui .acts button[data-a=atk]{background:rgba(226,48,75,.75)}
  body.pl-mode .rot{display:none} body.pl-mode .pl-ui .acts{display:flex} body.pl-mode.touch .pl-ui .joy{display:block}
  .pl-help{position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:6;background:rgba(16,18,24,.85);border:1px solid #2a2f3a;border-radius:10px;padding:6px 12px;font-size:12px;color:#cfcac2}`
  document.head.appendChild(css)
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch')
  const camBtn = ui.querySelector('.cam-btn'), help = document.createElement('div'); help.className = 'pl-help'
  const LBL = { top: 'Tepadan', third: '3-shaxs', first: '1-shaxs' }
  function setCam(m) {
    camMode = m; store.set('camMode', m); camBtn.querySelector('span').textContent = LBL[m]
    document.body.classList.toggle('pl-mode', m !== 'top')
    help.innerHTML = matchMedia('(pointer: coarse)').matches ? 'Joystik — yurish, ⚔ — urish, ⤒ — sakrash, ekranni suring — qarash' : '<b>Ekranni bir marta bosing</b> — sichqoncha bilan qarash yoqiladi.<br>WASD — yurish · Shift — yugurish · Probel — sakrash<br>Chap tugma — qilich · O‘ng tugma — tepish · G‘ildirak — yaqin/uzoq · Esc — sichqonchani bo‘shatish'
    if (m === 'top') { help.remove(); if (locked()) document.exitPointerLock?.() } else { document.body.appendChild(help); clearTimeout(help.t); help.t = setTimeout(() => help.remove(), 9000) }
    applyCamLayers()
  }
  camBtn.onclick = () => setCam({ top: 'third', third: 'first', first: 'top' }[camMode])
  // ---------- Sichqoncha bilan boshqarish (PUBG kabi): qarash — sichqoncha, chap tugma — qilich, o'ng — tepish ----------
  const cvTop = document.getElementById('cv')
  function locked() { return document.pointerLockElement === cvTop }
  const xh = document.createElement('div'); xh.className = 'xhair'; document.body.appendChild(xh)
  document.addEventListener('pointerlockchange', () => { document.body.classList.toggle('locked', locked()); if (locked()) help.remove() })
  document.addEventListener('mousemove', (e) => {
    if (!locked() || camMode === 'top') return
    PL.yaw -= e.movementX * 0.0026
    PL.pitch = Math.max(-0.6, Math.min(0.9, PL.pitch + e.movementY * 0.002))
  })
  cvTop.addEventListener('contextmenu', (e) => { if (camMode !== 'top') e.preventDefault() })
  function mouseClick(e) {
    if (camMode === 'top' || !player) return false
    if (!locked() && cvTop.requestPointerLock) { try { const r = cvTop.requestPointerLock(); r?.catch?.(() => {}) } catch { /* */ } }
    if (e.button === 2) kick(); else attack()
    return true
  }
  function kick() {
    if (!player || PL.dead) return
    const now = performance.now(); if (now < PL.busyUntil - 250) return
    if (camMode === 'third' && locked()) player.holder.rotation.y = PL.yaw + Math.PI
    playOnce(player, 'kick'); PL.busyUntil = now + 1000; PL.hitAt = now + 420; PL.hitDone = false
  }
  css.textContent += `.pl-house{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);background:rgba(16,18,24,.92);border:1px solid #f4b544;color:#fff;border-radius:12px;padding:10px 16px;font:700 14px Manrope,sans-serif;z-index:7;display:none;cursor:pointer}
  .pl-house.on{display:block} .pl-house b{background:#f4b544;color:#1a1206;border-radius:6px;padding:1px 7px;margin-right:4px}
  .pl-room{position:fixed;inset:0;z-index:12;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(90,60,30,.85),rgba(12,10,8,.96))}
  .pl-room[hidden]{display:none} .pl-room .box{background:#1a1510;border:1px solid #5a4630;border-radius:18px;padding:22px;width:min(380px,92vw);text-align:center;color:#ece8e1}
  .pl-room h2{font-size:19px;margin-bottom:8px} .pl-room p{color:#c9bca8;font-size:14px;line-height:1.5;margin-bottom:14px} .pl-room .row{display:flex;gap:10px;justify-content:center}
  .pl-room .btn{height:42px;padding:0 18px;border-radius:11px;background:#2a2219;border:1px solid #5a4630;color:#fff;font:700 14px Manrope,sans-serif;cursor:pointer} .pl-room .btn.pri{background:#f4b544;color:#1a1206;border:0}
  .pl-room .zz{display:none;font:800 34px Manrope,sans-serif;color:#c9c2ff;letter-spacing:6px;animation:zz 1.2s ease-in-out infinite alternate}
  .pl-room.sleeping{background:#05060c;transition:background 1s} .pl-room.sleeping .box{display:none} .pl-room.sleeping .zz{display:block}
  @keyframes zz{from{opacity:.3;transform:translateY(6px)}to{opacity:1;transform:translateY(-6px)}}
  .xhair{position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.45);z-index:6;display:none;pointer-events:none}
  body.locked.pl-mode .xhair{display:block} .pl-help b{color:#f4b544}`
  setCam(camMode)
  ui.querySelector('[data-a=atk]').addEventListener('pointerdown', (e) => { e.preventDefault(); attack() })
  ui.querySelector('[data-a=jmp]').addEventListener('pointerdown', (e) => { e.preventDefault(); jump() })
  const joyEl = ui.querySelector('.joy'), knob = joyEl.querySelector('i')
  const joyMove = (e) => { const r = joyEl.getBoundingClientRect(); let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l } joy.x = dx; joy.y = dy; knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)` }
  joyEl.addEventListener('pointerdown', (e) => { joyEl.setPointerCapture(e.pointerId); joy.id = e.pointerId; joyMove(e) })
  joyEl.addEventListener('pointermove', (e) => { if (joy.id === e.pointerId) joyMove(e) })
  const joyEnd = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = '' }
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd)

  // ---------- Qo'shin, maxluqlar, aholi va hayvonlar (creatures.js) ----------
  const unitGroup = new THREE.Group(); scene.add(unitGroup)
  function makeUnit(u, i = 0) { const k = liveKey(u, 'soldier'); return (k && makeLive(k, u)) || makePerson(i % 3 === 2 ? 'Female_Ranger' : 'Male_Ranger', u, (i * 0.37) % 1) || makeHumanoid({ ...SOLDIER[u], s: 1.25 }) }
  let unitKey = ''
  function syncUnits() {
    const a = G.W.army, k = `${a.soldier},${a.archer},${a.knight},${G.castleLvl()}`
    if (k === unitKey) return; unitKey = k
    while (unitGroup.children.length) unitGroup.remove(unitGroup.children[0])
    const c = G.W.b.find((b) => b.type === 'castle' && !b.building); if (!c) return
    let i = 0
    for (const u of ['knight', 'soldier', 'archer']) for (let n = 0; n < Math.min(a[u], 8); n++, i++) {
      const o = makeUnit(u, i); const row = Math.floor(i / 4), col = i % 4
      o.position.set(c.x + G.DEFS.castle.size + 0.5 + row * 0.32, 0, c.y + 0.6 + col * 0.3); o.rotation.y = Math.PI / 2; o.userData.i = i; o.userData.u = u; o.userData.home = o.position.clone(); unitGroup.add(o)
    }
  }
  const monGroup = new THREE.Group(); scene.add(monGroup)
  const monMeshes = new Map(), dying = []
  const MSCALE = { bat: 1.6, wolf: 1.5, goblin: 1.4, troll: 1.25 }
  function makeMonster(m) {
    // siz yasagan dushman modeli bo'lsa — o'sha (enemy, enemy2, enemy3… navbat bilan ko'paytiriladi)
    const en = enemyKeys(), k = liveKey(m.type) || (en.length ? en[(G.raid?.mons.indexOf(m) || 0) % en.length] : null)
    const L = k && makeLive(k, custom[m.type] ? m.type : m.type === 'troll' ? 'troll' : 'enemy')
    if (L) { L.userData.seed = Math.random() * 10; return L }
    // Quaternius maxluqlari: har hujumda har xil
    const set = MSET[m.type] || MSET.goblin
    if (set?.length) {
      if (m.skin == null) m.skin = Math.floor(Math.random() * set.length)
      const id = set[m.skin % set.length], q = makeLive(id, m.type === 'bat' ? 'flyer' : m.type)
      if (q) { q.userData.seed = Math.random() * 10; if (m.type === 'bat') q.userData.live.inner.position.y = 0.45; return q }
    }
    const o = makeMonster3D(m.type); o.scale.setScalar(MSCALE[m.type] || 1.3); o.userData.seed = Math.random() * 10; return o
  }

  // --- yo'l topish: daryodan faqat ko'prik orqali o'tadi ---
  const bridge = (() => { const t = G.W.tiles.map((t, i) => (t.k === 'bridge' ? i : -1)).filter((i) => i >= 0); if (!t.length) return null; const xs = t.map((i) => i % N), y = Math.floor(t[0] / N); return { x0: Math.min(...xs) - 1, x1: Math.max(...xs) + 1, y } })()
  const riverX = (z) => { const row = Math.max(0, Math.min(N - 1, Math.round(z))); for (let x = 0; x < N; x++) { const k = G.W.tiles[row * N + x].k; if (k === 'water' || k === 'bridge') return x } return N + 5 }
  const side = (x, z) => (x < riverX(z) ? 0 : 1)
  function route(x0, z0, x1, z1) {
    if (!bridge || side(x0, z0) === side(x1, z1)) return [[x1, z1]]
    return side(x0, z0) === 0 ? [[bridge.x0, bridge.y], [bridge.x1, bridge.y], [x1, z1]] : [[bridge.x1, bridge.y], [bridge.x0, bridge.y], [x1, z1]]
  }
const freeTile = (x, z) => !solidAt(x, z)
  function frontOf(b) {
    const s = G.DEFS[b.type].size, cx = b.x + (s - 1) / 2, cz = b.y + (s - 1) / 2
    const cand = [[cx + s / 2 + 0.25, cz], [cx, cz + s / 2 + 0.25], [cx - s / 2 - 0.25, cz], [cx, cz - s / 2 - 0.25], [cx + s / 2 + 0.25, cz + s / 2 + 0.25]]
    if (b.type === 'farm') return [cx + (Math.random() - 0.5) * 0.6, cz + (Math.random() - 0.5) * 0.6]
    return cand.find(([x, z]) => freeTile(x, z)) || cand[0]
  }

  // --- Aholi: dehqon, o'tinchi, konchi, savdogar, qishloq ahli ---
  const folkGroup = new THREE.Group(); scene.add(folkGroup)
  const folk = []
  let folkKey = ''
  const JOB = { farm: 'farmer', lumber: 'lumber', mine: 'miner', market: 'merchant' }
  const LOAD = { farmer: 'food', lumber: 'wood', miner: 'stone', merchant: 'gold' }
  const maxFolk = GFX.q === 'low' ? 8 : GFX.q === 'med' ? 18 : 26
  function syncFolk() {
    const k = G.W.b.filter((b) => !b.building).map((b) => b.type + b.x + b.y).join('|')
    if (k === folkKey) return; folkKey = k
    while (folkGroup.children.length) folkGroup.remove(folkGroup.children[0]); folk.length = 0
    const homeB = G.W.b.find((b) => b.type === 'castle' && !b.building) || G.W.b.find((b) => b.type === 'house' && !b.building)
    if (!homeB) return
    const list = []
    const cnt = {}
    for (const b of G.W.b) { if (b.building || !JOB[b.type]) continue; cnt[b.type] = (cnt[b.type] || 0) + 1; if (cnt[b.type] <= (b.type === 'market' ? 1 : 3)) list.push({ job: JOB[b.type], work: b }) }
    const extra = 1 + G.castleLvl() + (G.W.b.some((b) => b.type === 'fountain') ? 1 : 0)
    for (let i = 0; i < extra; i++) list.push({ job: i % 2 ? 'girl' : 'villager', work: null })
    // har aholi uyidan bittadan odam (uyiga qaytadi)
    G.W.b.filter((b) => b.type === 'cottage' && !b.building).forEach((b, i) => list.push({ job: i % 2 ? 'girl' : 'villager', work: null, home: b }))
    for (const it of list.slice(0, maxFolk)) {
      const lk = liveKey('villager-' + it.job, 'villager'), fem = it.job === 'girl' || it.job === 'merchant' || Math.random() < 0.35
      const h = (lk && makeLive(lk, 'villager')) || makePerson(fem ? 'Female_Peasant' : 'Male_Peasant', 'villager') || makeHumanoid({ ...VILLAGER[it.job], s: 1.1 })
      const hm = it.home || homeB, [x, z] = frontOf(hm)
      h.position.set(x + (Math.random() - 0.5) * 0.4, 0, z + (Math.random() - 0.5) * 0.4)
      folkGroup.add(h)
      folk.push({ h, job: it.job, work: it.work, home: hm, state: 'idle', t: Math.random() * 3, path: [], act: 'idle', seed: Math.random() * 10 })
    }
  }
  const sLoad = (h, k) => { if (!h.userData.live) setLoad(h, k) }
  function goTo(f, x, z) { f.path = route(f.h.position.x, f.h.position.z, x, z) }
  function folkTick(dt, time) {
    const raid = G.raid && !G.raid.done, night = G.isNight()
    for (const f of folk) {
      const h = f.h
      // hujumda yoki kechasi — uyga qochib, yashirinadi
      if ((raid || night) && f.state !== 'hide' && f.state !== 'flee') { const [x, z] = frontOf(f.home); goTo(f, x, z); f.state = 'flee'; sLoad(h, null) }
      if (!raid && !night && f.state === 'hide') { h.visible = true; f.state = 'idle'; f.t = 1 + Math.random() * 3 }
      if (f.path.length) {
        const [tx, tz] = f.path[0], dx = tx - h.position.x, dz = tz - h.position.z, d = Math.hypot(dx, dz)
        const sp = (f.state === 'flee' ? 1.7 : 0.75) * dt
        if (d < 0.05) f.path.shift()
        else { h.position.x += dx / d * Math.min(d, sp); h.position.z += dz / d * Math.min(d, sp); h.rotation.y = lerpAngle(h.rotation.y, Math.atan2(dx, dz), 0.2) }
        f.act = f.state === 'flee' ? 'run' : f.state === 'carry' ? 'carry' : 'walk'
        if (!f.path.length) { // yetib keldi
          if (f.state === 'flee') { f.state = 'hide'; h.visible = false }
          else if (f.state === 'toWork') { f.state = 'work'; f.t = 5 + Math.random() * 5; if (f.work) { const s = G.DEFS[f.work.type].size; h.rotation.y = Math.atan2(f.work.x + (s - 1) / 2 - h.position.x, f.work.y + (s - 1) / 2 - h.position.z) } }
          else if (f.state === 'carry') { sLoad(h, null); f.state = 'idle'; f.t = 1.2; if (Math.random() < 0.5) { const p = G.iso(h.position.x, h.position.z); void p } }
          else { f.state = 'idle'; f.t = 2 + Math.random() * 4 }
        }
      } else if (f.state !== 'hide') {
        f.t -= dt
        f.act = f.state === 'work' ? (f.job === 'merchant' ? 'idle' : 'work') : 'idle'
        if (f.t <= 0) {
          if (f.state === 'work') { sLoad(h, LOAD[f.job]); f.state = 'carry'; const [x, z] = frontOf(f.home); goTo(f, x, z) }
          else if (f.work && G.W.b.includes(f.work)) { f.state = 'toWork'; const [x, z] = frontOf(f.work); goTo(f, x, z) }
          else { // qishloq ahli: binolar orasida sayr
            const opts = G.W.b.filter((b) => !b.building); const b = opts[Math.floor(Math.random() * opts.length)]
            f.state = 'walk'; if (b) { const [x, z] = frontOf(b); goTo(f, x + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5) } else f.t = 3
          }
        }
      }
      const fst = f.act === 'work' && (f.job === 'lumber' || f.job === 'miner') ? 'attack' : f.act
      if (h.visible && !liveAnim(h, fst, dt)) animateHumanoid(h, time / 1000 + f.seed, f.act)
    }
  }

  // --- Hayvonlar: fermada qo'y va tovuqlar, o'rmonda quyon va kiyiklar ---
  const animalGroup = new THREE.Group(); scene.add(animalGroup)
  const animals = []
  let animalKey = ''
  function syncAnimals() {
    const farms = G.W.b.filter((b) => b.type === 'farm' && !b.building).slice(0, 3)
    const k = farms.map((b) => b.x + ',' + b.y).join('|') + tilesKey.length
    if (k === animalKey) return; animalKey = k
    while (animalGroup.children.length) animalGroup.remove(animalGroup.children[0]); animals.length = 0
    const add = (type, cx, cz, r) => {
      let o = (custom[type] && makeLive(type)) || (type === 'chicken' && LIVE_SRC.Blob_Chicken && makeLive('Blob_Chicken', 'chicken'))
      if (o) o.userData.speed = { sheep: 0.25, chicken: 0.35, rabbit: 0.6, deer: 0.5 }[type] || 0.3, o.userData.type = type
      else { o = makeAnimal(type); o.scale.setScalar(type === 'deer' ? 1.3 : 1.4) }
      for (let i = 0; i < 10; i++) { const x = cx + (Math.random() - 0.5) * r * 2, z = cz + (Math.random() - 0.5) * r * 2; if (freeTile(x, z)) { o.position.set(x, 0, z); break } }
      if (!o.position.x && !o.position.z) return
      animalGroup.add(o); animals.push({ o, cx, cz, r, tx: o.position.x, tz: o.position.z, t: Math.random() * 4, seed: Math.random() * 10 })
    }
    const per = GFX.q === 'low' ? 1 : 2
    for (const f of farms) { for (let i = 0; i < per; i++) add('sheep', f.x + 1.2, f.y + 0.5, 0.9); for (let i = 0; i < per; i++) add('chicken', f.x + 0.4, f.y + 1.2, 0.8) }
    // o'rmon chekkasi
    const edge = []
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) if (G.W.tiles[z * N + x].k === 'grass' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => G.W.tiles[(z + dz) * N + x + dx].k === 'tree')) edge.push([x, z])
    const wild = GFX.q === 'low' ? 2 : 4
    for (let i = 0; i < Math.min(wild, edge.length); i++) { const [x, z] = edge[Math.floor(Math.random() * edge.length)]; add(i % 3 === 2 ? 'deer' : 'rabbit', x, z, 1.5) }
  }
  function animalTick(dt, time) {
    for (const a of animals) {
      const o = a.o, dx = a.tx - o.position.x, dz = a.tz - o.position.z, d = Math.hypot(dx, dz)
      const moving = d > 0.03
      if (moving) { const sp = o.userData.speed * dt; o.position.x += dx / d * Math.min(d, sp); o.position.z += dz / d * Math.min(d, sp); o.rotation.y = lerpAngle(o.rotation.y, Math.atan2(dx, dz), 0.15) }
      else if ((a.t -= dt) <= 0) {
        a.t = 2 + Math.random() * 5
        for (let i = 0; i < 6; i++) { const x = a.cx + (Math.random() - 0.5) * a.r * 2, z = a.cz + (Math.random() - 0.5) * a.r * 2; if (freeTile(x, z)) { a.tx = x; a.tz = z; break } }
      }
      if (!liveAnim(o, moving ? 'walk' : 'idle', dt)) animateAnimal(o, time / 1000, moving, a.seed)
    }
  }

  // ---------- Fizika: hech kim bir-birining ichidan o'tib ketmaydi ----------
  const RAD = { sheep: 0.2, chicken: 0.1, rabbit: 0.1, deer: 0.22 }
  const PR = 0.17   // o'yinchi radiusi
  function blocked(x, z) {   // maxluqlar o'yinchini to'sadi (yaqinlashishga yo'l qo'ymaydi)
    const raid = G.raid; if (!raid) return false
    for (const m of raid.mons) {
      if (m.hp <= 0) continue
      const r = PR + (m.type === 'troll' ? 0.3 : 0.2), mx = m.x - 0.5, mz = m.y - 0.5
      if (Math.hypot(mx - x, mz - z) < r && Math.hypot(mx - x, mz - z) < Math.hypot(mx - PL.x, mz - PL.z)) return true
    }
    return false
  }
  function bodies() {
    const list = []
    for (const a of animals) list.push({ p: a.o.position, r: RAD[a.o.userData.type] || 0.15, a })
    for (const f of folk) if (f.h.visible) list.push({ p: f.h.position, r: 0.13 })
    for (const u of unitGroup.children) list.push({ p: u.position, r: 0.13 })
    if (shino) list.push({ p: shino.holder.position, r: 0.14, sh: true })
    return list
  }
  function collide() {
    const list = bodies(), withPlayer = player && camMode !== 'top' && !PL.dead
    const push = (b, ox, oz, min) => {
      const dx = b.p.x - ox, dz = b.p.z - oz, d = Math.hypot(dx, dz) || 1e-3
      if (d >= min) return false
      const k = min - d, nx = b.p.x + dx / d * k, nz = b.p.z + dz / d * k
      if (freeTile(nx, nz)) { b.p.x = nx; b.p.z = nz; if (b.sh) { SH.x = nx; SH.z = nz } }
      if (b.a) { b.a.tx = b.p.x + dx / d * 0.6; b.a.tz = b.p.z + dz / d * 0.6; if (!freeTile(b.a.tx, b.a.tz)) { b.a.tx = b.p.x; b.a.tz = b.p.z } }   // hayvon chetga qochadi
      return true
    }
    // o'yinchi hammani itarib o'tadi (ichidan o'tib ketmaydi)
    if (withPlayer) for (const b of list) push(b, PL.x, PL.z, PR + b.r)
    // o'zaro: qo'y qo'yning, odam odamning ichiga kirmaydi
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j], dx = B.p.x - A.p.x, dz = B.p.z - A.p.z, d = Math.hypot(dx, dz), min = A.r + B.r
      if (d < min && d > 1e-4) { const k = (min - d) / 2, ux = dx / d * k, uz = dz / d * k
        if (freeTile(A.p.x - ux, A.p.z - uz)) { A.p.x -= ux; A.p.z -= uz } if (freeTile(B.p.x + ux, B.p.z + uz)) { B.p.x += ux; B.p.z += uz }
        if (A.sh) { SH.x = A.p.x; SH.z = A.p.z } if (B.sh) { SH.x = B.p.x; SH.z = B.p.z } }
    }
    // maxluqlar o'yinchi ichiga kirmaydi
    const raid = G.raid
    if (withPlayer && raid) for (const m of raid.mons) {
      if (m.hp <= 0) continue
      const mx = m.x - 0.5, mz = m.y - 0.5, dx = mx - PL.x, dz = mz - PL.z, d = Math.hypot(dx, dz) || 1e-3, min = PR + (m.type === 'troll' ? 0.3 : 0.2)
      if (d < min) { m.x += dx / d * (min - d); m.y += dz / d * (min - d) }
    }
  }

  // ---------- Ekran ↔ dunyo ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitV = new THREE.Vector3()
  function groundAt(sx, sy) { ndc.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hitV) ? hitV.clone() : null }
  const pv = new THREE.Vector3()
  function projectXYZ(x, y, z) { pv.set(x, y, z).project(camera); return { x: (pv.x + 1) / 2 * innerWidth, y: (1 - pv.y) / 2 * innerHeight, behind: pv.z > 1 } }

  // ---------- Overlay (2D: belgilar, chiziqlar, gap pufakchasi) ----------
  function overlay(ctx, time) {
    ctx.font = '800 11px Manrope'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const b of G.W.b) {
      const s = G.DEFS[b.type].size, cx = b.x + (s - 1) / 2, cz = b.y + (s - 1) / 2
      if (b.building) {
        const p = projectXYZ(cx, 1.2, cz), k = Math.max(0, Math.min(1, 1 - (b.done - Date.now()) / (b.dur * 1000)))
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - 24, p.y, 48, 7); ctx.fillStyle = '#f4b544'; ctx.fillRect(p.x - 24, p.y, 48 * k, 7)
      } else if ((G.DEFS[b.type].maxLvl || 1) > 1) {
        const p = projectXYZ(cx - 0.45 * s, 0.25, cz + 0.45 * s)
        ctx.fillStyle = 'rgba(16,18,24,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#f4b544'; ctx.fillText(b.lvl, p.x, p.y + 0.5)
      }
    }
    const raid = G.raid
    if (raid) for (const m of raid.mons) {
      if (m.hp <= 0) continue
      const p = projectXYZ(m.x - 0.5, m.type === 'troll' ? 1.0 : m.type === 'bat' ? 0.8 : 0.6, m.y - 0.5), w = 26, k = Math.max(0, m.hp / m.max)
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - w / 2, p.y, w, 4); ctx.fillStyle = k > 0.5 ? '#4fd18b' : k > 0.25 ? '#f4b544' : '#ff7a6b'; ctx.fillRect(p.x - w / 2, p.y, w * k, 4)
    }
    // zarba raqamlari
    const nowD = performance.now()
    for (let i = DMG.length - 1; i >= 0; i--) {
      const d = DMG[i], age = (nowD - d.t) / 900; if (age > 1) { DMG.splice(i, 1); continue }
      const p = projectXYZ(d.x, d.y + age * 0.4, d.z)
      ctx.font = '900 17px Manrope'; ctx.textAlign = 'center'; ctx.globalAlpha = 1 - age; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(d.txt, p.x, p.y); ctx.fillStyle = '#ffd34d'; ctx.fillText(d.txt, p.x, p.y); ctx.globalAlpha = 1
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'
    if (raid && !raid.done) { ctx.fillStyle = 'rgba(120,0,0,.12)'; ctx.fillRect(0, 0, innerWidth, innerHeight) }
    // o'yinchi nomi va joni
    if (player && camMode === 'third') {
      const p = projectXYZ(PL.x, PL.y + 0.84, PL.z)
      ctx.font = '800 12px Manrope'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3
      ctx.strokeText(PL.name, p.x, p.y); ctx.fillText(PL.name, p.x, p.y); ctx.textAlign = 'start'
    }
    if (player && camMode !== 'top') {
      const w = 180, x = innerWidth / 2 - w / 2, y = innerHeight - 92
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = PL.hp > 40 ? '#4fd18b' : '#ff7a6b'; ctx.fillRect(x, y, w * Math.max(0, PL.hp / PL.maxHp), 10)
      ctx.font = '700 11px Manrope'; ctx.fillStyle = '#fff'; ctx.fillText(`${PL.name} — ${Math.max(0, Math.round(PL.hp))}`, x, y - 4)
      if (performance.now() - PL.hurtT < 200) { ctx.fillStyle = 'rgba(255,0,0,.18)'; ctx.fillRect(0, 0, innerWidth, innerHeight) }
      if (PL.dead) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.font = '800 22px Manrope'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('Yiqildingiz… qasr yonida tirilasiz', innerWidth / 2, innerHeight / 2); ctx.textAlign = 'start' }
    }
    // Shinobu gapi
    const say = G.bubble
    if (say && shino && shino.holder.visible) {
      const p = projectXYZ(shino.holder.position.x, 0.72, shino.holder.position.z)
      bubble(ctx, p.x, p.y, say)
    }
  }
  function bubble(ctx, x, y, text) {
    ctx.font = '600 12.5px Manrope'
    const words = text.split(' '), lines = ['']
    for (const w of words) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (ctx.measureText(t).width > 200 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t }
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20, h = lines.length * 17 + 12
    const bx = Math.max(6, Math.min(innerWidth - w - 6, x - w / 2)), by = y - h - 8
    ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 10); ctx.fill()
    ctx.beginPath(); ctx.moveTo(x - 6, by + h - 1); ctx.lineTo(x + 6, by + h - 1); ctx.lineTo(x, by + h + 7); ctx.fill()
    ctx.fillStyle = '#1b1d22'; lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 20 + i * 17))
  }

  // ---------- Har kadr ----------
  let last = performance.now(), keyT = 0
  function render(time, ctx) {
    const dt = Math.min(0.05, (time - last) / 1000); last = time
    if (OL) OL.update(dt, PL.x, PL.z)
    playerTick(dt, time)
    if (!cameraFor()) placeCamera()
    if (time - keyT > 500) {
      keyT = time
      if (kitReady) { const tk = tkey(); if (tk !== tilesKey) { tilesKey = tk; buildGround(); buildDeco() } const bk = bkey(); if (bk !== bKey) { const cnt = bKey.split('|').length !== bk.split('|').length; bKey = bk; refreshLand(); rebuildBuildings(); if (cnt) buildDeco() } }
      syncUnits(); syncFolk(); syncAnimals()
      // kun/tun
      const night = G.isNight()
      hemi.intensity = lerp(hemi.intensity, night ? 0.75 : 1.6, 0.3); sun.intensity = lerp(sun.intensity, night ? 0.7 : 2.6, 0.3)
      sun.color.lerp(new THREE.Color(night ? '#a9b8ff' : '#fff1d6'), 0.3)
    }
    if (waterTex) { waterTex.offset.x = time / 9000; waterTex.offset.y = time / 13000 }
    // daraxtlar shamolda, bayroq, ekinlar, favvora
    for (const o of deco.children) if (o.userData.sway != null) o.rotation.z = Math.sin(time / 1100 + o.userData.sway) * 0.025
    // qasr darvozasi: kimdir yaqinlashsa ochiladi
    const cs = G.W.b.find((b) => b.type === 'castle' && !b.building)
    if (cs) {
      const cc = castleC(cs), gx = cc.x, gz = cc.z + (V?.CK ? 1.5 : CE)
      const near = (camMode !== 'top' && player && !PL.inside && Math.hypot(PL.x - gx, PL.z - gz) < 1.5) || (shino && Math.hypot(SH.x - gx, SH.z - gz) < 1.2)
      gateOpen = lerp(gateOpen, near ? 1 : 0, Math.min(1, dt * 2.5))
    }
    const nightNow = G.isNight()
    bGroup.traverse((o) => {
      if (o.userData.door) o.rotation.y = -o.userData.door * gateOpen * 1.5
      if (o.userData.portcullis) o.position.y = o.userData.y0 + gateOpen * 0.85
      if (o.userData.nightWin) o.material.emissiveIntensity = nightNow || PL.inside ? 1.4 : 0
      if (o.userData.flag) o.rotation.y = Math.sin(time / 300) * 0.3
      if (o.userData.crop != null) o.rotation.z = Math.sin(time / 700 + o.userData.crop) * 0.08
      if (o.userData.spin) o.rotation.y = time / 600
      if (o.userData.bob) o.position.y = 0.7 + Math.sin(time / 300) * 0.04
    })
    // arvoh
    const gh = G.ghost
    if (gh) { const s = G.DEFS[gh.type].size; ghostMesh.visible = true; ghostMesh.scale.set(s, 1, s); ghostMesh.position.set(gh.x + (s - 1) / 2, 0.04, gh.y + (s - 1) / 2); ghostMesh.material.color.set(G.canPlace(gh.type, gh.x, gh.y) ? '#4fd18b' : '#ff7a6b') } else ghostMesh.visible = false
    // Shinobu: o'yinchi rejimida Qurbonov orqasidan yuradi, aks holda o'z ishi bilan (tunda uy eshigi oldida mudraydi)
    if (shino) {
      const pet = G.pet, follow = camMode !== 'top' && player && !PL.dead && !PL.inside
      let tx, tz
      if (follow) {
        // kamera yo'nalishiga nisbatan o'yinchining CHAP yonida (kamerani to'smaydi, 1-shaxsda ko'z oldiga chiqmaydi)
        const side = PL.yaw + Math.PI / 2 + 0.35
        tx = PL.x - Math.sin(side) * 0.85; tz = PL.z - Math.cos(side) * 0.85
        if (!freeTile(tx, tz)) { tx = PL.x + Math.sin(side) * 0.85; tz = PL.z + Math.cos(side) * 0.85 }
        if (!freeTile(tx, tz)) { tx = PL.x + Math.sin(PL.yaw) * 0.8; tz = PL.z + Math.cos(PL.yaw) * 0.8 }
        if (Math.hypot(PL.x - SH.x, PL.z - SH.z) > 7) { SH.x = tx; SH.z = tz }   // juda uzoqda qolsa — yoniga keladi
      } else if (pet.inside) {
        const hs = G.W.b.find((b) => b.type === 'house' && !b.building)
        tx = hs ? hs.x + 0.1 : pet.x - 0.5; tz = hs ? hs.y + 0.75 : pet.y - 0.5
      } else { tx = pet.x - 0.5; tz = pet.y - 0.5 }
      const dx = tx - SH.x, dz = tz - SH.z, d = Math.hypot(dx, dz)
      const far = follow ? Math.hypot(PL.x - SH.x, PL.z - SH.z) : 0
      const spd = follow ? (far > 1.6 ? 1.9 : 0.8) : 0.9
      // to'xtash/yurish orasida "titrash" bo'lmasin: 0.55 dan uzoq bo'lsa yuradi, 0.2 ga yetganda to'xtaydi
      if (follow) { if (d > 0.55) SH.go = true; else if (d < 0.2) SH.go = false } else SH.go = d > 0.02
      const moving = SH.go
      if (moving) {
        const st = Math.min(d, spd * dt), nx = SH.x + dx / d * st, nz = SH.z + dz / d * st
        const out = !freeTile(SH.x, SH.z), ox = SH.x, oz = SH.z   // bino ichida qolib ketgan bo'lsa — chiqib ketaveradi
        if (freeTile(nx, SH.z) || out || !follow) SH.x = nx
        if (freeTile(SH.x, nz) || out || !follow) SH.z = nz
        // burchakda tiqilib qolsa — 2 soniyadan keyin yoniga keladi
        if (follow && Math.hypot(SH.x - ox, SH.z - oz) < st * 0.2) { SH.stuck = (SH.stuck || 0) + dt; if (SH.stuck > 2 && freeTile(tx, tz)) { SH.x = tx; SH.z = tz; SH.stuck = 0 } } else SH.stuck = 0
        shino.holder.rotation.y = lerpAngle(shino.holder.rotation.y, Math.atan2(dx, dz), 0.2)
      } else if (follow) shino.holder.rotation.y = lerpAngle(shino.holder.rotation.y, Math.atan2(PL.x - SH.x, PL.z - SH.z), 0.06)
      else shino.holder.rotation.y = lerpAngle(shino.holder.rotation.y, view.az, 0.03)
      shino.holder.visible = true
      shino.holder.position.set(SH.x, gy(SH.x, SH.z), SH.z)
      const clip = moving ? 'walk' : pet.inside && !follow ? 'yawn' : G.raid && !G.raid.done ? 'scared' : 'idle'
      shino.play(clip); if (moving) setSpeed(shino, 'walk', Math.min(d / dt, spd))
      shino.mixer.update(dt); shino.vrm.update(Math.min(dt, 1 / 30))
    }
    // qo'shin hujumda chayqaladi
    const fighting = G.raid && !G.raid.done
    // qo'shin: hujumda eng yaqin maxluqqa yuguradi, keyin joyiga qaytadi
    const liveMons = fighting ? G.raid.mons.filter((m) => m.hp > 0) : []
    for (const u of unitGroup.children) {
      let tx = u.userData.home.x, tz = u.userData.home.z
      if (liveMons.length) {
        let best = null, bd = 4.5
        for (const m of liveMons) { const d = Math.hypot(m.x - 0.5 - u.userData.home.x, m.y - 0.5 - u.userData.home.z); if (d < bd) { bd = d; best = m } }
        if (best) { tx = best.x - 0.5 + Math.sin(u.userData.i) * 0.25; tz = best.y - 0.5 + Math.cos(u.userData.i) * 0.25 }
      }
      const dx = tx - u.position.x, dz = tz - u.position.z, d = Math.hypot(dx, dz)
      if (d > 0.05) { const st = Math.min(d, dt * 1.6); u.position.x += dx / d * st; u.position.z += dz / d * st; u.rotation.y = Math.atan2(dx, dz) }
      if (d <= 0.05 && !fighting) u.rotation.y = lerpAngle(u.rotation.y, Math.PI / 2, 0.05)
      const ust = fighting && d < 0.4 ? 'attack' : d > 0.05 ? 'run' : G.raid && G.raid.done ? 'cheer' : 'idle'
      if (!liveAnim(u, ust, dt)) animateHumanoid(u, time / 1000 + u.userData.i, ust)
    }
    folkTick(dt, time); animalTick(dt, time)
    collide()
    // maxluqlar
    const raid = G.raid, alive = new Set()
    if (raid) for (const m of raid.mons) {
      if (m.hp <= 0) continue
      alive.add(m)
      let o = monMeshes.get(m); if (!o) { o = makeMonster(m); monMeshes.set(m, o); monGroup.add(o); o.position.set(m.x - 0.5, 0, m.y - 0.5) }
      const nx = m.x - 0.5, nz = m.y - 0.5, mv = Math.hypot(nx - o.position.x, nz - o.position.z)
      if (mv > 0.002) o.rotation.y = lerpAngle(o.rotation.y, Math.atan2(nx - o.position.x, nz - o.position.z), 0.25)
      o.position.x = nx; o.position.z = nz
      const near = m.arrived || (player && Math.hypot(nx - PL.x, nz - PL.z) < 0.7) || unitGroup.children.some((u) => Math.hypot(u.position.x - nx, u.position.z - nz) < 0.45)
      if (!liveAnim(o, near ? 'attack' : mv > 0.002 ? 'walk' : 'idle', dt)) { animateMonster(o, time / 1000, near ? 'attack' : 'move', o.userData.seed); flashMonster(o, performance.now() - (m.hit || 0) < 110) }
      else { const fl = performance.now() - (m.hit || 0) < 110; o.userData.live.inner.traverse((q) => { if (q.isMesh && q.material.emissive) { q.material = q.userData.fm || (q.userData.fm = q.material.clone()); q.material.emissive.setRGB(fl ? 0.8 : 0, 0, 0) } }) }
    }
    // o'lganlar yiqilib, yo'qoladi
    for (const [m, o] of monMeshes) if (!alive.has(m)) { monMeshes.delete(m); o.userData.dying = true; dying.push({ o, t: 0, y0: o.position.y }) }
    for (let i = dying.length - 1; i >= 0; i--) {
      const d = dying[i]; d.t += dt
      if (d.o.userData.live) { const L = d.o.userData.live, hasDie = L.clips.some((c) => PICK.die.test(c.name)); liveAnim(d.o, 'die', dt); if (!hasDie) d.o.rotation.z = Math.min(1.5, d.t * 4); if (d.t > 2.2) { monGroup.remove(d.o); dying.splice(i, 1) } continue }
      d.o.rotation.z = Math.min(1.5, d.t * 4); d.o.position.y = (d.y0 || 0) + Math.max(-0.3, -d.t * 0.4)
      d.o.scale.multiplyScalar(d.t > 0.6 ? 0.9 : 1)
      if (d.t > 1.1) { monGroup.remove(d.o); dying.splice(i, 1) }
    }
    for (const grp of [animalGroup, unitGroup, folkGroup, monGroup]) for (const o of grp.children) if (!o.userData.dying) o.position.y = gy(o.position.x, o.position.z)
    SKY.update(dt, camera.position, G.isNight(), sun.position.clone().sub(sun.target.position))
    scene.background.copy(SKY.horizon); scene.fog.color.copy(SKY.horizon)
    fadeBuildings()
    renderer.render(scene, camera)
    overlay(ctx, time)
  }
  const lerpAngle = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k }

  // ---------- world.js uchun ulanish ----------
  window.__r3 = {
    on: true,
    render,
    project(gx, gy) { return projectXYZ(gx, 0.6, gy) },
    pick(sx, sy) { const p = groundAt(sx, sy); return p ? { x: Math.round(p.x), y: Math.round(p.z), fx: p.x, fy: p.z } : { x: -99, y: -99 } },
    pan(dx, dy) {
      if (camMode !== 'top') { PL.yaw -= dx * 0.006; PL.pitch = Math.max(-0.6, Math.min(0.9, PL.pitch + dy * 0.004)); return }
      const k = view.dist / 900 * 1.6
      const fx = Math.sin(view.az), fz = Math.cos(view.az)   // kamera orqasi yo'nalishi
      // ekranda o'ngga surish → dunyo chapga
      view.tx += (-dx * fz - dy * fx) * k; view.tz += (dx * fx - dy * fz) * k
      view.tx = Math.max(-2, Math.min(N + 1, view.tx)); view.tz = Math.max(-2, Math.min(N + 1, view.tz)); saveView()
    },
    zoom(f) { if (camMode === 'third') { PL.camD = Math.max(0.9, Math.min(6, (PL.camD || 2.2) / f)); return } if (camMode !== 'top') return; view.dist = Math.max(6, Math.min(34, view.dist / f)); saveView() },
    rotate(d) { view.az += d; saveView() },
    playerMode: () => camMode !== 'top' && !!player,
    olam: () => OL, scene: () => scene, cam: () => camera,
    attack: () => attack(),
    click: (e) => mouseClick(e),
    spawnPerson(x, z, outfit = 'Male_Peasant') { const o = makePerson(outfit, 'villager', 0.3); if (!o) return 'no'; o.position.set(x, gy(x, z), z); scene.add(o); o.userData.live.mixer.clipAction(o.userData.live.clips.find((c) => /Idle_Loop/.test(c.name))).play(); o.userData.live.mixer.update(0.1); const r = []; o.traverse((m) => { if (m.isSkinnedMesh) { m.computeBoundingBox(); r.push([m.name, m.boundingBox.min.toArray().map((v) => +v.toFixed(2)), m.boundingBox.max.toArray().map((v) => +v.toFixed(2)), m.parent?.name]) } }); return r },
    probe: () => { const r = {}; const B = (o) => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); return b.isEmpty() ? 'empty' : b.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)) }
      r.folk = folk.slice(0, 3).map((f) => [f.h.visible, !!f.h.userData.live, B(f.h), f.h.position.toArray().map((v) => +v.toFixed(1))]); r.units = unitGroup.children.slice(0, 2).map((u) => [!!u.userData.live, B(u)]); r.mons = monGroup.children.slice(0, 3).map((m) => [!!m.userData.live, B(m)])
      r.people = !!PEOPLE; r.tplH = PEOPLE?.tpl.userData.h; r.msets = Object.fromEntries(Object.entries(MSET).map(([k, v]) => [k, v.length])); r.monH = Object.entries(LIVE_SRC).slice(0, 4).map(([k, v]) => [k, +v.userData.h.toFixed(2), v.userData.clips.length]); return r },
    hair: () => [shino, player].map((c) => { if (!c) return null; const k = c.holder.scale.x, h = c.vrm.humanoid.getRawBoneNode('head').getWorldPosition(new THREE.Vector3()); let sum = 0, mx = -9, n = 0; for (const j of c.vrm.springBoneManager?.joints || []) { const y = (j.bone.getWorldPosition(new THREE.Vector3()).y - h.y) / k; sum += y; mx = Math.max(mx, y); n++ } return [sum / n, mx, n] }),
    dbg: () => ({ cam: camera.position.toArray().map((v) => +v.toFixed(2)), pitch: PL.pitch, yaw: PL.yaw, SH: { ...SH }, PL: { x: PL.x, z: PL.z }, shino: !!shino, player: !!player, animals: animals.map((a) => [a.o.position.x, a.o.position.z]) }),
    tp(x, z, yaw, pitch) { PL.x = x; PL.z = z; if (yaw != null) PL.yaw = yaw; if (pitch != null) PL.pitch = pitch },
    gate: () => gateOpen, night: () => G.isNight(),
    hitPet(sx, sy) { if (!shino || !shino.holder.visible) return false; const p = projectXYZ(shino.holder.position.x, 0.35, shino.holder.position.z); return Math.hypot(sx - p.x, sy - p.y) < 30 },
    pickMonster(sx, sy) {
      const raid = G.raid; if (!raid) return null
      let best = null, bd = 34
      for (const m of raid.mons) { if (m.hp <= 0) continue; const p = projectXYZ(m.x - 0.5, m.type === 'bat' ? 0.5 : 0.25, m.y - 0.5); const d = Math.hypot(sx - p.x, sy - p.y); if (d < bd) { bd = d; best = m } }
      return best
    },
  }
  addRotateUI()
}

// ---------- Sozlamalar: 2D/3D va grafika sifati ----------
function addSettingsUI() {
  const css = document.createElement('style')
  css.textContent = `.gfx-btn{width:40px;height:40px;border-radius:12px;background:rgba(16,18,24,.94);border:1px solid #2a2f3a;display:grid;place-items:center;color:#ece8e1}
  .gfx-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .gfx-pop{position:fixed;top:58px;right:10px;z-index:8;width:250px;background:rgba(16,18,24,.96);border:1px solid #2a2f3a;border-radius:16px;padding:12px;color:#ece8e1;font-size:13px}
  .gfx-pop h4{font-size:13.5px;margin:2px 0 10px}.gfx-pop .seg{display:flex;gap:4px;margin:4px 0 12px}.gfx-pop .seg button{flex:1;height:34px;border-radius:9px;background:#1a1e27;border:1px solid #2a2f3a;font-weight:700;font-size:12.5px;color:#ece8e1}
  .gfx-pop .seg button.on{background:#f4b544;color:#1a1206;border-color:#f4b544}.gfx-pop small{color:#8d929c;display:block;line-height:1.4}
  .rot{position:fixed;right:10px;bottom:max(14px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:6px;z-index:5}
  .rot button{width:44px;height:44px;border-radius:12px;background:rgba(16,18,24,.94);border:1px solid #2a2f3a;color:#ece8e1;font-size:18px;font-weight:800}`
  document.head.appendChild(css)
  const hud = document.querySelector('.hud'); if (!hud) return
  const b = document.createElement('button'); b.className = 'gfx-btn'; b.title = 'Grafika'
  b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  hud.appendChild(b)
  b.onclick = () => {
    const old = document.querySelector('.gfx-pop'); if (old) return old.remove()
    const p = document.createElement('div'); p.className = 'gfx-pop'
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, t]) => `<button data-k="${key}" data-v="${v}" class="${GFX[key] === v ? 'on' : ''}">${t}</button>`).join('')}</div>`
    if (!GFX.day) GFX.day = 'day'
    p.innerHTML = `<h4>Grafika</h4>Ko'rinish${seg('mode', [['3d', '3D'], ['2d', '2D']])}Sifat${seg('q', [['low', 'Past'], ['med', "O'rta"], ['high', 'Yuqori']])}Kun / tun${seg('day', [['day', 'Doim kunduz'], ['real', 'Haqiqiy vaqt']])}
      <small>Past — telefon uchun tez. Yuqori — soyalar va to'liq aniqlik (kuchli kompyuter uchun). O'zgartirsangiz sahifa qayta yuklanadi.</small>`
    p.onclick = (e) => { const t = e.target.closest('[data-k]'); if (!t) return; GFX[t.dataset.k] = t.dataset.v; store.set('gfx', GFX); location.reload() }
    document.body.appendChild(p)
  }
}
function addRotateUI() {
  const r = document.createElement('div'); r.className = 'rot'
  r.innerHTML = '<button data-r="1" title="Aylantirish">⟲</button><button data-r="-1" title="Aylantirish">⟳</button>'
  r.onclick = (e) => { const d = e.target.closest('[data-r]'); if (d) window.__r3.rotate(+d.dataset.r * Math.PI / 4) }
  document.body.appendChild(r)
}

if (window.__world) init(); else addEventListener('world-ready', init, { once: true })
