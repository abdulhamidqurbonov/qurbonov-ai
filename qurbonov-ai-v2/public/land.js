// Relyefli yer: shahar ichida yengil bo'rtiqlar, devordan tashqarida adirlar, uzoqda tog'lar,
// daryo davom etadi, darvozalardan yo'llar chiqadi. Hamma narsa H(x, z) balandlik funksiyasiga tayanadi.
import * as THREE from 'three'

// ---------- Shovqin (value noise + fbm) ----------
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}
function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * (vnoise(x * f, y * f) * 2 - 1); n += a; a *= 0.5; f *= 2.03 } return s / n }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export const WATER_Y = -0.16
export const WORLD_R = 62   // olam radiusi (markazdan)

export function createLand({ N, tiles, gates }) {
  const C = (N - 1) / 2
  // suv niqobi (katak bo'yicha) — silliq o'yilgan daryo o'zani
  const isW = (x, y) => { if (x < 0 || y < 0 || x >= N || y >= N) return 0; const k = tiles[y * N + x].k; return k === 'water' || k === 'bridge' ? 1 : 0 }
  function waterIn(x, z) {
    const fx = x, fz = z, i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j
    return (isW(i, j) * (1 - a) + isW(i + 1, j) * a) * (1 - b) + (isW(i, j + 1) * (1 - a) + isW(i + 1, j + 1) * a) * b
  }
  // daryo devordan tashqarida ham davom etadi: chetdagi suv kataklaridan tashqariga (biroz egilib)
  const exits = []
  for (let i = 0; i < N; i++) {
    if (isW(i, 0)) exits.push({ x: i, z: -0.5, dx: 0, dz: -1 }); if (isW(i, N - 1)) exits.push({ x: i, z: N - 0.5, dx: 0, dz: 1 })
    if (isW(0, i)) exits.push({ x: -0.5, z: i, dx: -1, dz: 0 }); if (isW(N - 1, i)) exits.push({ x: N - 0.5, z: i, dx: 1, dz: 0 })
  }
  function riverOut(x, z) {
    let best = 0
    for (const e of exits) {
      const along = (x - e.x) * e.dx + (z - e.z) * e.dz; if (along < -0.5) continue
      const side = e.dx ? z - e.z : x - e.x, wig = fbm(along * 0.05 + e.x, 3.3, 2) * Math.min(6, along * 0.25)
      const w = 0.9 + Math.min(2.5, along * 0.04), d = Math.abs(side - wig)
      best = Math.max(best, 1 - sstep(w * 0.5, w, d))
    }
    return best
  }
  // shahar to'rtburchagidan tashqari masofa (ichkarida manfiy)
  const outside = (x, z) => Math.max(-0.5 - x, x - (N - 0.5), -0.5 - z, z - (N - 0.5))
  // darvozalardan chiqadigan yo'llar (tuproq yo'l)
  function roadAt(x, z) {
    let r = 0
    for (const g of gates) {
      const dx = g.dx, dz = g.dy, along = (x - g.x) * dx + (z - g.y) * dz; if (along < -1) continue
      const side = dx ? z - g.y : x - g.x, wig = fbm(along * 0.06, g.x + g.y, 2) * Math.min(4, along * 0.15)
      r = Math.max(r, 1 - sstep(0.35, 0.75, Math.abs(side - wig)))
    }
    return r
  }
  function roadDist(x, z) {
    let best = 1e9
    for (const g of gates) {
      const dx = g.dx, dz = g.dy, along = (x - g.x) * dx + (z - g.y) * dz; if (along < -1 || along > 24) continue
      const side = dx ? z - g.y : x - g.x, wig = fbm(along * 0.06, g.x + g.y, 2) * Math.min(4, along * 0.15)
      best = Math.min(best, Math.abs(side - wig))
    }
    return best
  }
  // binolar ostini tekislash
  let flats = []
  function setBuildings(list) { flats = list.map((b) => ({ ...b, h: raw(b.cx, b.cz) })) }

  function raw(x, z) {
    const o = outside(x, z)
    // shahar ichi: yengil bo'rtiqlar (bo'rtib chiqqan joylar)
    let h = fbm(x * 0.13 + 7, z * 0.13 + 3) * 0.16 + fbm(x * 0.5, z * 0.5) * 0.035
    // tashqarida: adirlar, uzoqda tog'lar
    if (o > 0) {
      const t = sstep(1.5, 10, o)
      const hills = (fbm(x * 0.045 + 11, z * 0.045 - 5) * 0.5 + 0.5) * 3.2 + fbm(x * 0.12, z * 0.12) * 0.6
      const r = Math.hypot(x - C, z - C)
      const mount = sstep(34, 58, r) * (Math.pow(fbm(x * 0.03 - 20, z * 0.03 + 9, 5) * 0.5 + 0.5, 1.6) * 16 + 2)
      h = h * (1 - t) + (hills * t) + mount
      h *= 1 - sstep(0.55, 0.85, roadAt(x, z)) * 0.6   // yo'l pastroq va tekisroq
      h = h * (1 - sstep(2.5, 0, o) * 1) + 0   // devor ostida tekis (0)
    }
    // daryo o'zani
    const w = o > 0 ? riverOut(x, z) : waterIn(x, z)
    if (w > 0) h = h * (1 - w) + (-0.55) * w
    return h
  }
  function H(x, z) {
    let h = raw(x, z)
    for (const f of flats) {
      const dx = Math.max(Math.abs(x - f.cx) - f.hw, 0), dz = Math.max(Math.abs(z - f.cz) - f.hw, 0), d = Math.hypot(dx, dz)
      if (d < 0.9) { const k = 1 - sstep(0.1, 0.9, d); h = h * (1 - k) + f.h * k }
    }
    return h
  }

  // ---------- Yer mesh ----------
  function buildMesh(res = 2) {
    const S = WORLD_R * 2, seg = Math.round(S * res / 2) * 2
    const geo = new THREE.PlaneGeometry(S, S, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(C, 0, C)
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color()
    const GR = [new THREE.Color('#6fae4c'), new THREE.Color('#8cc25e'), new THREE.Color('#5c9a42')]
    const SAND = new THREE.Color('#c8b98a'), DIRT = new THREE.Color('#9b7a52'), ROCK = new THREE.Color('#8a8578'), SNOW = new THREE.Color('#f2f4f6'), DRY = new THREE.Color('#a9b763')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = H(x, z); pos.setY(i, h)
      const n = fbm(x * 0.2, z * 0.2, 2) * 0.5 + 0.5, n2 = vnoise(x * 1.3, z * 1.3)
      c.copy(GR[0]).lerp(GR[1], n).lerp(GR[2], sstep(0.55, 0.85, n2) * 0.5)
      const o = outside(x, z)
      if (o > 0) {
        c.lerp(DRY, sstep(1.5, 4.5, h) * 0.6)
        const sl = Math.abs(H(x + 0.5, z) - h) + Math.abs(H(x, z + 0.5) - h)
        c.lerp(ROCK, Math.max(sstep(0.35, 0.8, sl), sstep(6, 9, h)))
        c.lerp(SNOW, sstep(11, 14, h))
        c.lerp(DIRT, sstep(0.45, 0.85, roadAt(x, z)) * 0.85)
      }
      c.lerp(SAND, sstep(0.0, -0.3, h) * 0.85)
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }))
    return m
  }

  // devordan tashqaridagi o'rmonlar, toshlar, o'tlar
  function scatterOutside(sc, q = 'med') {
    const rnd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) }
    const trees = [], step = q === 'low' ? 2.3 : q === 'high' ? 1.35 : 1.7
    let i = 0, cnt = { tree: 0, far: 0, cover: 0 }; const far = []
    // 1) daraxtlar va toshlar (o'rmonlar dog'-dog' bo'lib)
    for (let z = C - WORLD_R + 2; z < C + WORLD_R - 2; z += step) for (let x = C - WORLD_R + 2; x < C + WORLD_R - 2; x += step) {
      i++
      const jx = x + (rnd(i, 1) - 0.5) * step, jz = z + (rnd(i, 2) - 0.5) * step, o = outside(jx, jz)
      if (o < 3 || Math.hypot(jx - C, jz - C) > WORLD_R - 3) continue
      const h = H(jx, jz); if (h < 0.05 || roadDist(jx, jz) < 3.9) continue
      const forest = fbm(jx * 0.07 + 40, jz * 0.07 - 12, 3), r = rnd(i, 3)
      if (forest > 0.05 && r < 0.62 && h < 9) {
        const pine = h > 2.2 || forest > 0.3, n = (pine ? 'Pine_' : 'CommonTree_') + (1 + Math.floor(rnd(i, 4) * 5)), sz = 0.3 + rnd(i, 6) * 0.16
        // yaqindagilari — haqiqiy model, uzoqdagilari — yengil (tez chiziladi)
        if (o < 9) { sc.add(n, jx, h - 0.05, jz, rnd(i, 5) * 6.28, sz); cnt.tree++ } else { far.push([jx, h - 0.05, jz, pine ? 1 : 0, sz, rnd(i, 5) * 6.28, rnd(i, 13)]); cnt.far++ }
        trees.push([jx, jz])
        if (q !== 'low' && rnd(i, 7) > 0.65) sc.add(rnd(i, 8) > 0.5 ? 'Bush_Common' : 'Fern_1', jx + 0.5, H(jx + 0.5, jz), jz + 0.3, rnd(i, 9) * 6, 0.24)
      } else if (r > 0.9 && h < 10) sc.add('Rock_Medium_' + (1 + Math.floor(rnd(i, 10) * 3)), jx, h - 0.1, jz, rnd(i, 11) * 6, 0.3 + rnd(i, 12) * 0.6)
    }
    // 2) devor yonidagi o'tloq: o't, gul, butalar (past sifatda yo'q)
    if (q !== 'low') for (let z = C - 26; z < C + 26; z += 0.9) for (let x = C - 26; x < C + 26; x += 0.9) {
      i++
      const jx = x + (rnd(i, 1) - 0.5) * 0.9, jz = z + (rnd(i, 2) - 0.5) * 0.9, o = outside(jx, jz)
      if (o < 1.6 || o > 13) continue
      const h = H(jx, jz), r = rnd(i, 3); if (h < 0.02 || h > 3 || r < 0.45 || roadAt(jx, jz) > 0.3) continue
      sc.add(['Grass_Common_Short', 'Grass_Wispy_Short', 'Grass_Common_Tall'][Math.floor(rnd(i, 4) * 3)], jx, h, jz, rnd(i, 5) * 6, 0.15 + rnd(i, 6) * 0.07); cnt.cover++
      if (r > 0.9) sc.add(rnd(i, 7) > 0.5 ? 'Flower_3_Group' : 'Flower_4_Group', jx + 0.3, H(jx + 0.3, jz), jz, rnd(i, 8) * 6, 0.12)
    }
    console.log('tashqi tabiat:', cnt)
    trees.far = far
    return trees
  }
  return { H, raw, outside, roadAt, setBuildings, buildMesh, scatterOutside }
}

