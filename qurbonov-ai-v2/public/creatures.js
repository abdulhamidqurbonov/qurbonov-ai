// ============ Shinobu olami — o'zimiz yasagan 3D jonzotlar ============
// Odamlar (dehqon, o'tinchi, konchi, savdogar, askarlar), maxluqlar (ko'rshapalak, bo'ri, goblin, trol)
// va hayvonlar (qo'y, tovuq, quyon, kiyik). Hammasi past-poligonli, qo'l-oyoqlari bo'g'imli — kod bilan animatsiya qilinadi.
// Yo'nalish: oldi +Z tomonga qaragan.

import * as THREE from 'three'

const matCache = new Map()
export function mat(c, o = {}) {
  const k = c + JSON.stringify(o)
  if (matCache.has(k)) return matCache.get(k)
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true, ...o })
  matCache.set(k, m)
  return m
}
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sph: (r, a = 8, b = 6) => new THREE.SphereGeometry(r, a, b),
  cyl: (t, b, h, s = 7) => new THREE.CylinderGeometry(t, b, h, s),
  cone: (r, h, s = 6) => new THREE.ConeGeometry(r, h, s),
  ico: (r) => new THREE.IcosahedronGeometry(r, 0),
}
let SHADOW = true
export function setShadows(v) { SHADOW = v }
function M(geo, material, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, material); o.position.set(x, y, z); o.castShadow = SHADOW; return o }
function pivot(x, y, z, ...kids) { const p = new THREE.Group(); p.position.set(x, y, z); kids.forEach((k) => p.add(k)); return p }

