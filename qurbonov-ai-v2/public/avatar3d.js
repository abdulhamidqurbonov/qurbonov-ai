// ============ Qurbonov AI — 3D hamroh dvigateli (VRM) ============
// Pozalar: stand, walk, sit, cry, sleep, yawn, angry, sulk, eat, dance, cheer, shy, hug, think, listen
// Hissiyotlar (yuz): neutral, happy, sad, angry, surprised, relaxed, love, sleepy
// Har bir poza — suyaklar uchun maqsad burchaklar; joriy holat ularga silliq o'tadi.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '/vendor/three/three-vrm.module.js'

const cache = new Map()
const pointer = { x: 0, y: 0, t: 0 }
addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now() }, { passive: true })

function loadVRM(url, onProgress) {
  if (!cache.has(url)) {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    cache.set(url, loader.loadAsync(url, (e) => e.total && onProgress?.(e.loaded / e.total)).catch((e) => { cache.delete(url); throw e }))
  }
  return cache.get(url)
}

const lerp = (a, b, k) => a + (b - a) * k
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
  'leftHand', 'rightHand', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot']

// ---- Pozalar: { suyak: [x, y, z] } (radian), drop — sonni pastga tushirish (bo'y ulushida) ----
const ARMS_DOWN = { leftUpperArm: [0, 0, -1.22], rightUpperArm: [0, 0, 1.22], leftLowerArm: [0, 0, -0.12], rightLowerArm: [0, 0, 0.12] }
const KNEES_UP = { leftUpperLeg: [-2.05, 0, -0.12], rightUpperLeg: [-2.05, 0, 0.12], leftLowerLeg: [2.3, 0, 0], rightLowerLeg: [2.3, 0, 0], leftFoot: [-0.25, 0, 0], rightFoot: [-0.25, 0, 0] }
const HUG_ARMS = { leftUpperArm: [-0.35, 0, -1.1], rightUpperArm: [-0.35, 0, 1.1], leftLowerArm: [0, -1.5, 0], rightLowerArm: [0, 1.5, 0] }
const CROSSED = { leftUpperArm: [-0.3, -0.7, -1.1], rightUpperArm: [-0.3, 0.7, 1.1], leftLowerArm: [0, -1.55, 0], rightLowerArm: [0, 1.55, 0] }
const POSES = {
  stand: { ...ARMS_DOWN },
  listen: { ...ARMS_DOWN, head: [-0.03, 0, 0.16] },
  think: { ...ARMS_DOWN, head: [-0.2, 0.15, -0.12], rightUpperArm: [-0.75, 0, 1.0], rightLowerArm: [0, 2.2, 0] },
  sit: { drop: 0.62, spine: [0.15, 0, 0], ...KNEES_UP, ...HUG_ARMS },
  cry: { drop: 0.62, spine: [0.32, 0, 0], chest: [0.18, 0, 0], head: [0.42, 0, 0], ...KNEES_UP,
    leftUpperArm: [-1.1, -0.5, -0.9], rightUpperArm: [-1.1, 0.5, 0.9], leftLowerArm: [0, -1.7, 0], rightLowerArm: [0, 1.7, 0] },
  sleep: { drop: 0.62, spine: [0.38, 0, 0], chest: [0.2, 0, 0], head: [0.55, 0, 0.25], ...KNEES_UP, ...HUG_ARMS },
  yawn: { head: [-0.25, 0, 0], spine: [-0.08, 0, 0], leftUpperArm: [0, 0, 1.25], rightUpperArm: [0, 0, -1.25], leftLowerArm: [0, -0.6, 0], rightLowerArm: [0, 0.6, 0] },
  angry: { spine: [0.06, 0, 0], head: [0.08, 0, 0], ...CROSSED },
  sulk: { head: [0.12, 0, 0.1], ...CROSSED, turn: 2.6 },
  eat: { ...ARMS_DOWN, head: [0.08, 0, 0], rightUpperArm: [-0.95, 0, 1.0], rightLowerArm: [0, 2.25, 0], leftUpperArm: [-0.35, 0, -1.1], leftLowerArm: [0, -1.3, 0] },
  hug: { head: [0.12, 0, 0.12], ...HUG_ARMS },
  love: { head: [0.1, 0, 0.15], leftUpperArm: [-0.6, -0.6, -1.1], rightUpperArm: [-0.6, 0.6, 1.1], leftLowerArm: [0, -1.6, 0], rightLowerArm: [0, 1.6, 0] },
  cheer: { head: [-0.12, 0, 0], leftUpperArm: [0, 0, 0.95], rightUpperArm: [0, 0, -0.95], leftLowerArm: [0, 0, 0.2], rightLowerArm: [0, 0, -0.2] },
  shy: { head: [0.18, 0, 0.18], leftUpperArm: [0.35, 0, -1.25], rightUpperArm: [0.35, 0, 1.25], leftLowerArm: [0, 0.4, 0], rightLowerArm: [0, -0.4, 0] },
  dance: { ...ARMS_DOWN },
  walk: { ...ARMS_DOWN },
}
// Hissiyot → VRM ifodalari
const FACES = {
  neutral: {}, happy: { happy: 0.7 }, love: { happy: 1 }, sad: { sad: 0.85 }, cry: { sad: 1 }, angry: { angry: 0.9 },
  surprised: { surprised: 0.8 }, relaxed: { relaxed: 0.7 }, sleepy: { relaxed: 0.9 }, shy: { happy: 0.45, relaxed: 0.3 },
}

