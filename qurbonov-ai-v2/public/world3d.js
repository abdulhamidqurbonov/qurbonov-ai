// ============ Shinobu olami — 3D ko'rinish (4.1) ============
// world.js o'yin mantig'ini boshqaradi (binolar, resurslar, hujumlar). Bu fayl faqat 3D'da chizadi.
// Grafika: Past / O'rta / Yuqori. Kamera: Clash'dagidek tepadan — surish, kattalashtirish, aylantirish.
// Modellar: Kenney Retro Fantasy Kit (CC0), personajlar — VRM + Mixamo.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '/vendor/three/three-vrm.module.js'
import { loadMixamo } from '/mixamo.js'
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
  const sky = new THREE.Color('#9fd0f5'); scene.background = sky
  scene.fog = new THREE.Fog(sky, 30, 70)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
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
    camera.position.set(view.tx + Math.sin(view.az) * r, h, view.tz + Math.cos(view.az) * r)
    camera.lookAt(view.tx, 0, view.tz)
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
  function piece(n, { x = 0, y = 0, z = 0, s = 1, sy, ry = 0, tint } = {}) {
    const src = kit[n]; if (!src) return new THREE.Group()
    const o = src.clone(true)
    const k = s / Math.max(src.userData.size.x, src.userData.size.z)
    o.scale.set(k, (sy ?? s) / Math.max(src.userData.size.x, src.userData.size.z), k)
    o.position.set(x, y, z); o.rotation.y = ry
    if (tint) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)) } })
    return o
  }
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !!Q.shadow; o.receiveShadow = !!Q.shadow; return o }

  // ---------- Yer ----------
  const world = new THREE.Group(); scene.add(world)
  let ground = null, waterMesh = null, waterTex = null, deco = new THREE.Group(), tilesKey = ''
  world.add(deco)
  const texLoader = new THREE.TextureLoader()
  waterTex = texLoader.load('/kit/Textures/water.png', (t) => { t.colorSpace = THREE.SRGBColorSpace }); waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping
  function buildGround() {
    if (ground) { world.remove(ground); ground.geometry.dispose() }
    if (waterMesh) { world.remove(waterMesh) }
    const tiles = G.W.tiles
    const land = tiles.filter((t) => t.k !== 'water' && t.k !== 'bridge').length
    ground = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.5, 1), mat('#ffffff', { flatShading: false, roughness: 1 }), land)
    ground.receiveShadow = !!Q.shadow
    const water = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshStandardMaterial({ map: waterTex, color: '#7fd3ff', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }), tiles.length - land)
    const m4 = new THREE.Matrix4(), col = new THREE.Color()
    let i = 0, j = 0
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = tiles[y * N + x]
      if (t.k === 'water' || t.k === 'bridge') { m4.makeTranslation(x, -0.32, y); water.setMatrixAt(j++, m4); continue }
      m4.makeTranslation(x, -0.25, y); ground.setMatrixAt(i, m4)
      col.set(t.k === 'rock' ? '#8fae64' : '#7fc05a').multiplyScalar(0.9 + t.v * 0.16); ground.setColorAt(i, col); i++
    }
    world.add(ground); world.add(water); waterMesh = water
  }
  // Orol ostidagi tuproq (Clash'dagidek suzib turgan orol)
  const base = mesh(new THREE.BoxGeometry(N + 0.4, 2.2, N + 0.4), mat('#8a5a3c'), (N - 1) / 2, -1.6, (N - 1) / 2); base.receiveShadow = false; scene.add(base)
  const baseTop = mesh(new THREE.BoxGeometry(N + 0.6, 0.18, N + 0.6), mat('#5f9a43'), (N - 1) / 2, -0.52, (N - 1) / 2); scene.add(baseTop)

  // Daraxtlar, qoyalar, gullar
  const rockGeo = new THREE.DodecahedronGeometry(0.32, 0), rockMat = mat('#9aa0aa')
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.36, 6), trunkMat = mat('#7a4f30')
  const pineGeo = new THREE.ConeGeometry(0.34, 0.42, 7), blobGeo = new THREE.IcosahedronGeometry(0.3, 0)
  const leafMats = [mat('#3f9a4a'), mat('#4fae5b'), mat('#68c272')]
  function buildDeco() {
    world.remove(deco); deco = new THREE.Group(); world.add(deco)
    const tiles = G.W.tiles
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
    if (T === 'house') {
      up(piece('wall-paint-door', { s: 0.82, ry: 0 }))
      up(piece('roof', { y: 0.82, s: 0.86, tint: ROOF.house }))
      if (L >= 2) up(piece('detail-barrel', { x: 0.42, z: 0.32, s: 0.22 }))
    } else if (T === 'castle') {
      up(piece('wall-fortified-gate', { x: 0.45, z: 0.45, s: 0.92 })); up(piece('wall-fortified', { x: -0.45, z: 0.45, s: 0.92 }))
      up(piece('wall-fortified-window', { x: 0.45, z: -0.45, s: 0.92 })); up(piece('wall-fortified', { x: -0.45, z: -0.45, s: 0.92 }))
      up(piece('wall-fortified-window', { y: 0.92, s: 0.9 + L * 0.05 })); up(piece('roof', { y: 0.92 + 0.9 + L * 0.05, s: 1.0, tint: ROOF.castle }))
      for (const [dx, dz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) {
        up(piece('tower-base', { x: dx, z: dz, s: 0.62 })); up(piece('tower', { x: dx, z: dz, y: 0.62, s: 0.62 })); up(piece('tower-top', { x: dx, z: dz, y: 1.24, s: 0.66 }))
        if (L >= 3) { const c = mesh(new THREE.ConeGeometry(0.36, 0.55, 8), mat(ROOF.castle), dx, 1.24 + 0.55, dz); g.add(c) }
      }
      const pole = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), mat('#555'), 0, 3.2, 0); g.add(pole)
      const flag = mesh(new THREE.PlaneGeometry(0.45, 0.28), mat('#e2304b', { side: THREE.DoubleSide }), 0.24, 3.42, 0); flag.userData.flag = true; g.add(flag)
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
      wrap.userData.fit = 1 / Math.max(sz.x, sz.z, 1e-3); custom[k] = wrap
    }).catch(() => {}))).then(() => { if (Object.keys(custom).length && kitReady) rebuildAll() })).catch(() => {})
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
      o.userData.b = b; o.userData.fade = 1; bGroup.add(o)
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
  if (hb) { PL.x = hb.x + 0.5; PL.z = hb.y + 2.3 }
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
    if (hand) { hand.add(sword); const s = 1 / c.holder.scale.x * 0.95; sword.scale.setScalar(s); sword.position.set(0.04 * s, 0, 0); sword.rotation.set(0, 0, -Math.PI / 2) }
    sword.visible = camMode !== 'top'
    applyCamLayers()
  }).catch(() => {})
  function applyCamLayers() {
    if (!player?.vrm.firstPerson) return
    const fp = player.vrm.firstPerson
    camera.layers.set(0)
    if (camMode === 'first') { camera.layers.enable(fp.firstPersonOnlyLayer) } else { camera.layers.enable(fp.thirdPersonOnlyLayer) }
  }
  const walkable = (x, z) => {
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
  function doHit() {
    const raid = G.raid; if (!raid) return
    const ry = player.holder.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry)   // personaj qaragan tomon
    let hit = 0
    for (const m of raid.mons) {
      if (m.hp <= 0) continue
      const dx = m.x - 0.5 - PL.x, dz = m.y - 0.5 - PL.z, d = Math.hypot(dx, dz)
      if (d < 0.95 && (dx * fx + dz * fz) / (d || 1) > 0.1) { const dmg = 6 + (G.W.lvl || 1) * 2 + (PL.combo % 3 === 0 ? 4 : 0); m.hp -= dmg; m.hit = performance.now(); hit++ }
    }
    if (hit) { G.W.stats.taps = (G.W.stats.taps || 0) + hit }
  }
  function playerTick(dt, time) {
    if (!player) return
    const now = performance.now()
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
    player.holder.position.set(PL.x, PL.y, PL.z)
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
    if (PL.dead && now - PL.dead > 3500) { PL.dead = 0; PL.hp = PL.maxHp; if (hb) { PL.x = hb.x + 0.5; PL.z = hb.y + 2.3 } player.want = null }
    if (!raid && PL.hp < PL.maxHp) PL.hp = Math.min(PL.maxHp, PL.hp + 8 * dt)
    // animatsiya
    if (!PL.dead && now > PL.busyUntil) { const f = moving ? (running ? 'run' : 'walk2') : 'idle2'; player.play(f, { fade: 0.2 }); if (moving) setSpeed(player, f, speed) }
    player.mixer.update(dt); player.vrm.update(dt)
    if (sword) sword.visible = camMode !== 'top'
    if (time % 3000 < 20) store.set('player3d', { x: PL.x, z: PL.z, yaw: PL.yaw })
  }
  const camRay = new THREE.Raycaster()
  function cameraFor() {
    if (camMode === 'top' || !player) return false
    if (camMode === 'third') {
      const eye = new THREE.Vector3(PL.x, PL.y + 0.58, PL.z)
      const dir = new THREE.Vector3(Math.sin(PL.yaw) * Math.cos(PL.pitch), Math.sin(PL.pitch) + 0.15, Math.cos(PL.yaw) * Math.cos(PL.pitch)).normalize()
      let d = PL.camD || 2.2
      // devor yoki bino orqasida qolmasin — kamerani yaqinlashtiramiz
      camRay.set(eye, dir); camRay.far = d
      const hit = camRay.intersectObjects([deco], true)[0]   // binolar esa shaffof bo'ladi
      if (hit) d = Math.max(0.6, hit.distance - 0.15)
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
    if (!locked() && cvTop.requestPointerLock) { try { const r = cvTop.requestPointerLock(); r?.catch?.(() => {}) } catch { /* */ } return true }
    if (e.button === 2) kick(); else attack()
    return true
  }
  function kick() {
    if (!player || PL.dead) return
    const now = performance.now(); if (now < PL.busyUntil - 250) return
    if (camMode === 'third' && locked()) player.holder.rotation.y = PL.yaw + Math.PI
    playOnce(player, 'kick'); PL.busyUntil = now + 1000; PL.hitAt = now + 420; PL.hitDone = false
  }
  css.textContent += `.xhair{position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.45);z-index:6;display:none;pointer-events:none}
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
  function makeUnit(u) { return makeHumanoid({ ...SOLDIER[u], s: 1.25 }) }
  let unitKey = ''
  function syncUnits() {
    const a = G.W.army, k = `${a.soldier},${a.archer},${a.knight},${G.castleLvl()}`
    if (k === unitKey) return; unitKey = k
    while (unitGroup.children.length) unitGroup.remove(unitGroup.children[0])
    const c = G.W.b.find((b) => b.type === 'castle' && !b.building); if (!c) return
    let i = 0
    for (const u of ['knight', 'soldier', 'archer']) for (let n = 0; n < Math.min(a[u], 8); n++, i++) {
      const o = makeUnit(u); const row = Math.floor(i / 4), col = i % 4
      o.position.set(c.x + 1.9 + row * 0.32, 0, c.y - 0.2 + col * 0.3); o.rotation.y = Math.PI / 2; o.userData.i = i; o.userData.u = u; o.userData.home = o.position.clone(); unitGroup.add(o)
    }
  }
  const monGroup = new THREE.Group(); scene.add(monGroup)
  const monMeshes = new Map(), dying = []
  const MSCALE = { bat: 1.6, wolf: 1.5, goblin: 1.4, troll: 1.25 }
  function makeMonster(m) { const o = makeMonster3D(m.type); o.scale.setScalar(MSCALE[m.type] || 1.3); o.userData.seed = Math.random() * 10; return o }

  // --- yo'l topish: daryodan faqat ko'prik orqali o'tadi ---
  const bridge = (() => { const t = G.W.tiles.map((t, i) => (t.k === 'bridge' ? i : -1)).filter((i) => i >= 0); if (!t.length) return null; const xs = t.map((i) => i % N), y = Math.floor(t[0] / N); return { x0: Math.min(...xs) - 1, x1: Math.max(...xs) + 1, y } })()
  const riverX = (z) => { const row = Math.max(0, Math.min(N - 1, Math.round(z))); for (let x = 0; x < N; x++) { const k = G.W.tiles[row * N + x].k; if (k === 'water' || k === 'bridge') return x } return N + 5 }
  const side = (x, z) => (x < riverX(z) ? 0 : 1)
  function route(x0, z0, x1, z1) {
    if (!bridge || side(x0, z0) === side(x1, z1)) return [[x1, z1]]
    return side(x0, z0) === 0 ? [[bridge.x0, bridge.y], [bridge.x1, bridge.y], [x1, z1]] : [[bridge.x1, bridge.y], [bridge.x0, bridge.y], [x1, z1]]
  }
  const freeTile = (x, z) => { const gx = Math.round(x), gz = Math.round(z); if (gx < 0 || gz < 0 || gx >= N || gz >= N) return false; const k = G.W.tiles[gz * N + gx].k; if (k === 'water' || k === 'tree' || k === 'rock') return false; return !G.W.b.some((b) => { const s = G.DEFS[b.type].size; return gx >= b.x && gx < b.x + s && gz >= b.y && gz < b.y + s && b.type !== 'farm' }) }
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
  const maxFolk = GFX.q === 'low' ? 6 : GFX.q === 'med' ? 10 : 14
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
    for (const it of list.slice(0, maxFolk)) {
      const h = makeHumanoid({ ...VILLAGER[it.job], s: 1.1 })
      const [x, z] = frontOf(homeB)
      h.position.set(x + (Math.random() - 0.5) * 0.4, 0, z + (Math.random() - 0.5) * 0.4)
      folkGroup.add(h)
      folk.push({ h, job: it.job, work: it.work, home: homeB, state: 'idle', t: Math.random() * 3, path: [], act: 'idle', seed: Math.random() * 10 })
    }
  }
  function goTo(f, x, z) { f.path = route(f.h.position.x, f.h.position.z, x, z) }
  function folkTick(dt, time) {
    const raid = G.raid && !G.raid.done, night = G.isNight()
    for (const f of folk) {
      const h = f.h
      // hujumda yoki kechasi — uyga qochib, yashirinadi
      if ((raid || night) && f.state !== 'hide' && f.state !== 'flee') { const [x, z] = frontOf(f.home); goTo(f, x, z); f.state = 'flee'; setLoad(h, null) }
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
          else if (f.state === 'carry') { setLoad(h, null); f.state = 'idle'; f.t = 1.2; if (Math.random() < 0.5) { const p = G.iso(h.position.x, h.position.z); void p } }
          else { f.state = 'idle'; f.t = 2 + Math.random() * 4 }
        }
      } else if (f.state !== 'hide') {
        f.t -= dt
        f.act = f.state === 'work' ? (f.job === 'merchant' ? 'idle' : 'work') : 'idle'
        if (f.t <= 0) {
          if (f.state === 'work') { setLoad(h, LOAD[f.job]); f.state = 'carry'; const [x, z] = frontOf(f.home); goTo(f, x, z) }
          else if (f.work && G.W.b.includes(f.work)) { f.state = 'toWork'; const [x, z] = frontOf(f.work); goTo(f, x, z) }
          else { // qishloq ahli: binolar orasida sayr
            const opts = G.W.b.filter((b) => !b.building); const b = opts[Math.floor(Math.random() * opts.length)]
            f.state = 'walk'; if (b) { const [x, z] = frontOf(b); goTo(f, x + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5) } else f.t = 3
          }
        }
      }
      if (h.visible) animateHumanoid(h, time / 1000 + f.seed, f.act)
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
      const o = makeAnimal(type); o.scale.setScalar(type === 'deer' ? 1.3 : 1.4)
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
      animateAnimal(o, time / 1000, moving, a.seed)
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
    playerTick(dt, time)
    if (!cameraFor()) placeCamera()
    if (time - keyT > 500) {
      keyT = time
      if (kitReady) { const tk = tkey(); if (tk !== tilesKey) { tilesKey = tk; buildGround(); buildDeco() } const bk = bkey(); if (bk !== bKey) { bKey = bk; rebuildBuildings() } }
      syncUnits(); syncFolk(); syncAnimals()
      // kun/tun
      const night = G.isNight()
      hemi.intensity = lerp(hemi.intensity, night ? 0.55 : 1.6, 0.3); sun.intensity = lerp(sun.intensity, night ? 0.5 : 2.6, 0.3)
      const skyC = new THREE.Color(night ? '#1c2348' : '#9fd0f5'); scene.background.lerp(skyC, 0.3); scene.fog.color.copy(scene.background)
    }
    if (waterTex) { waterTex.offset.x = time / 9000; waterTex.offset.y = time / 13000 }
    // daraxtlar shamolda, bayroq, ekinlar, favvora
    for (const o of deco.children) if (o.userData.sway != null) o.rotation.z = Math.sin(time / 1100 + o.userData.sway) * 0.025
    bGroup.traverse((o) => {
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
      const pet = G.pet, follow = camMode !== 'top' && player && !PL.dead
      let tx, tz
      if (follow) {
        const back = player.holder.rotation.y + Math.PI   // o'yinchining orqa-chap tomoni
        tx = PL.x + Math.sin(back + 0.6) * 0.75; tz = PL.z + Math.cos(back + 0.6) * 0.75
        if (!freeTile(tx, tz)) { tx = PL.x + Math.sin(back) * 0.6; tz = PL.z + Math.cos(back) * 0.6 }
        if (Math.hypot(PL.x - SH.x, PL.z - SH.z) > 7) { SH.x = tx; SH.z = tz }   // juda uzoqda qolsa — yoniga keladi
      } else if (pet.inside) {
        const hs = G.W.b.find((b) => b.type === 'house' && !b.building)
        tx = hs ? hs.x + 0.1 : pet.x - 0.5; tz = hs ? hs.y + 0.75 : pet.y - 0.5
      } else { tx = pet.x - 0.5; tz = pet.y - 0.5 }
      const dx = tx - SH.x, dz = tz - SH.z, d = Math.hypot(dx, dz)
      const far = follow ? Math.hypot(PL.x - SH.x, PL.z - SH.z) : 0
      const spd = follow ? (far > 1.6 ? 1.9 : 0.8) : 0.9
      const moving = d > (follow ? 0.25 : 0.02)
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
      shino.holder.position.set(SH.x, 0, SH.z)
      const clip = moving ? 'walk' : pet.inside && !follow ? 'yawn' : G.raid && !G.raid.done ? 'scared' : 'idle'
      shino.play(clip); if (moving) setSpeed(shino, 'walk', Math.min(d / dt, spd))
      shino.mixer.update(dt); shino.vrm.update(dt)
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
      animateHumanoid(u, time / 1000 + u.userData.i, fighting && d < 0.4 ? 'attack' : d > 0.05 ? 'run' : G.raid && G.raid.done ? 'cheer' : 'idle')
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
      animateMonster(o, time / 1000, near ? 'attack' : 'move', o.userData.seed)
      flashMonster(o, performance.now() - (m.hit || 0) < 110)
    }
    // o'lganlar yiqilib, yo'qoladi
    for (const [m, o] of monMeshes) if (!alive.has(m)) { monMeshes.delete(m); dying.push({ o, t: 0 }) }
    for (let i = dying.length - 1; i >= 0; i--) {
      const d = dying[i]; d.t += dt
      d.o.rotation.z = Math.min(1.5, d.t * 4); d.o.position.y = Math.max(-0.3, -d.t * 0.4 + (d.o.userData.parts?.body ? 0 : 0))
      d.o.scale.multiplyScalar(d.t > 0.6 ? 0.9 : 1)
      if (d.t > 1.1) { monGroup.remove(d.o); dying.splice(i, 1) }
    }
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
    attack: () => attack(),
    click: (e) => mouseClick(e),
    dbg: () => ({ SH: { ...SH }, PL: { x: PL.x, z: PL.z }, shino: !!shino, player: !!player, animals: animals.map((a) => [a.o.position.x, a.o.position.z]) }),
    tp(x, z) { PL.x = x; PL.z = z },
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
    p.innerHTML = `<h4>Grafika</h4>Ko'rinish${seg('mode', [['3d', '3D'], ['2d', '2D']])}Sifat${seg('q', [['low', 'Past'], ['med', "O'rta"], ['high', 'Yuqori']])}
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