// ---------------- ODAMLAR ----------------
// opts: skin, shirt, pants, hair, hat ('straw'|'helmet'|'cap'|'hood'|'crown'|null), tool ('hoe'|'axe'|'pick'|'basket'|'sword'|'bow'|'spear'|null), cape, s (masshtab)
export function makeHumanoid(opts = {}) {
  const o = { skin: '#f3d2b8', shirt: '#4f7fe0', pants: '#4a4a5a', hair: '#5a3a24', shoes: '#3a2a20', s: 1, ...opts }
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body)
  const s = o.s
  // tana
  const torso = M(G.box(0.16, 0.17, 0.1), mat(o.shirt), 0, 0.27, 0); body.add(torso)
  body.add(M(G.box(0.165, 0.04, 0.105), mat(o.belt || '#5b3a22'), 0, 0.2, 0))
  // bosh (chibi — katta)
  const head = pivot(0, 0.36, 0)
  head.add(M(G.box(0.17, 0.16, 0.15), mat(o.skin), 0, 0.08, 0))
  head.add(M(G.box(0.18, 0.06, 0.16), mat(o.hair), 0, 0.16, -0.005))
  head.add(M(G.box(0.18, 0.1, 0.04), mat(o.hair), 0, 0.11, -0.065))
  const eyeM = mat('#1b1d22')
  head.add(M(G.box(0.025, 0.035, 0.01), eyeM, -0.04, 0.08, 0.076), M(G.box(0.025, 0.035, 0.01), eyeM, 0.04, 0.08, 0.076))
  head.add(M(G.box(0.03, 0.015, 0.01), mat('#ff9a9a'), -0.06, 0.05, 0.076), M(G.box(0.03, 0.015, 0.01), mat('#ff9a9a'), 0.06, 0.05, 0.076))
  if (o.hat === 'straw') { head.add(M(G.cyl(0.15, 0.15, 0.015, 10), mat('#e8c46a'), 0, 0.19, 0), M(G.cyl(0.07, 0.09, 0.06, 10), mat('#e0b85a'), 0, 0.22, 0)) }
  if (o.hat === 'helmet') { head.add(M(G.sph(0.105, 10, 6), mat('#f4c542'), 0, 0.16, 0), M(G.box(0.03, 0.03, 0.02), mat('#fff6a0', { emissive: '#ffee88' }), 0, 0.2, 0.1)) }
  if (o.hat === 'knight') { head.add(M(G.box(0.19, 0.18, 0.17), mat('#c9ced6', { metalness: 0.6, roughness: 0.4 }), 0, 0.09, 0), M(G.box(0.12, 0.02, 0.01), mat('#1b1d22'), 0, 0.09, 0.087), M(G.cone(0.03, 0.12, 5), mat('#e2304b'), 0, 0.23, 0)) }
  if (o.hat === 'cap') head.add(M(G.box(0.18, 0.05, 0.17), mat(o.capColor || '#e2304b'), 0, 0.17, 0), M(G.box(0.12, 0.015, 0.06), mat(o.capColor || '#e2304b'), 0, 0.15, 0.1))
  if (o.hat === 'hood') head.add(M(G.box(0.19, 0.17, 0.17), mat(o.hoodColor || '#3f7a3a'), 0, 0.1, -0.01))
  body.add(head)
  // qo'llar (yelkadan aylanadi)
  const armGeo = G.box(0.05, 0.15, 0.05)
  const armL = pivot(-0.105, 0.34, 0, M(armGeo, mat(o.shirt), 0, -0.07, 0), M(G.box(0.045, 0.04, 0.045), mat(o.skin), 0, -0.16, 0))
  const armR = pivot(0.105, 0.34, 0, M(armGeo, mat(o.shirt), 0, -0.07, 0), M(G.box(0.045, 0.04, 0.045), mat(o.skin), 0, -0.16, 0))
  body.add(armL, armR)
  // oyoqlar (sondan aylanadi)
  const legGeo = G.box(0.06, 0.15, 0.06)
  const legL = pivot(-0.045, 0.19, 0, M(legGeo, mat(o.pants), 0, -0.075, 0), M(G.box(0.065, 0.035, 0.08), mat(o.shoes), 0, -0.15, 0.01))
  const legR = pivot(0.045, 0.19, 0, M(legGeo, mat(o.pants), 0, -0.075, 0), M(G.box(0.065, 0.035, 0.08), mat(o.shoes), 0, -0.15, 0.01))
  body.add(legL, legR)
  if (o.cape) { const c = pivot(0, 0.34, -0.055, M(G.box(0.17, 0.22, 0.015), mat(o.cape), 0, -0.11, 0)); body.add(c); root.userData.cape = c }
  if (o.shield) armL.add(M(G.box(0.02, 0.13, 0.11), mat(o.shield, { metalness: 0.3 }), -0.035, -0.12, 0.02))
  // asbob o'ng qo'lda
  const tool = new THREE.Group(); tool.position.set(0, -0.17, 0.02); armR.add(tool)
  const wood = mat('#8a5a3c'), steel = mat('#d9dde4', { metalness: 0.7, roughness: 0.3 })
  if (o.tool === 'hoe') { tool.add(M(G.cyl(0.008, 0.008, 0.3), wood, 0, 0.02, 0.06), M(G.box(0.07, 0.02, 0.04), steel, 0, 0.16, 0.08)); tool.rotation.x = 1.2 }
  if (o.tool === 'axe') { tool.add(M(G.cyl(0.009, 0.009, 0.22), wood, 0, 0.08, 0), M(G.box(0.012, 0.06, 0.07), steel, 0, 0.17, 0.03)); tool.rotation.x = 1.4 }
  if (o.tool === 'pick') { tool.add(M(G.cyl(0.009, 0.009, 0.22), wood, 0, 0.08, 0), M(G.box(0.14, 0.02, 0.02), steel, 0, 0.18, 0)); tool.rotation.x = 1.4 }
  if (o.tool === 'sword') { tool.add(M(G.box(0.015, 0.2, 0.006), steel, 0, 0.12, 0), M(G.box(0.06, 0.012, 0.02), mat('#d9b13b'), 0, 0.02, 0)); tool.rotation.x = 1.3 }
  if (o.tool === 'spear') { tool.add(M(G.cyl(0.007, 0.007, 0.42), wood, 0, 0.08, 0), M(G.cone(0.018, 0.06, 4), steel, 0, 0.31, 0)); tool.rotation.x = 0.2 }
  if (o.tool === 'bow') { const b = M(new THREE.TorusGeometry(0.09, 0.008, 4, 10, Math.PI), wood, 0, 0.02, 0.02); b.rotation.z = Math.PI / 2; tool.add(b) }
  if (o.tool === 'basket') { tool.add(M(G.cyl(0.05, 0.04, 0.05, 8), mat('#c98f5a'), 0, -0.01, 0.03)) }
  // ko'tarib yuradigan yuk (yog'och, tosh, savat)
  const load = new THREE.Group(); load.position.set(0, 0.6, 0.0); load.visible = false; body.add(load)
  root.userData.parts = { body, head, armL, armR, legL, legR, tool, load }
  root.scale.setScalar(s)
  return root
}
export function setLoad(h, kind) {
  const L = h.userData.parts.load
  while (L.children.length) L.remove(L.children[0])
  L.visible = !!kind
  if (kind === 'wood') { for (let i = 0; i < 2; i++) { const l = M(G.cyl(0.025, 0.025, 0.2, 6), mat('#b9814f'), 0, i * 0.045, 0); l.rotation.z = Math.PI / 2; L.add(l) } }
  if (kind === 'stone') L.add(M(G.ico(0.05), mat('#9aa0aa'), 0, 0.02, 0))
  if (kind === 'food') L.add(M(G.cyl(0.06, 0.05, 0.05, 8), mat('#c98f5a'), 0, 0, 0), M(G.sph(0.025), mat('#e2304b'), 0.02, 0.03, 0), M(G.sph(0.025), mat('#7fbf4a'), -0.02, 0.03, 0.01))
  if (kind === 'gold') L.add(M(G.cyl(0.045, 0.05, 0.04, 8), mat('#8a5a3c'), 0, 0, 0), M(G.sph(0.02), mat('#f4c542', { emissive: '#4a3a00' }), 0, 0.025, 0))
}
// action: 'idle' | 'walk' | 'run' | 'work' | 'attack' | 'cheer' | 'carry'
export function animateHumanoid(h, t, action, k = 1) {
  const p = h.userData.parts; if (!p) return
  const w = action === 'run' ? 14 : 9, sw = Math.sin(t * w * k)
  const moving = action === 'walk' || action === 'run' || action === 'carry'
  const amp = action === 'run' ? 0.9 : 0.6
  p.legL.rotation.x = moving ? sw * amp : 0; p.legR.rotation.x = moving ? -sw * amp : 0
  p.body.position.y = moving ? Math.abs(sw) * 0.02 : Math.sin(t * 2) * 0.004
  p.head.rotation.z = 0
  if (action === 'carry') { p.armL.rotation.x = -2.8; p.armR.rotation.x = -2.8; p.armL.rotation.z = -0.2; p.armR.rotation.z = 0.2 }
  else if (action === 'work') { const c = Math.sin(t * 6); p.armR.rotation.x = -1.2 + c * 1.1; p.armL.rotation.x = -0.9 + c * 0.6; p.body.rotation.x = 0.15 + c * 0.08 }
  else if (action === 'attack') { const c = Math.sin(t * 10); p.armR.rotation.x = -1.6 + c * 1.3; p.armL.rotation.x = -0.4; p.body.rotation.y = c * 0.2 }
  else if (action === 'cheer') { p.armL.rotation.x = -2.9 + Math.sin(t * 8) * 0.3; p.armR.rotation.x = -2.9 - Math.sin(t * 8) * 0.3; p.body.position.y = Math.abs(Math.sin(t * 8)) * 0.05 }
  else { p.armL.rotation.x = moving ? -sw * amp * 0.8 : Math.sin(t * 2) * 0.05; p.armR.rotation.x = moving ? sw * amp * 0.8 : -Math.sin(t * 2) * 0.05; p.armL.rotation.z = 0; p.armR.rotation.z = 0; p.body.rotation.x = 0; p.body.rotation.y = 0 }
  if (action !== 'work' && action !== 'attack') { p.body.rotation.x = 0; p.body.rotation.y = 0 }
  if (h.userData.cape) h.userData.cape.rotation.x = moving ? 0.3 + Math.abs(sw) * 0.2 : 0.05
}
export const VILLAGER = {
  farmer: { shirt: '#7fbf4a', pants: '#6b4a2e', hat: 'straw', tool: 'hoe' },
  lumber: { shirt: '#c0392b', pants: '#3b4a6b', hat: 'cap', capColor: '#2c3e50', tool: 'axe', hair: '#3a2418' },
  miner: { shirt: '#6b6b6b', pants: '#3a3a44', hat: 'helmet', tool: 'pick', skin: '#e9c2a2' },
  merchant: { shirt: '#9b59b6', pants: '#2c2c3a', hat: 'cap', capColor: '#f4c542', tool: 'basket', hair: '#1b1b1b' },
  villager: { shirt: '#f39c12', pants: '#5a4a3a', tool: null, hair: '#8a5a3c' },
  girl: { shirt: '#ff8fb1', pants: '#ff8fb1', tool: 'basket', hair: '#d9a066', skin: '#f6dcc8' },
}
export const SOLDIER = {
  soldier: { shirt: '#4f7fe0', pants: '#2c3e50', hat: 'cap', capColor: '#3a5fb0', tool: 'sword', shield: '#4f7fe0', cape: '#3a5fb0' },
  archer: { shirt: '#4fae5b', pants: '#3a4a2a', hat: 'hood', hoodColor: '#3f7a3a', tool: 'bow' },
  knight: { shirt: '#c9ced6', pants: '#8a8f98', hat: 'knight', tool: 'spear', shield: '#d9b13b', cape: '#e2304b' },
}