function mount(container, url, { onReady, onError, onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.className = 'b-canvas'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(22, 0.6, 0.1, 20)
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(1.2, 2.2, 3)
  const fill = new THREE.DirectionalLight(0xffe2c0, 0.9); fill.position.set(-2, 1, 1.5)
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.9))
  const lookTarget = new THREE.Object3D(); scene.add(lookTarget)

  const st = {
    vrm: null, alive: true, t: 0, pose: 'stand', face: 'neutral', talking: false, eyesClosed: false,
    facing: 0, turn: 0, blinkAt: 1.5, blinkT: -1, waveT: -1, nodT: -1,
    mouth: 0, mouthTarget: 0, mouthShape: 'aa', nextSyl: 0, walkPhase: 0, walkAmt: 0, height: 1.5, hipsBase: 0,
    cur: {}, exprCur: {},
  }

  function resize() {
    const w = container.clientWidth || 110, h = container.clientHeight || 185
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const H = st.height * 1.08
    const dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect / 0.5)
    camera.position.set(0, st.height * 0.52, Math.max(dist, 2.2))
    camera.lookAt(0, st.height * 0.5, 0)
    camera.updateProjectionMatrix()
  }

  loadVRM(url, onProgress).then((gltf) => {
    if (!st.alive) return
    const vrm = gltf.userData.vrm
    if (!vrm) throw new Error('Bu VRM fayl emas')
    if (!vrm.__prepared) {
      VRMUtils.removeUnnecessaryVertices(gltf.scene)
      VRMUtils.combineSkeletons?.(gltf.scene)
      VRMUtils.rotateVRM0(vrm)
      vrm.scene.traverse((o) => { o.frustumCulled = false })
      vrm.__prepared = true
    }
    st.vrm = vrm
    scene.add(vrm.scene)
    if (vrm.lookAt) vrm.lookAt.target = lookTarget
    const hips = vrm.humanoid?.getNormalizedBoneNode('hips')
    st.hipsBase = hips ? hips.position.y : 0.85
    vrm.scene.updateMatrixWorld(true)
    const head = vrm.humanoid?.getRawBoneNode('head')
    if (head) { const p = new THREE.Vector3(); head.getWorldPosition(p); st.height = p.y + 0.2 }
    for (const b of BONES) st.cur[b] = [0, 0, 0]
    resize()
    onReady?.()
  }).catch((e) => onError?.(e))

  const N = (name) => st.vrm?.humanoid?.getNormalizedBoneNode(name)
  const setExpr = (name, v) => { try { st.vrm?.expressionManager?.setValue(name, v) } catch { /* yo'q */ } }

  // Ekrandagi nuqta (ko'z yoshi, zzz, sovg'a uchun)
  const tmp = new THREE.Vector3()
  function anchor(name) {
    const raw = st.vrm?.humanoid?.getRawBoneNode(name === 'head' ? 'head' : name === 'hand' ? 'rightHand' : name === 'chest' ? 'chest' : 'hips')
    if (!raw) return null
    raw.getWorldPosition(tmp)
    if (name === 'head') tmp.y += 0.06
    tmp.project(camera)
    const w = container.clientWidth, h = container.clientHeight
    return { x: (tmp.x + 1) / 2 * w, y: (1 - tmp.y) / 2 * h }
  }

  let last = performance.now()
  function frame(now) {
    if (!st.alive) return
    requestAnimationFrame(frame)
    if (document.hidden) { last = now; return }
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    st.t += dt
    const vrm = st.vrm
    if (!vrm) return
    const t = st.t, P = POSES[st.pose] || POSES.stand

    // --- qayoqqa qarash ---
    const r = renderer.domElement.getBoundingClientRect()
    const fresh = performance.now() - pointer.t < 4000
    const sleeping = st.pose === 'sleep' || st.eyesClosed
    const dx = sleeping ? 0 : fresh ? clamp((pointer.x - (r.left + r.width / 2)) / 500, -1, 1) : Math.sin(t * 0.35) * 0.3
    const dy = sleeping ? 0 : fresh ? clamp((pointer.y - (r.top + r.height * 0.18)) / 500, -1, 1) : 0
    lookTarget.position.lerp(new THREE.Vector3(dx * 1.2, st.height * 0.9 - dy * 0.8, 2), 0.12)

    // --- yurish va burilish ---
    st.walkAmt = lerp(st.walkAmt, st.pose === 'walk' ? 1 : 0, 0.15)
    st.walkPhase += dt * 9 * st.walkAmt
    const wp = st.walkPhase, wa = st.walkAmt
    const turnTarget = P.turn ? P.turn : st.pose === 'walk' ? st.facing * 1.1 : 0
    st.turn = lerp(st.turn, turnTarget, 0.08)
    vrm.scene.rotation.y = st.turn

    // --- maqsad burchaklar ---
    const target = {}
    for (const b of BONES) target[b] = P[b] ? [...P[b]] : [0, 0, 0]
    const breath = Math.sin(t * (sleeping ? 1.0 : 1.7))
    target.spine[0] += breath * (sleeping ? 0.03 : 0.015)
    target.chest[0] += breath * 0.02
    // bosh sichqonchaga qaraydi (pozaga qo'shimcha)
    if (!sleeping && !['cry', 'sulk'].includes(st.pose)) { target.head[0] += -dy * 0.18; target.head[1] += dx * 0.3; target.neck[0] += -dy * 0.1; target.neck[1] += dx * 0.18 }
    target.head[2] += Math.sin(t * 0.6) * 0.03
    // pozaga xos harakatlar
    if (st.pose === 'cry') { const sh = Math.sin(t * 13) * 0.025; target.chest[0] += sh; target.head[2] += Math.sin(t * 2) * 0.05 }
    if (st.pose === 'angry' || st.pose === 'sulk') { target.head[1] += Math.sin(t * 0.9) * 0.08 }
    if (st.pose === 'eat') { const k = (Math.sin(t * 4) + 1) / 2; target.rightUpperArm[0] -= k * 0.15; target.head[0] += k * 0.05 }
    if (st.pose === 'yawn') { target.head[0] += Math.sin(t * 1.5) * 0.05 }
    if (st.pose === 'cheer') { const k = Math.sin(t * 8); target.leftUpperArm[2] += k * 0.15; target.rightUpperArm[2] -= k * 0.15 }
    if (st.pose === 'hug') { target.chest[1] += Math.sin(t * 1.6) * 0.12 }
    if (st.pose === 'dance') {
      const b = t * 5.2
      target.hips[1] = Math.sin(b / 2) * 0.25; target.spine[2] = Math.sin(b) * 0.12; target.head[2] += Math.sin(b + 1) * 0.12
      target.leftUpperArm = [Math.sin(b) * 0.5, 0, 0.6 + Math.sin(b) * 0.4]; target.rightUpperArm = [-Math.sin(b) * 0.5, 0, -0.6 - Math.cos(b) * 0.4]
      target.leftLowerArm = [0, -0.8, 0]; target.rightLowerArm = [0, 0.8, 0]
      target.leftUpperLeg[0] = Math.max(0, Math.sin(b)) * -0.4; target.rightUpperLeg[0] = Math.max(0, -Math.sin(b)) * -0.4
      target.leftLowerLeg[0] = Math.max(0, Math.sin(b)) * 0.7; target.rightLowerLeg[0] = Math.max(0, -Math.sin(b)) * 0.7
    }
    if (st.talking && ['stand', 'listen', 'shy'].includes(st.pose)) {
      target.rightUpperArm = [-0.25, 0, 1.05 + Math.sin(t * 2.3) * 0.08]; target.rightLowerArm = [0, 0.5 + Math.sin(t * 2.9) * 0.15, 0]
      target.head[0] += Math.sin(t * 6.3) * 0.03
    }
    // yurish
    if (wa > 0.01) {
      target.leftUpperArm[0] += Math.sin(wp) * 0.45 * wa; target.rightUpperArm[0] -= Math.sin(wp) * 0.45 * wa
      target.leftUpperLeg[0] += Math.sin(wp) * 0.5 * wa; target.rightUpperLeg[0] -= Math.sin(wp) * 0.5 * wa
      target.leftLowerLeg[0] += Math.max(0, -Math.sin(wp)) * 0.7 * wa; target.rightLowerLeg[0] += Math.max(0, Math.sin(wp)) * 0.7 * wa
      target.chest[1] -= Math.sin(wp) * 0.1 * wa; target.hips[1] += Math.sin(wp) * 0.08 * wa
    }
    // qo'l silkitish
    if (st.waveT >= 0) {
      st.waveT += dt
      const k = st.waveT < 0.25 ? st.waveT / 0.25 : st.waveT > 1.85 ? Math.max(0, (2.1 - st.waveT) / 0.25) : 1
      target.rightUpperArm = target.rightUpperArm.map((v, i) => lerp(v, [0, 0, 0.35][i], k))
      target.rightLowerArm = target.rightLowerArm.map((v, i) => lerp(v, [0, 0, -1.6 + Math.sin(st.waveT * 11) * 0.35][i], k))
      if (st.waveT > 2.1) st.waveT = -1
    }
    // bosh irg'atish ("ha")
    if (st.nodT >= 0) { st.nodT += dt; target.head[0] += Math.sin(st.nodT * 14) * 0.12 * Math.max(0, 1 - st.nodT / 0.9); if (st.nodT > 0.9) st.nodT = -1 }

    // --- silliq o'tish ---
    const k = 1 - Math.pow(0.0015, dt)   // ~0.25 @60fps
    for (const b of BONES) {
      const node = N(b); if (!node) continue
      const c = st.cur[b], tg = target[b]
      for (let i = 0; i < 3; i++) c[i] = lerp(c[i], tg[i], k)
      node.rotation.set(c[0], c[1], c[2])
    }
    const hipsN = N('hips')
    if (hipsN) {
      st.dropCur = lerp(st.dropCur || 0, P.drop || 0, k * 0.8)
      hipsN.position.y = st.hipsBase * (1 - st.dropCur) + Math.abs(Math.sin(wp)) * 0.025 * wa + (st.pose === 'dance' ? Math.abs(Math.sin(t * 5.2)) * 0.03 : 0)
    }

    // --- ko'z qisish ---
    if (st.blinkT < 0 && t > st.blinkAt) st.blinkT = 0
    let blink = 0
    if (st.blinkT >= 0) {
      st.blinkT += dt
      blink = st.blinkT < 0.07 ? st.blinkT / 0.07 : Math.max(0, 1 - (st.blinkT - 0.07) / 0.09)
      if (st.blinkT > 0.16) { st.blinkT = -1; st.blinkAt = t + 2 + Math.random() * 3.5; if (Math.random() < 0.2) st.blinkAt = t + 0.25 }
    }
    if (sleeping) blink = 1
    if (st.pose === 'cry') blink = Math.max(blink, 0.55)
    if (st.face === 'sleepy') blink = Math.max(blink, 0.45 + Math.sin(t * 0.8) * 0.15)

    // --- og'iz ---
    if (st.talking) {
      if (t > st.nextSyl) {
        st.nextSyl = t + 0.08 + Math.random() * 0.12
        st.mouthTarget = Math.random() < 0.18 ? 0.05 : 0.35 + Math.random() * 0.6
        st.mouthShape = ['aa', 'aa', 'oh', 'ih', 'ou', 'ee'][Math.floor(Math.random() * 6)]
      }
    } else if (st.pose === 'yawn') { st.mouthShape = 'oh'; st.mouthTarget = 0.6 + Math.sin(t * 1.5) * 0.4 }
    else if (st.pose === 'eat') { st.mouthShape = 'aa'; st.mouthTarget = (Math.sin(t * 9) + 1) * 0.25 }
    else if (st.pose === 'cry') { st.mouthShape = 'ih'; st.mouthTarget = 0.3 + Math.sin(t * 7) * 0.15 }
    else st.mouthTarget = st.pose === 'listen' ? 0.1 : 0
    st.mouth = lerp(st.mouth, st.mouthTarget, 0.35)

    // --- yuz ifodalari (silliq) ---
    const want = { ...(FACES[st.face] || {}) }
    for (const m of ['aa', 'ih', 'ou', 'ee', 'oh']) want[m] = m === st.mouthShape ? st.mouth : 0
    for (const e of ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'aa', 'ih', 'ou', 'ee', 'oh']) {
      st.exprCur[e] = lerp(st.exprCur[e] || 0, want[e] || 0, e.length === 2 ? 0.4 : 0.08)
      setExpr(e, st.exprCur[e])
    }
    // ifoda ko'zni yopib qo'ymasin: kulganda blink kamroq
    setExpr('blink', Math.min(1, blink))

    vrm.update(dt)
    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)
  const ro = new ResizeObserver(resize); ro.observe(container)
  resize()

  return {
    setPose(p) { if (POSES[p]) st.pose = p },
    get pose() { return st.pose },
    setFace(f) { st.face = FACES[f] ? f : 'neutral' },
    setTalking(v) { st.talking = !!v },
    setFacing(d) { st.facing = d },
    wave() { st.waveT = 0 },
    nod() { st.nodT = 0 },
    anchor,
    ready: () => !!st.vrm,
    destroy() { st.alive = false; ro.disconnect(); if (st.vrm) scene.remove(st.vrm.scene); renderer.dispose(); renderer.domElement.remove() },
  }
}

function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

window.Avatar3D = { mount, supported, preload: (url) => loadVRM(url), POSES }
dispatchEvent(new Event('avatar3d-ready'))
