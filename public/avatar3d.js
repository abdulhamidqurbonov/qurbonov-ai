// ============ Qurbonov AI — 3D anime yordamchi (VRM) ============
// VRoid Studio'da yasalgan .vrm modelni kichkina shaffof oynachada jonlantiradi:
// nafas olish, ko'z qisish, ko'rsatkichga qarash, gapirganda og'iz harakati, yurish, qo'l silkitish.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '/vendor/three/three-vrm.module.js'

const cache = new Map()   // bir xil modelni qayta yuklamaslik uchun
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
    vrm: null, state: 'idle', facing: 0, turn: 0, t: 0, alive: true,
    blinkAt: 1.5, blinkT: -1, waveT: -1, mouth: 0, mouthTarget: 0, mouthShape: 'aa', nextSyl: 0,
    walkPhase: 0, walkAmt: 0, height: 1.5, hipsBase: 0,
  }

  function resize() {
    const w = container.clientWidth || 150, h = container.clientHeight || 250
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // butun gavda ko'rinsin
    const H = st.height * 1.08
    const dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.position.set(0, st.height * 0.52, dist)
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
    const hipsNode = vrm.humanoid?.getNormalizedBoneNode('hips')
    st.hipsBase = hipsNode ? hipsNode.position.y : 0
    // Bo'yni bosh suyagi bo'yicha o'lchaymiz (soch va aksessuarlar chalg'itmasin)
    vrm.scene.updateMatrixWorld(true)
    const headNode = vrm.humanoid?.getRawBoneNode('head')
    const hp = new THREE.Vector3()
    if (headNode) { headNode.getWorldPosition(hp); st.height = hp.y + 0.2 }
    else { const box = new THREE.Box3().setFromObject(vrm.scene); st.height = Math.max(0.8, box.max.y - box.min.y) }
    resize()
    onReady?.()
  }).catch((e) => onError?.(e))

  const B = (name) => st.vrm?.humanoid?.getNormalizedBoneNode(name)
  const E = (name, v) => { try { st.vrm?.expressionManager?.setValue(name, v) } catch { /* ifoda yo'q */ } }

  // Ko'rsatkichga qarash
  function updateLook() {
    const r = renderer.domElement.getBoundingClientRect()
    const fresh = performance.now() - pointer.t < 4000
    const dx = fresh ? clamp((pointer.x - (r.left + r.width / 2)) / 500, -1, 1) : Math.sin(st.t * 0.35) * 0.3
    const dy = fresh ? clamp((pointer.y - (r.top + r.height * 0.18)) / 500, -1, 1) : 0
    const headY = st.height * 0.9
    const target = new THREE.Vector3(dx * 1.2, headY - dy * 0.8 + (st.state === 'think' ? 0.5 : 0), 2)
    lookTarget.position.lerp(target, 0.12)
    return { dx, dy }
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
    const t = st.t, s = st.state
    const { dx, dy } = updateLook()

    // --- yurish ---
    st.walkAmt = lerp(st.walkAmt, s === 'walk' ? 1 : 0, 0.15)
    st.walkPhase += dt * 9 * st.walkAmt
    const wp = st.walkPhase, wa = st.walkAmt
    const turnTarget = s === 'walk' ? st.facing * 1.1 : 0
    st.turn = lerp(st.turn, turnTarget, 0.12)
    vrm.scene.rotation.y = st.turn

    const breath = Math.sin(t * 1.7)
    const hips = B('hips'); if (hips) { hips.position.y = st.hipsBase + Math.abs(Math.sin(wp)) * 0.025 * wa; hips.rotation.y = Math.sin(wp) * 0.08 * wa }
    const spine = B('spine'); if (spine) spine.rotation.x = breath * 0.015 + (s === 'talk' ? Math.sin(t * 3.1) * 0.02 : 0)
    const chest = B('chest') || B('upperChest'); if (chest) { chest.rotation.x = breath * 0.02; chest.rotation.y = -Math.sin(wp) * 0.1 * wa }

    // --- bosh ---
    const head = B('head'), neck = B('neck')
    let hx = -dy * 0.25, hy = dx * 0.45, hz = Math.sin(t * 0.6) * 0.03
    if (s === 'listen') { hz += 0.16; hx -= 0.05 }
    if (s === 'think') { hx -= 0.22; hz -= 0.12; hy += Math.sin(t * 1.3) * 0.1 }
    if (s === 'talk') { hx += Math.sin(t * 6.3) * 0.035 }
    if (head) { head.rotation.x = lerp(head.rotation.x, hx * 0.65, 0.12); head.rotation.y = lerp(head.rotation.y, hy * 0.65, 0.12); head.rotation.z = lerp(head.rotation.z, hz, 0.1) }
    if (neck) { neck.rotation.x = lerp(neck.rotation.x, hx * 0.35, 0.12); neck.rotation.y = lerp(neck.rotation.y, hy * 0.35, 0.12) }

    // --- qo'llar (T-pozadan pastga) ---
    const sway = Math.sin(t * 1.7) * 0.03
    const lua = B('leftUpperArm'), rua = B('rightUpperArm'), lla = B('leftLowerArm'), rla = B('rightLowerArm')
    if (lua) { lua.rotation.z = -1.22 + sway; lua.rotation.x = Math.sin(wp) * 0.45 * wa }
    if (lla) { lla.rotation.z = -0.12; lla.rotation.y = 0 }
    let rz = 1.22 - sway, rx = -Math.sin(wp) * 0.45 * wa, rlz = 0.12, rly = 0
    if (st.waveT >= 0) {                                   // qo'l silkitish
      st.waveT += dt
      const k = st.waveT < 0.25 ? st.waveT / 0.25 : st.waveT > 1.85 ? Math.max(0, (2.1 - st.waveT) / 0.25) : 1
      rz = lerp(rz, 0.35, k); rx = lerp(rx, 0, k)
      rlz = lerp(rlz, -1.6 + Math.sin(st.waveT * 11) * 0.35, k)
      if (st.waveT > 2.1) st.waveT = -1
    }
    else if (s === 'talk') { rz = 1.05 + Math.sin(t * 2.3) * 0.08; rx = -0.25; rlz = 0.5 + Math.sin(t * 2.9) * 0.15 }
    if (rua) { rua.rotation.z = lerp(rua.rotation.z, rz, 0.18); rua.rotation.x = lerp(rua.rotation.x, rx, 0.18) }
    if (rla) { rla.rotation.z = lerp(rla.rotation.z, rlz, 0.18); rla.rotation.y = lerp(rla.rotation.y, rly, 0.18) }

    // --- oyoqlar ---
    const lul = B('leftUpperLeg'), rul = B('rightUpperLeg'), lll = B('leftLowerLeg'), rll = B('rightLowerLeg')
    if (lul) lul.rotation.x = Math.sin(wp) * 0.5 * wa
    if (rul) rul.rotation.x = -Math.sin(wp) * 0.5 * wa
    if (lll) lll.rotation.x = Math.max(0, -Math.sin(wp)) * 0.7 * wa
    if (rll) rll.rotation.x = Math.max(0, Math.sin(wp)) * 0.7 * wa

    // --- ko'z qisish ---
    if (st.blinkT < 0 && t > st.blinkAt) st.blinkT = 0
    let blink = 0
    if (st.blinkT >= 0) {
      st.blinkT += dt
      blink = st.blinkT < 0.07 ? st.blinkT / 0.07 : Math.max(0, 1 - (st.blinkT - 0.07) / 0.09)
      if (st.blinkT > 0.16) { st.blinkT = -1; st.blinkAt = t + 2 + Math.random() * 3.5; if (Math.random() < 0.2) st.blinkAt = t + 0.25 }
    }

    // --- og'iz (gapirish) ---
    if (s === 'talk') {
      if (t > st.nextSyl) {
        st.nextSyl = t + 0.08 + Math.random() * 0.12
        st.mouthTarget = Math.random() < 0.18 ? 0.05 : 0.35 + Math.random() * 0.6
        st.mouthShape = ['aa', 'aa', 'oh', 'ih', 'ou', 'ee'][Math.floor(Math.random() * 6)]
      }
    } else st.mouthTarget = s === 'listen' ? 0.12 : 0
    st.mouth = lerp(st.mouth, st.mouthTarget, 0.35)
    for (const m of ['aa', 'ih', 'ou', 'ee', 'oh']) E(m, m === st.mouthShape ? st.mouth : 0)
    E('happy', s === 'talk' ? 0.25 : s === 'idle' || s === 'walk' ? 0.18 : 0)
    E('surprised', s === 'listen' ? 0.15 : 0)
    E('relaxed', s === 'think' ? 0.35 : 0)
    E('blink', s === 'happy' ? 0 : blink)

    vrm.update(dt)
    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)
  const ro = new ResizeObserver(resize); ro.observe(container)
  resize()

  return {
    setState(s) { st.state = s },
    setFacing(dir) { st.facing = dir },
    wave() { st.waveT = 0 },
    destroy() {
      st.alive = false; ro.disconnect()
      if (st.vrm) scene.remove(st.vrm.scene)
      renderer.dispose(); renderer.domElement.remove()
    },
  }
}

// WebGL bormi?
function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

window.Avatar3D = { mount, supported, preload: (url) => loadVRM(url) }
dispatchEvent(new Event('avatar3d-ready'))