// ---------- Uzoqdagi daraxtlar: juda yengil (qarag'ay — konuslar, bargli — yumaloq toj) ----------
export function farTrees(list, shadow) {
  const g = new THREE.Group(); if (!list.length) return g
  const mk = (geo, color, items, fn) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }), items.length)
    const o = new THREE.Object3D(), c = new THREE.Color()
    items.forEach((t, i) => { fn(o, t); o.updateMatrix(); m.setMatrixAt(i, o.matrix); c.set(color).multiplyScalar(0.85 + t[6] * 0.3); m.setColorAt(i, c) })
    m.castShadow = shadow; g.add(m)
  }
  const pines = list.filter((t) => t[3]), leafy = list.filter((t) => !t[3])
  const pineGeo = new THREE.ConeGeometry(1, 2.2, 7); pineGeo.translate(0, 1.1, 0)
  const pine2 = new THREE.ConeGeometry(0.75, 1.7, 7); pine2.translate(0, 2.4, 0)
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 5); trunk.translate(0, 0.6, 0)
  const crown = new THREE.IcosahedronGeometry(1.25, 1); crown.scale(1, 0.9, 1); crown.translate(0, 2.35, 0)
  const S = 3.0   // model o'lchami (haqiqiy daraxtlarga mos)
  mk(trunk, '#6b4a2f', list, (o, t) => { o.position.set(t[0], t[1], t[2]); o.rotation.set(0, t[5], 0); o.scale.setScalar(t[4] * S * 1.1) })
  mk(pineGeo, '#2f6b3a', pines, (o, t) => { o.position.set(t[0], t[1] + t[4] * S * 0.7, t[2]); o.rotation.set(0, t[5], 0); o.scale.set(t[4] * S * 0.95, t[4] * S * 1.35, t[4] * S * 0.95) })
  mk(pine2, '#3a7d44', pines, (o, t) => { o.position.set(t[0], t[1] + t[4] * S * 0.7, t[2]); o.rotation.set(0, t[5], 0); o.scale.set(t[4] * S * 0.95, t[4] * S * 1.35, t[4] * S * 0.95) })
  mk(crown, '#4f8f3a', leafy, (o, t) => { o.position.set(t[0], t[1], t[2]); o.rotation.set(0, t[5], 0); o.scale.setScalar(t[4] * S * 1.1) })
  return g
}