// ---------------- MAXLUQLAR ----------------
export function makeMonster3D(type) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body)
  const P = { body }
  const glow = (c) => mat(c, { emissive: c, emissiveIntensity: 1.4 })
  if (type === 'bat') {
    body.add(M(G.sph(0.09, 8, 6), mat('#4b3a6b'), 0, 0, 0))
    body.add(M(G.cone(0.03, 0.07, 4), mat('#3a2c55'), -0.05, 0.09, 0), M(G.cone(0.03, 0.07, 4), mat('#3a2c55'), 0.05, 0.09, 0))
    body.add(M(G.sph(0.017), glow('#ff3b3b'), -0.035, 0.02, 0.08), M(G.sph(0.017), glow('#ff3b3b'), 0.035, 0.02, 0.08))
    body.add(M(G.cone(0.008, 0.025, 3), mat('#ffffff'), -0.015, -0.04, 0.08), M(G.cone(0.008, 0.025, 3), mat('#ffffff'), 0.015, -0.04, 0.08))
    for (const s of [-1, 1]) {
      const w = pivot(s * 0.07, 0.02, 0)
      const a = M(G.box(0.16, 0.012, 0.15), mat('#2c2244'), s * 0.08, 0, -0.01); w.add(a)
      const w2 = pivot(s * 0.16, 0, 0, M(G.box(0.13, 0.01, 0.17), mat('#3a2c55'), s * 0.065, 0, -0.03)); w.add(w2)
      body.add(w); P[s < 0 ? 'wingL' : 'wingR'] = w; P[s < 0 ? 'wingL2' : 'wingR2'] = w2
    }
    root.userData.fly = 0.55
  } else if (type === 'wolf') {
    const fur = mat('#7d7f88'), dark = mat('#5a5c64')
    body.add(M(G.box(0.16, 0.14, 0.34), fur, 0, 0.22, 0))
    body.add(M(G.box(0.17, 0.08, 0.14), mat('#9a9ca5'), 0, 0.27, 0.1))
    const head = pivot(0, 0.28, 0.17)
    head.add(M(G.box(0.14, 0.12, 0.13), fur, 0, 0.02, 0.05), M(G.box(0.08, 0.06, 0.09), mat('#9a9ca5'), 0, -0.01, 0.15), M(G.box(0.03, 0.025, 0.02), mat('#1b1d22'), 0, 0.01, 0.2))
    head.add(M(G.cone(0.03, 0.07, 4), dark, -0.04, 0.1, 0.02), M(G.cone(0.03, 0.07, 4), dark, 0.04, 0.1, 0.02))
    head.add(M(G.sph(0.013), glow('#ffd24a'), -0.035, 0.04, 0.115), M(G.sph(0.013), glow('#ffd24a'), 0.035, 0.04, 0.115))
    body.add(head); P.head = head
    const tail = pivot(0, 0.26, -0.17, M(G.box(0.05, 0.05, 0.16), dark, 0, 0.02, -0.08)); tail.rotation.x = -0.5; body.add(tail); P.tail = tail
    const legs = []
    for (const [x, z] of [[-0.06, 0.12], [0.06, 0.12], [-0.06, -0.12], [0.06, -0.12]]) { const l = pivot(x, 0.16, z, M(G.box(0.045, 0.16, 0.045), dark, 0, -0.08, 0)); body.add(l); legs.push(l) }
    P.legs = legs
  } else {
    const big = type === 'troll'
    const k = big ? 1.9 : 1
    const skin = mat(big ? '#6b8a7a' : '#5e9a3a'), cloth = mat(big ? '#5a4632' : '#6b4a2e')
    body.add(M(G.box(0.17 * k, 0.17 * k, 0.12 * k), skin, 0, 0.24 * k, 0))
    if (big) body.add(M(G.sph(0.1 * k, 8, 6), skin, 0, 0.21 * k, 0.04 * k))
    body.add(M(G.box(0.175 * k, 0.07 * k, 0.125 * k), cloth, 0, 0.16 * k, 0))
    const head = pivot(0, 0.33 * k, 0)
    head.add(M(G.box(0.15 * k, 0.13 * k, 0.13 * k), skin, 0, 0.065 * k, 0.01 * k))
    for (const s of [-1, 1]) { const e = M(G.cone(0.025 * k, 0.11 * k, 4), skin, s * 0.1 * k, 0.09 * k, 0); e.rotation.z = -s * 1.2; head.add(e) }
    head.add(M(G.box(0.03 * k, 0.025 * k, 0.01), glow('#ff3b3b'), -0.035 * k, 0.08 * k, 0.075 * k), M(G.box(0.03 * k, 0.025 * k, 0.01), glow('#ff3b3b'), 0.035 * k, 0.08 * k, 0.075 * k))
    head.add(M(G.box(0.07 * k, 0.012 * k, 0.01), mat('#2a1a1a'), 0, 0.035 * k, 0.076 * k))
    if (big) head.add(M(G.cone(0.012 * k, 0.04 * k, 4), mat('#f3efe7'), -0.03 * k, 0.03 * k, 0.07 * k), M(G.cone(0.012 * k, 0.04 * k, 4), mat('#f3efe7'), 0.03 * k, 0.03 * k, 0.07 * k))
    body.add(head); P.head = head
    const armG = G.box(0.05 * k, 0.16 * k, 0.05 * k)
    const armL = pivot(-0.11 * k, 0.31 * k, 0, M(armG, skin, 0, -0.08 * k, 0)), armR = pivot(0.11 * k, 0.31 * k, 0, M(armG, skin, 0, -0.08 * k, 0))
    const club = new THREE.Group(); club.position.set(0, -0.17 * k, 0.02 * k)
    club.add(M(G.cyl(0.015 * k, 0.03 * k, 0.24 * k, 6), mat('#8a5a3c'), 0, 0.1 * k, 0)); if (big) club.add(M(G.sph(0.05 * k, 6, 5), mat('#7a4a2c'), 0, 0.23 * k, 0))
    club.rotation.x = 1.3; armR.add(club)
    body.add(armL, armR); P.armL = armL; P.armR = armR
    const legG = G.box(0.06 * k, 0.13 * k, 0.06 * k)
    P.legL = pivot(-0.05 * k, 0.13 * k, 0, M(legG, cloth, 0, -0.065 * k, 0)); P.legR = pivot(0.05 * k, 0.13 * k, 0, M(legG, cloth, 0, -0.065 * k, 0))
    body.add(P.legL, P.legR)
  }
  root.userData.parts = P; root.userData.type = type
  root.traverse((c) => { if (c.isMesh) { c.material = c.material.clone(); c.material.userData.em = '#' + c.material.emissive.getHexString(); c.material.userData.ei = c.material.emissiveIntensity } })
  return root
}
// state: 'move' | 'attack' | 'idle'
export function animateMonster(o, t, state, seed = 0) {
  const P = o.userData.parts, type = o.userData.type
  if (type === 'bat') {
    const f = Math.sin(t * 22 + seed)
    P.wingL.rotation.z = f * 0.7; P.wingR.rotation.z = -f * 0.7; P.wingL2.rotation.z = f * 0.5; P.wingR2.rotation.z = -f * 0.5
    P.body.position.y = o.userData.fly + Math.sin(t * 3 + seed) * 0.06
    P.body.rotation.x = state === 'attack' ? Math.sin(t * 12) * 0.5 : 0.1
  } else if (type === 'wolf') {
    const g = state === 'move' ? Math.sin(t * 14 + seed) : 0
    P.legs[0].rotation.x = g * 0.8; P.legs[3].rotation.x = g * 0.8; P.legs[1].rotation.x = -g * 0.8; P.legs[2].rotation.x = -g * 0.8
    P.body.position.y = Math.abs(g) * 0.03
    P.tail.rotation.y = Math.sin(t * 8 + seed) * 0.4
    P.head.rotation.x = state === 'attack' ? -0.3 + Math.sin(t * 14) * 0.4 : Math.sin(t * 2) * 0.05
    P.body.position.z = state === 'attack' ? Math.max(0, Math.sin(t * 7)) * 0.08 : 0
  } else {
    const sp = o.userData.type === 'troll' ? 6 : 10, g = state === 'move' ? Math.sin(t * sp + seed) : 0
    P.legL.rotation.x = g * 0.7; P.legR.rotation.x = -g * 0.7
    P.armL.rotation.x = -g * 0.6
    P.armR.rotation.x = state === 'attack' ? -2.2 + Math.max(0, Math.sin(t * 8)) * 2.4 : g * 0.6
    P.body.position.y = Math.abs(g) * 0.025
    P.body.rotation.z = o.userData.type === 'troll' ? Math.sin(t * 3) * 0.06 : 0
  }
}
export function flashMonster(o, on) {
  o.traverse((c) => { if (c.isMesh) { c.material.emissive.set(on ? '#ffffff' : c.material.userData.em); c.material.emissiveIntensity = on ? 0.9 : c.material.userData.ei } })
}

