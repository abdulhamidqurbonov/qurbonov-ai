// ============ Qurbonov AI — 3D hamroh dvigateli (VRM) ============
// Pozalar: stand, walk, sit, cry, sleep, yawn, angry, sulk, eat, dance, cheer, shy, hug, think, listen
// Hissiyotlar (yuz): neutral, happy, sad, angry, surprised, relaxed, love, sleepy
// Har bir poza — suyaklar uchun maqsad burchaklar; joriy holat ularga silliq o'tadi.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '/vendor/three/three-vrm.module.js'
import { loadMixamo } from '/mixamo.js'

// Mixamo animatsiyalari (public/anims/*.fbx). Fayl bo'lmasa — kod bilan yasalgan harakat ishlaydi.
// poza nomi → fayl; loop=false — bir marta o'ynab, oxirgi holatda qoladi
const ANIMS = {
  walk: { file: 'walk', inPlace: true }, stand: { file: 'idle' }, listen: { file: 'idle' }, lie: { file: 'sleep' },
  cryStand: { file: 'cry' }, jump: { file: 'jump' }, shy: { file: 'shy' }, shycover: { file: 'shy' },
  angry: { file: 'angry' }, tantrum: { file: 'angry' }, dance: { file: 'dance' }, yawn: { file: 'yawn' }, clap: { file: 'clap' }, eat: { file: 'eat' },
  sad: { file: 'sad' }, think: { file: 'think' }, scared: { file: 'scared' }, surprised: { file: 'surprised' }, bow: { file: 'bow' },
  stretch: { file: 'stretch' }, kiss: { file: 'kiss' }, cheer: { file: 'cheer' }, bored: { file: 'bored' }, fight: { file: 'fight' }, laugh: { file: 'laugh' },
}
const animMissing = new Set()

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
  // --- yangi hissiyot pozalari ---
  lie: { lie: 1, spine: [0.2, 0, 0], head: [0, 0, -0.35], neck: [0, 0, -0.15], leftUpperArm: [-0.3, 0, 1.0], leftLowerArm: [0, -1.8, 0],
    rightUpperArm: [-0.3, 0, 1.1], rightLowerArm: [0, 1.2, 0], leftUpperLeg: [-1.2, 0, -0.05], rightUpperLeg: [-1.0, 0, 0.05],
    leftLowerLeg: [1.7, 0, 0], rightLowerLeg: [1.5, 0, 0], leftFoot: [0.3, 0, 0], rightFoot: [0.3, 0, 0] },
  laugh: { spine: [0.14, 0, 0], chest: [0.08, 0, 0], head: [-0.12, 0, 0], ...HUG_ARMS, leftUpperArm: [-0.15, 0, -1.15], rightUpperArm: [-0.15, 0, 1.15] },
  giggle: { ...ARMS_DOWN, head: [0.12, 0, 0.14], rightUpperArm: [-0.7, 0.2, 1.05], rightLowerArm: [0, 2.25, 0], leftUpperArm: [-0.3, 0, -1.1], leftLowerArm: [0, -1.2, 0] },
  jump: { head: [-0.12, 0, 0], leftUpperArm: [0, 0, 0.55], rightUpperArm: [0, 0, -0.55], leftLowerArm: [0, 0, 0.2], rightLowerArm: [0, 0, -0.2] },
  coy: { head: [0.1, 0, 0.22], leftUpperArm: [-0.12, 0, -1.22], rightUpperArm: [-0.12, 0, 1.22], leftLowerArm: [0, -1.25, 0], rightLowerArm: [0, 1.25, 0],
    leftUpperLeg: [0, 0.12, 0], rightUpperLeg: [0, -0.12, 0] },
  pout: { head: [-0.12, 0.6, 0.05], neck: [0, 0.2, 0], leftUpperArm: [0.45, 0, -0.75], rightUpperArm: [0.45, 0, 0.75], leftLowerArm: [0, -2.0, 0], rightLowerArm: [0, 2.0, 0] },
  tantrum: { spine: [0.08, 0, 0], head: [0.15, 0, 0], leftUpperArm: [0.1, 0, -1.0], rightUpperArm: [0.1, 0, 1.0], leftLowerArm: [0, -0.6, 0], rightLowerArm: [0, 0.6, 0] },
  scared: { drop: 0.05, spine: [0.15, 0, 0], head: [0.15, 0, 0], ...HUG_ARMS, leftUpperArm: [-0.55, 0, -1.0], rightUpperArm: [-0.55, 0, 1.0],
    leftUpperLeg: [-0.25, 0.15, 0], rightUpperLeg: [-0.25, -0.15, 0], leftLowerLeg: [0.45, 0, 0], rightLowerLeg: [0.45, 0, 0] },
  surprised: { spine: [-0.08, 0, 0], head: [-0.14, 0, 0], leftUpperArm: [-0.65, 0, -0.85], rightUpperArm: [-0.65, 0, 0.85], leftLowerArm: [0, -1.95, 0], rightLowerArm: [0, 1.95, 0] },
  sad: { spine: [0.16, 0, 0], chest: [0.1, 0, 0], head: [0.38, 0, 0.08], leftUpperArm: [0.05, 0, -1.32], rightUpperArm: [0.05, 0, 1.32], leftLowerArm: [0, 0, -0.05], rightLowerArm: [0, 0, 0.05] },
  hurt: { spine: [0.12, 0, 0], head: [0.3, 0, 0], leftUpperArm: [0.05, 0, -1.3], rightUpperArm: [0.05, 0, 1.3], turn: 2.8 },
  bow: { spine: [0.5, 0, 0], chest: [0.15, 0, 0], head: [0.12, 0, 0], leftUpperArm: [-0.25, 0, -1.25], rightUpperArm: [-0.25, 0, 1.25], leftLowerArm: [0, -0.3, 0], rightLowerArm: [0, 0.3, 0] },
  clap: { head: [-0.05, 0, 0], leftUpperArm: [-0.75, 0, -1.0], rightUpperArm: [-0.75, 0, 1.0], leftLowerArm: [0, -1.2, 0], rightLowerArm: [0, 1.2, 0] },
  stretch: { spine: [-0.1, 0, 0], head: [-0.25, 0, 0], leftUpperArm: [0, 0, 1.4], rightUpperArm: [0, 0, -1.4], leftLowerArm: [0, 0, 0.1], rightLowerArm: [0, 0, -0.1] },
  kiss: { ...ARMS_DOWN, head: [0.05, 0, 0.15], rightUpperArm: [-0.7, 0.2, 1.05], rightLowerArm: [0, 2.25, 0] },
  shycover: { spine: [0.1, 0, 0], head: [0.32, 0, 0.1], leftUpperArm: [-1.1, -0.5, -0.9], rightUpperArm: [-1.1, 0.5, 0.9], leftLowerArm: [0, -1.7, 0], rightLowerArm: [0, 1.7, 0],
    leftUpperLeg: [0, 0.2, 0], rightUpperLeg: [0, -0.2, 0] },
  cryStand: { spine: [0.2, 0, 0], head: [0.4, 0, 0], leftUpperArm: [-1.1, -0.5, -0.9], rightUpperArm: [-1.1, 0.5, 0.9], leftLowerArm: [0, -1.75, 0], rightLowerArm: [0, 1.75, 0] },
  bored: { ...ARMS_DOWN, head: [0.05, 0, 0.28], spine: [0.05, 0, 0.04] },
  wiped: { ...ARMS_DOWN, head: [-0.15, 0, 0.08], spine: [-0.03, 0, 0], leftUpperArm: [0.3, 0, -1.25], rightUpperArm: [0.3, 0, 1.25] },
  pat: { ...ARMS_DOWN, head: [0.22, 0, 0.18], neck: [0.08, 0, 0], leftUpperArm: [0.35, 0, -1.25], rightUpperArm: [0.35, 0, 1.25] },
  fight: { leftUpperArm: [-0.9, 0, -1.0], rightUpperArm: [-0.9, 0, 1.0], leftLowerArm: [0, -2.0, 0], rightLowerArm: [0, 2.0, 0], leftUpperLeg: [-0.2, 0, -0.15], rightUpperLeg: [0.1, 0, 0.15], leftLowerLeg: [0.3, 0, 0] },
  puff: { head: [0.05, -0.15, 0], leftUpperArm: [0.45, 0, -0.75], rightUpperArm: [0.45, 0, 0.75], leftLowerArm: [0, -2.0, 0], rightLowerArm: [0, 2.0, 0] },
}
// Hissiyot → VRM ifodalari
const FACES = {
  neutral: {}, happy: { happy: 0.7 }, love: { happy: 1 }, sad: { sad: 0.85 }, cry: { sad: 1 }, angry: { angry: 0.9 },
  surprised: { surprised: 0.8 }, relaxed: { relaxed: 0.7 }, sleepy: { relaxed: 0.9 }, shy: { happy: 0.45, relaxed: 0.3 },
  laugh: { happy: 1 }, pout: { angry: 0.45, sad: 0.2 }, scared: { surprised: 0.55, sad: 0.45 }, smug: { happy: 0.35, relaxed: 0.45 },
  hurt: { sad: 0.75, angry: 0.15 }, bored: { relaxed: 0.5, sad: 0.15 }, excited: { happy: 0.85, surprised: 0.25 },
}
// pozaning o'ziga xos yuzi (ochiq og'iz va h.k.)
const MOUTH = { laugh: ['aa', 0.75, 9], giggle: ['ih', 0.35, 11], surprised: ['oh', 0.7, 0], scared: ['ih', 0.25, 22], tantrum: ['ou', 0.4, 6],
  pout: ['ou', 0.35, 0], puff: ['ou', 0.55, 0], cryStand: ['ih', 0.35, 7], kiss: ['ou', 0.6, 0], jump: ['aa', 0.45, 0], stretch: ['oh', 0.5, 1.5] }

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
    cur: {}, exprCur: {}, poseT: 0, lieCur: 0,
  }

  function resize() {
    const w = container.clientWidth || 110, h = container.clientHeight || 185
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    frameCamera()
  }
  // Kamera: tik turganda bo'yiga, yotganda eniga moslab
  function frameCamera() {
    const L = st.lieCur, hh = st.height, tanF = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const needH = lerp(hh * 1.12, 0.7, L), needW = lerp(hh * 0.56, hh * 1.1, L), cy = lerp(hh * 0.52, 0.27, L)
    const dist = Math.max(needH / 2 / tanF, needW / 2 / (tanF * camera.aspect), 1.2)
    camera.position.set(0, cy + 0.02, dist)
    camera.lookAt(0, cy, 0)
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
    // rang berish uchun materiallarni guruhlaymiz (VRoid nomlari: HAIR, EyeIris, CLOTH, SKIN)
    st.mats = { hair: [], eyes: [], cloth: [], skin: [] }
    vrm.scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (!m || m.__grp) continue
        const n = m.name || ''
        const g = /HAIR/i.test(n) ? 'hair' : /EyeIris/i.test(n) ? 'eyes' : /CLOTH/i.test(n) ? 'cloth' : /Body.*SKIN|Face_00_SKIN/i.test(n) ? 'skin' : null
        if (!g) continue
        m.__grp = g; m.__orig = { c: m.color?.clone(), s: m.shadeColorFactor?.clone?.() }
        st.mats[g].push(m)
      }
    })
    for (const [g, hex] of Object.entries(tints)) applyTint(g, hex)
    st.mixer = new THREE.AnimationMixer(vrm.scene)
    st.actions = {}
    resize()
    // eng kerakli animatsiyalarni oldindan yuklab qo'yamiz
    setTimeout(() => { for (const f of ['idle', 'walk', 'wave']) getAction(f) }, 400)
    onReady?.()
  }).catch((e) => onError?.(e))

  const tints = {}
  function applyTint(g, hex) {
    tints[g] = hex
    for (const m of st.mats?.[g] || []) {
      if (!hex) { m.__orig.c && m.color.copy(m.__orig.c); m.__orig.s && m.shadeColorFactor?.copy(m.__orig.s); continue }
      const c = new THREE.Color(hex)
      m.color?.copy(c)
      m.shadeColorFactor?.copy?.(c.clone().multiplyScalar(0.72))
    }
  }
  // Mixamo harakatini olish (bir marta yuklanadi)
  function getAction(file, inPlace) {
    if (!st.vrm || animMissing.has(file)) return null
    if (st.actions[file]) return st.actions[file] === 'loading' ? null : st.actions[file]
    st.actions[file] = 'loading'
    loadMixamo(`/anims/${file}.fbx`, st.vrm, { inPlace }).then((clip) => {
      if (!st.alive) return
      st.actions[file] = st.mixer.clipAction(clip)
    }).catch(() => { animMissing.add(file); delete st.actions[file] })
    return null
  }
  let curAction = null
  st.overlay = null; st.sleepVariant = 'calm'
  function syncAction() {
    let want = null
    if (st.overlay) {
      if (st.t > st.overlay.until) st.overlay = null
      else want = st.overlay.action
    }
    if (!want) {
      const a = ANIMS[st.pose]
      const file = st.pose === 'lie' && st.sleepVariant === 'restless' && !animMissing.has('sleep-restless') ? 'sleep-restless' : a?.file
      want = file ? getAction(file, a?.inPlace) : null
    }
    if (want === curAction) return
    const slow = st.pose === 'lie' ? 1.4 : 0.35   // uyquda birdan harakatlanib ketmasin
    if (curAction) curAction.fadeOut(slow)
    if (want) {
      want.enabled = true
      if (!want.isRunning() || want.getEffectiveWeight() < 0.05) want.reset()
      want.setEffectiveWeight(1).fadeIn(curAction ? slow : 0.25).play()
    }
    // kod harakatiga qaytsak — joriy suyak holatidan silliq davom etamiz
    if (!want && curAction) for (const b of BONES) { const n = N(b); if (n) { const e = new THREE.Euler().setFromQuaternion(n.quaternion); st.cur[b] = [e.x, e.y, e.z] } }
    curAction = want
  }
  // Bir martalik harakat (qo'l silkitish va h.k.) — tugagach oldingi holatga qaytadi
  function playOnce(file) {
    const act = getAction(file)
    if (!act) return false
    act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true
    act.reset()
    st.overlay = { action: act, until: st.t + Math.max(0.6, act.getClip().duration - 0.35) }
    return true
  }
  const N = (name) => st.vrm?.humanoid?.getNormalizedBoneNode(name)
  const setExpr = (name, v) => { try { st.vrm?.expressionManager?.setValue(name, v) } catch { /* yo'q */ } }

  // Ekrandagi nuqta (ko'z yoshi, zzz, sovg'a uchun)
  const tmp = new THREE.Vector3()
  function anchor(name) {
    if (name === 'cheek' || name === 'mouth') {
      const hn = st.vrm?.humanoid?.getNormalizedBoneNode('head'); if (!hn) return null
      hn.updateWorldMatrix(true, false)
      tmp.set(0, name === 'cheek' ? 0.075 : 0.05, 0.09); hn.localToWorld(tmp)
      tmp.project(camera)
      return { x: (tmp.x + 1) / 2 * container.clientWidth, y: (1 - tmp.y) / 2 * container.clientHeight }
    }
    const raw = st.vrm?.humanoid?.getRawBoneNode(name === 'head' ? 'head' : name === 'hand' ? 'rightHand' : name === 'chest' ? 'chest' : name === 'foot' ? 'rightFoot' : name === 'lhand' ? 'leftHand' : 'hips')
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
    const sleeping = st.pose === 'sleep' || st.pose === 'lie' || st.eyesClosed
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
    st.poseT += dt
    // yotish: butun tana yonboshlab yerga yotadi
    st.lieCur = lerp(st.lieCur, P.lie ? 1 : 0, 1 - Math.pow(0.02, dt))
    const L = st.lieCur, Lrot = curAction && P.lie ? 0 : L   // Mixamo yotish animatsiyasi bo'lsa, tanani o'zimiz aylantirmaymiz
    vrm.scene.rotation.z = Lrot * Math.PI / 2
    vrm.scene.position.set(Lrot * st.height * 0.5, Lrot * 0.22, 0)
    frameCamera()

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
    const pt = st.poseT
    if (st.pose === 'laugh') { const q = Math.sin(t * 17); target.chest[0] += q * 0.05; target.spine[0] += q * 0.03; target.head[0] += -Math.abs(q) * 0.08; target.head[2] += Math.sin(t * 3) * 0.08 }
    if (st.pose === 'giggle') { const q = Math.sin(t * 15); target.chest[1] += q * 0.04; target.head[2] += Math.sin(t * 4) * 0.1; target.spine[2] = Math.sin(t * 2) * 0.05 }
    if (st.pose === 'jump') {
      const ph = t * 6.2, air = Math.max(0, Math.sin(ph)), land = Math.max(0, -Math.sin(ph))
      target.leftUpperLeg[0] -= land * 0.55; target.rightUpperLeg[0] -= land * 0.55; target.leftLowerLeg[0] += land * 1.0; target.rightLowerLeg[0] += land * 1.0
      target.leftFoot[0] -= land * 0.35; target.rightFoot[0] -= land * 0.35; target.spine[0] += land * 0.15
      target.leftUpperArm[2] += air * 0.6; target.rightUpperArm[2] -= air * 0.6
      st.jumpY = air * 0.1 - land * 0.06
    } else st.jumpY = 0
    if (st.pose === 'coy') {
      const q = Math.sin(t * 1.8)
      target.hips[1] = q * 0.2; target.chest[1] = -q * 0.08; target.head[2] += Math.sin(t * 1.8 + 1.2) * 0.12; target.head[1] += -q * 0.15
      const tap = Math.max(0, Math.sin(t * 3.4)); target.rightUpperLeg[0] -= 0.12; target.rightLowerLeg[0] += 0.35 + tap * 0.3; target.rightFoot[0] += 0.5
    }
    if (st.pose === 'pout' || st.pose === 'puff') { target.head[0] += Math.max(0, Math.sin(pt * 3)) * (pt < 1.2 ? 0.12 : 0) ; target.chest[1] += Math.sin(t * 1.2) * 0.05 }
    if (st.pose === 'tantrum') {
      const ph = t * 9, a = Math.max(0, Math.sin(ph)), b2 = Math.max(0, -Math.sin(ph))
      target.leftUpperLeg[0] -= a * 0.6; target.leftLowerLeg[0] += a * 0.9; target.rightUpperLeg[0] -= b2 * 0.6; target.rightLowerLeg[0] += b2 * 0.9
      target.leftUpperArm[0] += Math.sin(ph * 2) * 0.25; target.rightUpperArm[0] -= Math.sin(ph * 2) * 0.25
      target.leftLowerArm[1] += Math.sin(ph * 2) * 0.4; target.rightLowerArm[1] -= Math.sin(ph * 2) * 0.4
      target.head[1] += Math.sin(t * 7) * 0.2; target.spine[2] = Math.sin(ph) * 0.06
    }
    if (st.pose === 'scared') { const q = Math.sin(t * 34) * 0.025; target.chest[1] += q; target.head[2] += q; target.spine[0] += q * 0.5 }
    if (st.pose === 'surprised') { st.jumpY = pt < 0.4 ? Math.sin(pt / 0.4 * Math.PI) * 0.06 : 0 }
    if (st.pose === 'sad' || st.pose === 'hurt') { target.head[2] += Math.sin(t * 0.8) * 0.04; target.chest[0] += Math.max(0, Math.sin(t * 0.9)) * 0.04 }
    if (st.pose === 'cryStand') { const q = Math.sin(t * 13) * 0.03; target.chest[0] += q; target.head[2] += Math.sin(t * 2.2) * 0.07; target.spine[2] = Math.sin(t * 1.1) * 0.04 }
    if (st.pose === 'shycover') { const q = Math.sin(t * 2.2); target.hips[1] = q * 0.15; target.head[2] += q * 0.08; target.chest[1] = -q * 0.06 }
    if (st.pose === 'clap') { const q = (Math.sin(t * 14) + 1) / 2; target.leftLowerArm[1] -= q * 0.45; target.rightLowerArm[1] += q * 0.45; target.leftUpperArm[1] += q * 0.25; target.rightUpperArm[1] -= q * 0.25; st.jumpY = Math.max(0, Math.sin(t * 7)) * 0.025 }
    if (st.pose === 'stretch') { target.spine[2] = Math.sin(t * 1.3) * 0.18; target.chest[2] = Math.sin(t * 1.3) * 0.08 }
    if (st.pose === 'bored') { target.hips[1] = Math.sin(t * 0.9) * 0.12; target.head[2] += Math.sin(t * 0.7) * 0.1; target.leftUpperArm[0] += Math.sin(t * 0.9) * 0.2; target.rightUpperArm[0] -= Math.sin(t * 0.9) * 0.2 }
    if (st.pose === 'kiss') {
      const k2 = clamp((pt - 0.7) / 0.35, 0, 1)
      target.rightUpperArm = [lerp(-0.7, -1.35, k2), lerp(0.2, -0.1, k2), lerp(1.05, 0.75, k2)]; target.rightLowerArm = [0, lerp(2.25, 0.25, k2), 0]
      target.head[0] += lerp(0, -0.1, k2)
    }
    if (st.pose === 'wiped') { const k2 = Math.max(0, 1 - pt / 1.6); target.head[1] += Math.sin(t * 16) * 0.18 * k2; target.head[2] += Math.sin(t * 12) * 0.08 * k2 }
    if (st.pose === 'pat') { target.head[2] += Math.sin(t * 3.2) * 0.12; target.head[0] += Math.sin(t * 6.4) * 0.04; target.hips[1] = Math.sin(t * 1.6) * 0.08 }
    if (st.pose === 'lie') { target.chest[0] += breath * 0.02 }
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
    syncAction()
    const clipOn = !!curAction
    if (clipOn) {
      st.mixer.update(dt)
      // bosh sichqonchaga ozgina qaraydi (animatsiya ustidan)
      const hn = N('head')
      if (hn && !sleeping) { const e = new THREE.Euler(-dy * 0.15, dx * 0.25, 0); hn.quaternion.multiply(new THREE.Quaternion().setFromEuler(e)) }
    } else st.mixer?.update(dt)
    if (!clipOn) for (const b of BONES) {
      const node = N(b); if (!node) continue
      const c = st.cur[b], tg = target[b]
      for (let i = 0; i < 3; i++) c[i] = lerp(c[i], tg[i], k)
      node.rotation.set(c[0], c[1], c[2])
    }
    const hipsN = N('hips')
    if (hipsN && !clipOn) {
      st.dropCur = lerp(st.dropCur || 0, P.drop || 0, k * 0.8)
      hipsN.position.y = st.hipsBase * (1 - st.dropCur) + (st.jumpY || 0) + Math.abs(Math.sin(wp)) * 0.025 * wa + (st.pose === 'dance' ? Math.abs(Math.sin(t * 5.2)) * 0.03 : 0)
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
    if (st.pose === 'cry' || st.pose === 'cryStand') blink = Math.max(blink, 0.55)
    if (st.pose === 'laugh' || st.pose === 'giggle' || st.pose === 'wiped') blink = Math.max(blink, 0.7)
    if (st.face === 'sleepy') blink = Math.max(blink, 0.45 + Math.sin(t * 0.8) * 0.15)

    // --- og'iz ---
    if (st.talking) {
      if (t > st.nextSyl) {
        st.nextSyl = t + 0.08 + Math.random() * 0.12
        st.mouthTarget = Math.random() < 0.18 ? 0.05 : 0.35 + Math.random() * 0.6
        st.mouthShape = ['aa', 'aa', 'oh', 'ih', 'ou', 'ee'][Math.floor(Math.random() * 6)]
      }
    } else if (MOUTH[st.pose]) { const [sh, v, sp] = MOUTH[st.pose]; st.mouthShape = sh; st.mouthTarget = sp ? v * (0.6 + 0.4 * Math.abs(Math.sin(t * sp))) : v }
    else if (st.pose === 'yawn') { st.mouthShape = 'oh'; st.mouthTarget = 0.6 + Math.sin(t * 1.5) * 0.4 }
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
    setPose(p) { if (p === 'sleep') p = 'lie'; if (POSES[p] && p !== st.pose) { st.pose = p; st.poseT = 0 } },
    defPose(name, obj) { POSES[name] = obj },
    setTint: applyTint,
    get pose() { return st.pose },
    get lying() { return st.lieCur > 0.5 },
    get clip() { return curAction?.getClip().name || null },
    setFace(f) { st.face = FACES[f] ? f : 'neutral' },
    setTalking(v) { st.talking = !!v },
    setFacing(d) { st.facing = d },
    wave() { if (!playOnce('wave')) st.waveT = 0 },
    playOnce,
    setSleepVariant(v) { st.sleepVariant = v },
    preload(files) { for (const f of files) getAction(f) },
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