// ---------- Osmon: gradient gumbaz, quyosh/oy, yulduzlar, bulutlar ----------
export function createSky(scene) {
  const uni = { top: { value: new THREE.Color('#3f86d8') }, mid: { value: new THREE.Color('#8fc3ef') }, bot: { value: new THREE.Color('#d9ecf7') }, sunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() }, sunCol: { value: new THREE.Color('#fff2c4') }, sunSize: { value: 0.9985 } }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(230, 32, 16), new THREE.ShaderMaterial({
    uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot, sunCol, sunDir; uniform float sunSize; varying vec3 vD;
      void main(){ float h = vD.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.25, h));
        c = mix(bot, c, smoothstep(-0.02, 0.12, h) * 0.6 + 0.4);
        float s = dot(normalize(vD), sunDir); c += sunCol * (smoothstep(sunSize, sunSize + 0.0008, s) * 1.6 + pow(max(s, 0.0), 220.0) * 0.5 + pow(max(s, 0.0), 8.0) * 0.12);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }))
  dome.renderOrder = -10; scene.add(dome)
  // yulduzlar (tunda)
  const sg = new THREE.BufferGeometry(), sp = []
  for (let i = 0; i < 700; i++) { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, y = Math.abs(u) * 0.9 + 0.08, r = Math.sqrt(1 - y * y); sp.push(Math.cos(t) * r * 220, y * 220, Math.sin(t) * r * 220) }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }))
  scene.add(stars)
  // bulutlar: bir nechta yumaloq bo'laklardan, sekin suzadi
  const clouds = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#c9d6e3', emissiveIntensity: 0.35, flatShading: true, fog: false })
  const ball = new THREE.IcosahedronGeometry(1, 1)
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group(), n = 4 + Math.floor(Math.random() * 5)
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(ball, cm); const s = 2.2 + Math.random() * 2.6; m.scale.set(s * 1.4, s * 0.7, s); m.position.set(k * 2.6 - n * 1.3 + Math.random(), Math.random() * 1.2, Math.random() * 2.5); g.add(m) }
    const a = Math.random() * Math.PI * 2, r = 25 + Math.random() * 120
    g.position.set(Math.cos(a) * r, 26 + Math.random() * 18, Math.sin(a) * r); g.rotation.y = Math.random() * 3; g.userData.v = 0.4 + Math.random() * 0.6
    clouds.add(g)
  }
  scene.add(clouds)
  const DAY = { top: '#3f86d8', mid: '#8fc3ef', bot: '#d9ecf7', sun: '#fff2c4', size: 0.9985 }, NIGHT = { top: '#0b1430', mid: '#1f3260', bot: '#3a4f80', sun: '#dfe8ff', size: 0.9992 }
  let k = 0
  return {
    dome, clouds,
    horizon: new THREE.Color(DAY.bot),
    update(dt, center, night, sunDir) {
      k += ((night ? 1 : 0) - k) * Math.min(1, dt * 1.5)
      const L = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), k)
      uni.top.value.copy(L(DAY.top, NIGHT.top)); uni.mid.value.copy(L(DAY.mid, NIGHT.mid)); uni.bot.value.copy(L(DAY.bot, NIGHT.bot)); uni.sunCol.value.copy(L(DAY.sun, NIGHT.sun)); uni.sunSize.value = DAY.size + (NIGHT.size - DAY.size) * k
      if (sunDir) uni.sunDir.value.copy(sunDir).normalize()
      this.horizon.copy(uni.bot.value)
      dome.position.copy(center); stars.position.copy(center); stars.material.opacity = k * 0.9
      cm.color.set(night ? '#7d8bb0' : '#ffffff'); cm.emissiveIntensity = night ? 0.05 : 0.35
      for (const c of clouds.children) { c.position.x += c.userData.v * dt; if (c.position.x > 150) c.position.x = -150 }
      clouds.position.set(center.x, 0, center.z)
    },
  }
}
