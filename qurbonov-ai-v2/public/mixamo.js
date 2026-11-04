// ============ Mixamo animatsiyalarini VRM personajga ko'chirish ============
// Mixamo'dan "FBX Binary, Without Skin" qilib olingan fayllar public/anims/ ichida turadi.
// three-vrm rasmiy misolidagi usul: har bir suyak burilishi Mixamo dam holatidan VRM normal suyagiga o'tkaziladi.

import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

const RIG = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest', mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm', mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal', mixamorigLeftHandThumb2: 'leftThumbProximal', mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal', mixamorigLeftHandIndex2: 'leftIndexIntermediate', mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal', mixamorigLeftHandMiddle2: 'leftMiddleIntermediate', mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal', mixamorigLeftHandRing2: 'leftRingIntermediate', mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal', mixamorigLeftHandPinky2: 'leftLittleIntermediate', mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm', mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal', mixamorigRightHandThumb2: 'rightThumbProximal', mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal', mixamorigRightHandIndex2: 'rightIndexIntermediate', mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal', mixamorigRightHandMiddle2: 'rightMiddleIntermediate', mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandRing1: 'rightRingProximal', mixamorigRightHandRing2: 'rightRingIntermediate', mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal', mixamorigRightHandPinky2: 'rightLittleIntermediate', mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg', mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg', mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
}

const fbxCache = new Map()
const loadFBX = (url) => {
  if (!fbxCache.has(url)) fbxCache.set(url, new FBXLoader().loadAsync(url).catch((e) => { fbxCache.delete(url); throw e }))
  return fbxCache.get(url)
}

export async function loadMixamo(url, vrm, { inPlace = false } = {}) {
  const asset = await loadFBX(url)
  const src = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0]
  if (!src) throw new Error('animatsiya topilmadi')
  const tracks = []
  const restInv = new THREE.Quaternion(), parentRest = new THREE.Quaternion(), q = new THREE.Quaternion(), v = new THREE.Vector3()
  const mHips = asset.getObjectByName('mixamorigHips')
  const motionHipsH = mHips ? mHips.position.y : 100
  const hipsNode = vrm.humanoid.getNormalizedBoneNode('hips')
  // VRM sonining dam holatidagi balandligi (sahna aylantirilmagan holatda o'lchaymiz)
  const vrmHipsH = Math.abs(vrm.humanoid.normalizedRestPose?.hips?.position?.[1] ?? hipsNode.getWorldPosition(v).y)
  const scale = vrmHipsH / motionHipsH
  const v0 = vrm.meta?.metaVersion === '0'
  for (const track of src.tracks) {
    const [rigName, prop] = track.name.split('.')
    const bone = RIG[rigName]
    const node = bone && vrm.humanoid.getNormalizedBoneNode(bone)
    const mNode = asset.getObjectByName(rigName)
    if (!node || !mNode) continue
    mNode.getWorldQuaternion(restInv).invert()
    mNode.parent.getWorldQuaternion(parentRest)
    if (track instanceof THREE.QuaternionKeyframeTrack) {
      const vals = track.values.slice()
      for (let i = 0; i < vals.length; i += 4) {
        q.fromArray(vals, i).premultiply(parentRest).multiply(restInv).toArray(vals, i)
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.${prop}`, track.times, vals.map((x, i) => (v0 && i % 2 === 0 ? -x : x))))
    } else if (track instanceof THREE.VectorKeyframeTrack && bone === 'hips') {
      const vals = track.values.map((x, i) => (v0 && i % 3 !== 1 ? -x : x) * scale)
      if (inPlace) { const x0 = vals[0], z0 = vals[2]; for (let i = 0; i < vals.length; i += 3) { vals[i] = x0 * 0; vals[i + 2] = z0 * 0 } }
      tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.${prop}`, track.times, vals))
    }
  }
  return new THREE.AnimationClip(url.split('/').pop(), src.duration, tracks)
}
