// Unity'da yasalgan olam (Qurbonov → Saytga eksport) — /models/olam/ dan yuklanadi.
//   olam.json  — binolar, qasr, devorlar, toshlar, daraxtlar, to'siqlar, ko'priklar (metr, three.js o'qlari)
//   height.bin — yer balandliklari (Uint16, hres×hres)
//   ground.jpg — yer rangi
// Olam saytdagi o'yin birligiga K (0.41) bilan kichraytiriladi va (N-1)/2 markazga qo'yiladi.
import * as THREE from 'three'

export const OK = 0.41

export async function loadOlam({ loader, N, shadow = false, waterTex = null, base = '/models/olam/' }) {
  const C = (N - 1) / 2, K = OK
  const meta = await fetch(base + 'olam.json').then((r) => { if (!r.ok) throw new Error("olam.json yo'q"); return r.json() })
  const hbuf = await fetch(base + 'height.bin').then((r) => r.arrayBuffer())
  const W = meta.world, HR = meta.hres, MH = meta.maxh, B = meta.base, WATER = meta.water
  const u16 = new Uint16Array(hbuf), H = new Float32Array(HR * HR)
  for (let i = 0; i < H.length; i++) H[i] = (u16[i] / 65535) * MH

  // ---------- balandlik (metrda) ----------
  function hM(mx, mz) {
    const fx = Math.max(0, Math.min(HR - 1.001, ((mx + W / 2) / W) * (HR - 1))), fz = Math.max(0, Math.min(HR - 1.001, ((mz + W / 2) / W) * (HR - 1)))
    const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j
    return (H[j * HR + i] * (1 - a) + H[j * HR + i + 1] * a) * (1 - b) + (H[(j + 1) * HR + i] * (1 - a) + H[(j + 1) * HR + i + 1] * a) * b
  }
  const toM = (v) => (v - C) / K, yW = (h) => (h - B) * K

  // ---------- to'siqlar va ko'priklar: 8 m katakli tezkor qidiruv ----------
  const CELL = 8, key = (i, j) => i * 100003 + j
  function hash(rects) {
    const m = new Map()
    for (const r of rects) for (let i = Math.floor(r[0] / CELL); i <= Math.floor(r[2] / CELL); i++) for (let j = Math.floor(r[1] / CELL); j <= Math.floor(r[3] / CELL); j++) {
      const k = key(i, j); if (!m.has(k)) m.set(k, []); m.get(k).push(r)
    }
    return m
  }
  const solids = hash(meta.solids), decks = hash(meta.decks)
  const at = (m, x, z) => m.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []
  const inR = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]
  function deckTop(mx, mz) { let t = -1e9; for (const r of at(decks, mx, mz)) if (inR(r, mx, mz)) t = Math.max(t, r[4]); return t }
  const treeHash = new Map()
  for (const t of meta.trees) { const k = key(Math.floor(t[1] / CELL), Math.floor(t[3] / CELL)); if (!treeHash.has(k)) treeHash.set(k, []); treeHash.get(k).push(t) }

  function gy(x, z) { const mx = toM(x), mz = toM(z); return yW(Math.max(hM(mx, mz), deckTop(mx, mz))) }
  function solid(x, z) {
    const mx = toM(x), mz = toM(z)
    if (Math.abs(mx) > W / 2 - 14 || Math.abs(mz) > W / 2 - 14) return true      // olam cheti
    if (deckTop(mx, mz) > -1e8) return false                                      // ko'prik ustida
    const h = hM(mx, mz)
    if (h < WATER + 0.35) return true                                             // suv
    if (Math.abs(hM(mx + 1, mz) - hM(mx - 1, mz)) + Math.abs(hM(mx, mz + 1) - hM(mx, mz - 1)) > 1.7) return true   // tik qoya
    for (const r of at(solids, mx, mz)) if (inR(r, mx, mz)) return true             // bino, devor, tosh
    for (const t of treeHash.get(key(Math.floor(mx / CELL), Math.floor(mz / CELL))) || []) if (Math.hypot(t[1] - mx, t[3] - mz) < 0.7 * t[5]) return true
    return false
  }

  const group = new THREE.Group(); group.name = 'UnityOlam'
  const inner = new THREE.Group(); inner.position.set(C, -B * K, C); inner.scale.setScalar(K); group.add(inner)   // ichida hamma narsa metrda

  // ---------- yer ----------
  {
    const pos = new Float32Array(HR * HR * 3), uv = new Float32Array(HR * HR * 2)
    for (let j = 0; j < HR; j++) for (let i = 0; i < HR; i++) {
      const n = j * HR + i
      pos[n * 3] = -W / 2 + (i / (HR - 1)) * W; pos[n * 3 + 1] = H[n]; pos[n * 3 + 2] = -W / 2 + (j / (HR - 1)) * W
      uv[n * 2] = i / (HR - 1); uv[n * 2 + 1] = 1 - j / (HR - 1)
    }
    const idx = new Uint32Array((HR - 1) * (HR - 1) * 6); let o = 0
    for (let j = 0; j < HR - 1; j++) for (let i = 0; i < HR - 1; i++) {
      const a = j * HR + i, b = a + 1, c = a + HR, d = c + 1
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1))
    geo.computeVertexNormals()
    const tex = new THREE.TextureLoader().load(base + 'ground.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }))
    ground.receiveShadow = shadow; inner.add(ground)
    // suv (xandaq va daryo)
    const wm = new THREE.MeshStandardMaterial({ color: '#3f93c4', roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.82 })
    if (waterTex) { wm.map = waterTex; wm.color.set('#6fc4f0') }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W, W), wm); water.rotation.x = -Math.PI / 2; water.position.y = WATER
    inner.add(water)
  }

  // ---------- to'plamlar (village, nature, castle) — bo'laklar kutubxonasi ----------
  const kits = await Promise.all(meta.kits.map((k) => loader.loadAsync(`/models/${k}.glb`).then((g) => g.scene).catch(() => null)))
  const lib = new Map()
  function libOf(kit, name) {
    const id = kit + ':' + name; if (lib.has(id)) return lib.get(id)
    const sc = kits[kit]; let node = sc?.getObjectByName(name)
    if (!node && sc) node = sc.getObjectByName(name.replace(/Windows|Detail|Color/g, ''))
    const subs = []
    if (node) {
      sc.updateMatrixWorld(true)
      const inv = node.matrixWorld.clone().invert()
      node.traverse((o) => { if (o.isMesh) subs.push({ geo: o.geometry, mat: o.material, rel: inv.clone().multiply(o.matrixWorld) }) })
    }
    lib.set(id, subs); return subs
  }
  const tmp = new THREE.Matrix4(), P = new THREE.Vector3(), Qt = new THREE.Quaternion(), S = new THREE.Vector3()
  const pqs = (a, o) => tmp.compose(P.set(a[o], a[o + 1], a[o + 2]), Qt.set(a[o + 3], a[o + 4], a[o + 5], a[o + 6]), S.set(a[o + 7], a[o + 8], a[o + 9]))

  // bir xil bo'laklarni bitta InstancedMesh bilan chizamiz (tez)
  function instanced(list, kit, name) {
    const subs = libOf(kit, name); if (!subs.length) return
    for (const s of subs) {
      const m = new THREE.InstancedMesh(s.geo, s.mat, list.length)
      list.forEach((mat4, i) => m.setMatrixAt(i, tmp.copy(mat4).multiply(s.rel)))
      m.castShadow = m.receiveShadow = shadow; m.computeBoundingSphere(); inner.add(m)
    }
  }
  {
    const byName = new Map()
    for (const p of meta.parts) { const id = p[0] + ':' + p[1]; if (!byName.has(id)) byName.set(id, []); byName.get(id).push(pqs(p, 2).clone()) }
    for (const [id, list] of byName) { const [k, n] = id.split(':').map(Number); instanced(list, k, meta.names[n]) }
  }

  // ---------- oddiy qutilar (uy ichi, o'choq, bayroqcha) ----------
  {
    const box = new THREE.BoxGeometry(1, 1, 1), byCol = new Map()
    for (const b of meta.boxes) { const id = b[0] + ':' + b[1]; if (!byCol.has(id)) byCol.set(id, []); byCol.get(id).push(pqs(b, 2).clone()) }
    for (const [id, list] of byCol) {
      const [hex, glow] = id.split(':')
      const mat = new THREE.MeshStandardMaterial({ color: '#' + hex, roughness: 0.85, ...(glow === '1' ? { emissive: '#ff7a1a', emissiveIntensity: 2.5 } : {}) })
      const m = new THREE.InstancedMesh(box, mat, list.length); list.forEach((x, i) => m.setMatrixAt(i, x)); m.castShadow = m.receiveShadow = shadow; m.computeBoundingSphere(); inner.add(m)
    }
  }

  // ---------- tegirmon parraklari (aylanadi) ----------
  const spins = []
  {
    const box = new THREE.BoxGeometry(1, 1, 1), mats = {}
    for (const s of meta.spins) {
      const hub = new THREE.Group(); pqs(s.t, 0).decompose(hub.position, hub.quaternion, hub.scale)
      for (const b of s.b) {
        const m = new THREE.Mesh(box, mats[b[0]] ||= new THREE.MeshStandardMaterial({ color: '#' + b[0], roughness: 0.9 }))
        pqs(b, 1).decompose(m.position, m.quaternion, m.scale); m.castShadow = shadow; hub.add(m)
      }
      inner.add(hub); spins.push({ hub, speed: (s.speed * Math.PI) / 180 })
    }
  }

  // ---------- daraxtlar: uzoqda yengil (konus/shar), yaqinda haqiqiy model ----------
  const NAT = meta.kits.indexOf('nature')
  const treeTypes = new Map()   // nom → { real: [InstancedMesh], cap, h, w }
  for (const t of meta.trees) {
    const name = meta.names[t[0]]
    if (!treeTypes.has(name)) {
      const subs = libOf(NAT, name), bb = new THREE.Box3()
      for (const s of subs) { if (!s.geo.boundingBox) s.geo.computeBoundingBox(); bb.union(s.geo.boundingBox.clone().applyMatrix4(s.rel)) }
      const sz = bb.isEmpty() ? new THREE.Vector3(4, 7, 4) : bb.getSize(new THREE.Vector3())
      treeTypes.set(name, { subs, n: 0, h: sz.y, w: Math.max(sz.x, sz.z), pine: /Pine/.test(name), bush: /Bush/.test(name) })
    }
    treeTypes.get(name).n++
  }
  const far = new THREE.Group(); inner.add(far)
  const farParts = []   // { mesh, base: Float32Array }
  const treeFar = meta.trees.map(() => [])   // daraxt → [[farPart, index]]
  {
    const mk = (geo, color, pick, fn) => {
      const ids = []; meta.trees.forEach((t, i) => { if (pick(treeTypes.get(meta.names[t[0]]))) ids.push(i) })
      if (!ids.length) return
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }), ids.length)
      const o = new THREE.Object3D(), c = new THREE.Color()
      ids.forEach((ti, k) => {
        const t = meta.trees[ti], T = treeTypes.get(meta.names[t[0]])
        o.position.set(t[1], t[2], t[3]); o.rotation.set(0, t[4], 0); o.scale.setScalar(t[5]); fn(o, T); o.updateMatrix(); m.setMatrixAt(k, o.matrix)
        c.set(color).multiplyScalar(0.85 + ((ti * 0.618) % 1) * 0.3); m.setColorAt(k, c); treeFar[ti].push([farParts.length, k])
      })
      m.castShadow = shadow; m.computeBoundingSphere(); far.add(m)
      farParts.push({ mesh: m, base: m.instanceMatrix.array.slice() })
    }
    const trunk = new THREE.CylinderGeometry(0.1, 0.14, 1, 5); trunk.translate(0, 0.5, 0)
    const cone = new THREE.ConeGeometry(1, 1, 7); cone.translate(0, 0.5, 0)
    const blob = new THREE.IcosahedronGeometry(1, 1)
    mk(trunk, '#6b4a2f', (T) => !T.bush, (o, T) => { o.scale.multiply(new THREE.Vector3(T.w * 0.5, T.h * 0.45, T.w * 0.5)) })
    mk(cone, '#2f6b3a', (T) => T.pine, (o, T) => { o.position.y += T.h * 0.18 * o.scale.y; o.scale.multiply(new THREE.Vector3(T.w * 0.45, T.h * 0.82, T.w * 0.45)) })
    mk(blob, '#4f8f3a', (T) => !T.pine && !T.bush, (o, T) => { o.position.y += T.h * 0.62 * o.scale.y; o.scale.multiply(new THREE.Vector3(T.w * 0.45, T.h * 0.36, T.w * 0.45)) })
    mk(blob, '#4a8a3c', (T) => T.bush, (o, T) => { o.position.y += T.h * 0.35 * o.scale.y; o.scale.multiply(new THREE.Vector3(T.w * 0.5, T.h * 0.45, T.w * 0.5)) })
  }
  // yaqindagi haqiqiy daraxtlar
  const NEAR_R = 75, CAP = 90   // metr; har tur uchun eng ko'pi
  for (const [, T] of treeTypes) {
    T.cap = Math.min(CAP, T.n)
    T.real = T.subs.map((s) => { const m = new THREE.InstancedMesh(s.geo, s.mat, T.cap); m.count = 0; m.castShadow = m.receiveShadow = shadow; m.frustumCulled = false; inner.add(m); return m })
  }
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), idOf = new Map(meta.trees.map((t, i) => [t, i]))
  let hidden = [], lastNear = null, nearT = 0
  function updateTrees(mx, mz) {
    for (const ti of hidden) for (const [p, k] of treeFar[ti]) { farParts[p].mesh.instanceMatrix.array.set(farParts[p].base.subarray(k * 16, k * 16 + 16), k * 16) }
    hidden = []
    const near = []
    for (let i = Math.floor((mx - NEAR_R) / CELL); i <= Math.floor((mx + NEAR_R) / CELL); i++) for (let j = Math.floor((mz - NEAR_R) / CELL); j <= Math.floor((mz + NEAR_R) / CELL); j++)
      for (const t of treeHash.get(key(i, j)) || []) { const d = Math.hypot(t[1] - mx, t[3] - mz); if (d < NEAR_R) near.push([d, t]) }
    near.sort((a, b) => a[0] - b[0])
    for (const [, T] of treeTypes) T.used = 0
    for (const [, t] of near) {
      const T = treeTypes.get(meta.names[t[0]]); if (T.used >= T.cap || !T.real.length) continue
      tmp.compose(P.set(t[1], t[2], t[3]), Qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t[4]), S.setScalar(t[5]))
      T.subs.forEach((s, si) => T.real[si].setMatrixAt(T.used, new THREE.Matrix4().copy(tmp).multiply(s.rel)))
      T.used++
      const ti = idOf.get(t); hidden.push(ti)
      for (const [p, k] of treeFar[ti]) farParts[p].mesh.setMatrixAt(k, zero)
    }
    for (const [, T] of treeTypes) for (const m of T.real) { m.count = T.used; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere() }
    for (const p of farParts) p.mesh.instanceMatrix.needsUpdate = true
  }

  function update(dt, x, z) {
    for (const s of spins) s.hub.rotateZ(-s.speed * dt)
    nearT -= dt
    const mx = toM(x), mz = toM(z)
    if (nearT <= 0 && (!lastNear || Math.hypot(mx - lastNear[0], mz - lastNear[1]) > 6)) { nearT = 0.4; lastNear = [mx, mz]; updateTrees(mx, mz) }
  }

  const spawn = [C + meta.spawn[0] * K, C + meta.spawn[1] * K]
  return { group, gy, solid, update, spawn, size: W * K, K }
}