// ---------------- HAYVONLAR ----------------
export function makeAnimal(type) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body)
  const P = { body, legs: [] }
  const eye = mat('#1b1d22')
  if (type === 'sheep') {
    const wool = mat('#f6f4ee'), face = mat('#3a3330')
    for (const [x, y, z, r] of [[0, 0.17, 0, 0.11], [0.06, 0.2, 0.05, 0.08], [-0.06, 0.2, 0.05, 0.08], [0.05, 0.19, -0.06, 0.08], [-0.05, 0.19, -0.06, 0.08], [0, 0.24, 0, 0.08]]) body.add(M(G.ico(r), wool, x, y, z))
    const head = pivot(0, 0.2, 0.12, M(G.box(0.08, 0.09, 0.1), face, 0, 0, 0.03), M(G.box(0.02, 0.02, 0.01), mat('#ffffff'), -0.025, 0.02, 0.08), M(G.box(0.02, 0.02, 0.01), mat('#ffffff'), 0.025, 0.02, 0.08))
    body.add(head); P.head = head
    for (const [x, z] of [[-0.05, 0.06], [0.05, 0.06], [-0.05, -0.06], [0.05, -0.06]]) { const l = pivot(x, 0.1, z, M(G.box(0.03, 0.1, 0.03), face, 0, -0.05, 0)); body.add(l); P.legs.push(l) }
    root.userData.speed = 0.25
  } else if (type === 'chicken') {
    const w = mat('#ffffff')
    body.add(M(G.box(0.08, 0.08, 0.1), w, 0, 0.08, 0))
    const head = pivot(0, 0.13, 0.05, M(G.box(0.05, 0.06, 0.05), w, 0, 0.02, 0), M(G.box(0.02, 0.02, 0.03), mat('#f4b544'), 0, 0.01, 0.04), M(G.box(0.015, 0.03, 0.03), mat('#e2304b'), 0, 0.06, 0.005), M(G.box(0.01, 0.01, 0.01), eye, -0.02, 0.03, 0.026), M(G.box(0.01, 0.01, 0.01), eye, 0.02, 0.03, 0.026))
    body.add(head); P.head = head
    body.add(M(G.box(0.05, 0.05, 0.03), w, 0, 0.11, -0.06))
    for (const x of [-0.02, 0.02]) { const l = pivot(x, 0.045, 0, M(G.box(0.01, 0.045, 0.01), mat('#f4b544'), 0, -0.022, 0)); body.add(l); P.legs.push(l) }
    root.userData.speed = 0.35; root.userData.peck = true
  } else if (type === 'rabbit') {
    const f = mat('#c9b59a')
    body.add(M(G.box(0.08, 0.08, 0.11), f, 0, 0.06, 0), M(G.sph(0.025), mat('#ffffff'), 0, 0.07, -0.065))
    const head = pivot(0, 0.11, 0.05, M(G.box(0.065, 0.06, 0.065), f, 0, 0.02, 0.01), M(G.box(0.018, 0.08, 0.012), f, -0.018, 0.08, 0), M(G.box(0.018, 0.08, 0.012), f, 0.018, 0.08, 0), M(G.box(0.01, 0.01, 0.01), eye, -0.02, 0.03, 0.045), M(G.box(0.01, 0.01, 0.01), eye, 0.02, 0.03, 0.045))
    body.add(head); P.head = head
    root.userData.speed = 0.6; root.userData.hop = true
  } else if (type === 'deer') {
    const f = mat('#b07a4a'), l = mat('#8a5a3c')
    body.add(M(G.box(0.12, 0.12, 0.28), f, 0, 0.3, 0), M(G.box(0.08, 0.06, 0.05), mat('#ffffff'), 0, 0.3, -0.15))
    const head = pivot(0, 0.36, 0.13, M(G.box(0.06, 0.16, 0.06), f, 0, 0.07, 0), M(G.box(0.07, 0.07, 0.11), f, 0, 0.16, 0.04), M(G.box(0.012, 0.012, 0.01), eye, -0.03, 0.18, 0.08), M(G.box(0.012, 0.012, 0.01), eye, 0.03, 0.18, 0.08))
    for (const s of [-1, 1]) { const a = M(G.cyl(0.006, 0.008, 0.12, 4), mat('#e8d8b8'), s * 0.03, 0.26, 0.02); a.rotation.z = -s * 0.4; head.add(a); const a2 = M(G.cyl(0.005, 0.006, 0.06, 4), mat('#e8d8b8'), s * 0.06, 0.29, 0.04); a2.rotation.x = 0.6; head.add(a2) }
    body.add(head); P.head = head
    for (const [x, z] of [[-0.04, 0.1], [0.04, 0.1], [-0.04, -0.1], [0.04, -0.1]]) { const lg = pivot(x, 0.24, z, M(G.box(0.03, 0.24, 0.03), l, 0, -0.12, 0)); body.add(lg); P.legs.push(lg) }
    root.userData.speed = 0.5
  }
  root.userData.parts = P; root.userData.type = type
  return root
}
export function animateAnimal(o, t, moving, seed = 0) {
  const P = o.userData.parts
  const g = moving ? Math.sin(t * 12 + seed) : 0
  P.legs.forEach((l, i) => { l.rotation.x = g * 0.7 * (i % 2 ? 1 : -1) * (i > 1 ? -1 : 1) })
  if (o.userData.hop) P.body.position.y = moving ? Math.abs(Math.sin(t * 9 + seed)) * 0.06 : 0
  if (o.userData.peck && !moving) P.head.rotation.x = Math.max(0, Math.sin(t * 5 + seed)) * 0.9
  else if (!moving) P.head.rotation.x = Math.sin(t * 0.8 + seed) * 0.25 + 0.15
  else P.head.rotation.x = 0
}
