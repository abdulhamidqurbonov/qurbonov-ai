// ============ Qurbonov AI — ekrandagi kichkina yordamchi ============
// • Barmoq / sichqoncha bilan istalgan joyga suriladi (telefonda ham)
// • O'zi ekran bo'ylab yurib yuradi (o'chirish mumkin)
// • Bir marta bosish — gapiring, u eshitadi va o'z ovozida javob beradi
// • Uzoq bosish yoki o'ng tugma — menyu: personaj tanlash, yurish, yashirish

const BS = Object.assign({ on: true, char: 'vampira', x: null, y: null, wander: true }, store.get('buddy', {}))
const saveBuddy = () => store.set('buddy', { on: BS.on, char: BS.char, x: BS.x, y: BS.y, wander: BS.wander })

const B = {
  el: null, bubble: null, menu: null,
  state: 'idle', rec: null, busy: false, av: null,
  walkT: 0, blinkT: 0, hideT: 0, w: 92, h: 116,
}

function buddySize() {
  if (BUDDIES[BS.char]?.model) return innerWidth < 760 ? { w: 104, h: 176 } : { w: 140, h: 236 }
  return innerWidth < 760 ? { w: 76, h: 96 } : { w: 92, h: 116 }
}
const use3D = (c) => !!(c.model && window.Avatar3D?.supported())

function buildBuddy() {
  B.av?.destroy(); B.av = null
  document.querySelector('.buddy')?.remove(); document.querySelector('.bubble')?.remove(); document.querySelector('.bmenu')?.remove()
  if (!BUDDIES[BS.char]) BS.char = Object.keys(BUDDIES)[0]
  const cc = BUDDIES[BS.char]
  if (cc.model && !window.Avatar3D) { addEventListener('avatar3d-ready', buildBuddy, { once: true }); return }   // 3D kutubxona hali yuklanmagan
  if (!BS.on) { renderBuddyToggle(); return }
  const el = document.createElement('div')
  el.className = 'buddy idle'; el.tabIndex = 0
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${BUDDIES[BS.char].name} — gapirish uchun bosing`)
  if (use3D(cc)) {
    el.classList.add('is3d')
    el.innerHTML = `<div class="b-load"><img src="${cc.face}" alt=""><span>0%</span></div><div class="b-fx"><i></i><i></i><i></i></div>`
  } else {
    el.innerHTML = `${buddySVG(cc.model ? 'nilufar' : BS.char)}<div class="b-fx"><i></i><i></i><i></i></div>`
  }
  document.body.appendChild(el)

  const bubble = document.createElement('div')
  bubble.className = 'bubble'; bubble.hidden = true
  bubble.innerHTML = `<div class="bb-text"></div>
    <form class="bb-row"><input class="bb-in" placeholder="Yozing yoki gapiring…" autocomplete="off">
    <button type="submit" class="bb-send" aria-label="Yuborish"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>
    <button class="bb-x" aria-label="Yopish"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`
  document.body.appendChild(bubble)

  const menu = document.createElement('div')
  menu.className = 'bmenu'; menu.hidden = true
  document.body.appendChild(menu)

  Object.assign(B, { el, bubble, menu })
  const sz = buddySize(); B.w = sz.w; B.h = sz.h
  el.style.width = B.w + 'px'; el.style.height = B.h + 'px'
  if (BS.x == null) { BS.x = innerWidth - B.w - 24; BS.y = innerHeight - B.h - 150 }
  place(BS.x, BS.y, false)
  if (use3D(cc)) {
    B.av = Avatar3D.mount(el, cc.model, {
      onProgress: (k) => { const s = el.querySelector('.b-load span'); if (s) s.textContent = Math.round(k * 100) + '%' },
      onReady: () => { el.querySelector('.b-load')?.remove(); B.av?.setState(B.state) },
      onError: () => {
        el.querySelector('.b-load span').textContent = 'xato'
        toast("3D modelni yuklab bo'lmadi")
      },
    })
  }
  bindBuddy()
  scheduleBlink(); scheduleWalk()
  renderBuddyToggle()
}

// ---------- Joylashuv ----------
function clampPos(x, y) {
  return [Math.max(4, Math.min(innerWidth - B.w - 4, x)), Math.max(4, Math.min(innerHeight - B.h - 4, y))]
}
function place(x, y, animate, ms) {
  ;[x, y] = clampPos(x, y)
  B.el.style.transition = animate ? `left ${ms}ms linear, top ${ms}ms linear` : 'none'
  B.el.style.left = x + 'px'; B.el.style.top = y + 'px'
  BS.x = x; BS.y = y
  placeBubble()
}
function placeBubble() {
  if (!B.bubble || B.bubble.hidden) return
  const bw = Math.min(300, innerWidth - 24)
  B.bubble.style.width = bw + 'px'
  const bh = B.bubble.offsetHeight
  let left = BS.x + B.w / 2 - bw / 2
  left = Math.max(12, Math.min(innerWidth - bw - 12, left))
  let top = BS.y - bh - 10
  const below = top < 12
  if (below) top = Math.min(innerHeight - bh - 12, BS.y + B.h + 8)
  B.bubble.style.left = left + 'px'; B.bubble.style.top = top + 'px'
  B.bubble.classList.toggle('below', below)
  B.bubble.style.setProperty('--tail', Math.max(16, Math.min(bw - 16, BS.x + B.w / 2 - left)) + 'px')
}
addEventListener('resize', () => { if (!B.el) return; const sz = buddySize(); B.w = sz.w; B.h = sz.h; B.el.style.width = B.w + 'px'; B.el.style.height = B.h + 'px'; place(BS.x, BS.y, false) })

// ---------- Holatlar ----------
function setState(s) {
  B.state = s
  B.av?.setState(s)
  if (B.el) B.el.className = `buddy ${s}${B.el.classList.contains('flip') ? ' flip' : ''}${B.el.classList.contains('is3d') ? ' is3d' : ''}`
}
function say(text, { keep = false } = {}) {
  const t = B.bubble.querySelector('.bb-text')
  t.textContent = text
  B.bubble.hidden = false; placeBubble()
  clearTimeout(B.hideT)
  if (!keep) B.hideT = setTimeout(() => { if (!B.busy && document.activeElement !== B.bubble.querySelector('.bb-in')) B.bubble.hidden = true }, 14000)
}

// Ko'z qisish
function scheduleBlink() {
  clearTimeout(B.blinkT)
  B.blinkT = setTimeout(() => {
    if (!B.el) return
    B.el.classList.add('blink'); setTimeout(() => B.el?.classList.remove('blink'), 140)
    if (Math.random() < 0.25) setTimeout(() => { B.el?.classList.add('blink'); setTimeout(() => B.el?.classList.remove('blink'), 120) }, 260)
    scheduleBlink()
  }, 2200 + Math.random() * 3500)
}

// O'zi yurib yurish
function scheduleWalk() {
  clearTimeout(B.walkT)
  B.walkT = setTimeout(walk, 7000 + Math.random() * 9000)
}
function walk() {
  if (!B.el || !BS.wander || B.busy || B.state !== 'idle' || !B.bubble.hidden || B.dragging || document.hidden) return scheduleWalk()
  const mobile = innerWidth < 760
  const tx = 8 + Math.random() * (innerWidth - B.w - 16)
  // Ko'pincha pastki qismda yuradi (yozish maydonini to'smaslik uchun biroz yuqorida), ba'zan yuqoriga ko'tariladi
  const floor = innerHeight - B.h - (mobile ? 120 : 140)
  const ty = Math.random() < 0.7 ? floor - Math.random() * 60 : 80 + Math.random() * Math.max(40, floor - 160)
  const dist = Math.hypot(tx - BS.x, ty - BS.y)
  if (dist < 40) return scheduleWalk()
  const ms = Math.min(9000, Math.max(1200, dist / 70 * 1000))
  B.el.classList.toggle('flip', tx < BS.x)
  B.av?.setFacing(tx < BS.x ? -1 : 1)
  setState('walk')
  place(tx, ty, true, ms)
  setTimeout(() => {
    if (B.state === 'walk') { setState('idle'); if (Math.random() < 0.3) wave() }
    saveBuddy(); scheduleWalk()
  }, ms)
}
function stopWalk() {
  if (B.state !== 'walk') return
  const r = B.el.getBoundingClientRect()
  place(r.left, r.top, false); setState('idle')
}
function wave() { B.av?.wave(); B.el?.classList.add('wave'); setTimeout(() => B.el?.classList.remove('wave'), 1600) }

// ---------- Surish, bosish, uzoq bosish ----------
function bindBuddy() {
  const el = B.el
  let sx, sy, ox, oy, moved, down = false, lp
  el.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return
    down = true; moved = false
    stopWalk()
    sx = e.clientX; sy = e.clientY; ox = BS.x; oy = BS.y
    el.setPointerCapture(e.pointerId)
    clearTimeout(lp); lp = setTimeout(() => { if (down && !moved) { down = false; openBuddyMenu() } }, 600)
  })
  el.addEventListener('pointermove', (e) => {
    if (!down) return
    const dx = e.clientX - sx, dy = e.clientY - sy
    if (!moved && Math.hypot(dx, dy) > 7) { moved = true; B.dragging = true; clearTimeout(lp); el.classList.add('drag'); B.menu.hidden = true }
    if (moved) { el.classList.toggle('flip', dx < 0); place(ox + dx, oy + dy, false) }
  })
  const up = () => {
    if (!down) return
    down = false; clearTimeout(lp)
    if (moved) { B.dragging = false; el.classList.remove('drag'); saveBuddy(); scheduleWalk(); return }
    buddyTap()
  }
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', () => { down = false; clearTimeout(lp); B.dragging = false; el.classList.remove('drag') })
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); openBuddyMenu() })
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buddyTap() } })

  B.bubble.querySelector('.bb-x').addEventListener('click', () => { buddyCancel(); B.bubble.hidden = true })
  B.bubble.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault()
    const inp = B.bubble.querySelector('.bb-in'); const text = inp.value.trim()
    if (!text) return
    inp.value = ''
    B.rec?.cancel(); B.rec = null
    buddyAsk(text)
  })
  B.bubble.querySelector('.bb-in').addEventListener('focus', () => { if (B.rec) { B.rec.cancel(); B.rec = null; setState('idle'); say('Yozing, men o\'qiyman ✍️', { keep: true }) } })
}

// ---------- Suhbat ----------
async function buddyTap() {
  const c = BUDDIES[BS.char]
  if (B.state === 'talk') { stopSpeaking(); setState('idle'); return }        // gapini bo'lish
  if (B.rec) { const r = B.rec; r.spoke = true; buddyHeard(r, true); return }  // tezroq yuborish
  if (B.busy) return
  if (!S.features.stt) { say(c.hello + ' (Ovoz uchun kalit ulanmagan — yozib yuboring)', { keep: true }); B.bubble.querySelector('.bb-in').focus(); return }
  stopSpeaking()
  setState('listen')
  say('Tinglayapman… 👂', { keep: true })
  const r = new Recorder({ vad: true, onLevel: (l) => B.el?.style.setProperty('--lvl', l.toFixed(2)), onSilence: (spoke) => buddyHeard(r, spoke) })
  B.rec = r
  try { await r.start() } catch { B.rec = null; setState('idle'); say('Mikrofonga ruxsat bering yoki yozib yuboring 🙏', { keep: true }) }
}
function buddyCancel() { B.rec?.cancel(); B.rec = null; stopSpeaking(); if (!B.busy) setState('idle') }

async function buddyHeard(r, spoke) {
  if (B.rec !== r) return
  B.rec = null
  if (!spoke) { r.cancel(); setState('idle'); say('Hech narsa eshitmadim 🙂 Yana bosing yoki yozing.'); return }
  setState('think'); say('Eshitdim… 🤔', { keep: true })
  try {
    const out = await r.stop()
    const text = await transcribe(out.blob)
    if (!text) { setState('idle'); say('Tushunmadim, qaytadan aytasizmi?'); return }
    buddyAsk(text, true)
  } catch (e) { setState('idle'); say(e.message || 'Xato') }
}

async function buddyAsk(text, voice = false) {
  const c = BUDDIES[BS.char]
  if (S.busy) { say('Bir soniya, hozir boshqa javob yozyapman…'); return }
  B.busy = true
  setState('think'); say('“' + text + '” — o\'ylayapman…', { keep: true })
  const chat = ensureChat(text)
  const intent = detect(text, [], chat)
  chat.messages.push({ role: 'user', content: text, ...(voice ? { voice: true } : {}) })
  chat.updated = Date.now(); save(); renderList()
  try {
    if (intent === 'draw' || intent === 'edit-last') {
      say('Chizyapman… 🎨', { keep: true })
      const res = await draw(chat, text, intent === 'edit-last' ? [lastGenerated(chat)] : [])
      const line = res ? 'Tayyor! Rasm chatda turibdi 🖼' : 'Kechirasiz, chiza olmadim 😔'
      await buddySpeak(line)
      return
    }
    const msg = await ask(chat, { voice: true, persona: { name: c.name, trait: c.trait }, onText: (t) => { setState('think'); say(plain(t).slice(-220), { keep: true }) } })
    if (!msg) { setState('idle'); say('Javob ololmadim, birozdan keyin urinib ko\'ring 🙏'); return }
    await buddySpeak(msg.content)
  } finally {
    B.busy = false
    if (B.state !== 'talk') setState('idle')
  }
}

async function buddySpeak(text) {
  const c = BUDDIES[BS.char]
  const shown = plain(text)
  say(shown.length > 320 ? shown.slice(0, 320) + '…' : shown, { keep: true })
  setState('think')
  await speak(text, { gender: c.gender, onStart: () => setState('talk') })
  if (B.state === 'talk') setState('idle')
  clearTimeout(B.hideT); B.hideT = setTimeout(() => { if (!B.busy) B.bubble.hidden = true }, 9000)
}

// ---------- Menyu ----------
function openBuddyMenu() {
  stopWalk()
  const m = B.menu
  m.innerHTML = `
    <div class="bm-h">Yordamchi</div>
    <div class="bm-chars">${Object.entries(BUDDIES).map(([id, c]) => `
      <button class="bm-char ${id === BS.char ? 'on' : ''}" data-char="${id}">${buddyFace(id)}<span>${c.name}</span></button>`).join('')}</div>
    <button class="bm-opt" data-act="wander"><span>O'zi yurib yursin</span><i class="sw ${BS.wander ? 'on' : ''}"></i></button>
    <button class="bm-opt" data-act="voice"><span>Katta ovozli suhbat</span></button>
    <button class="bm-opt" data-act="hide"><span>Yashirish</span></button>`
  m.hidden = false
  const mw = 290, mh = m.offsetHeight
  let left = BS.x + B.w / 2 - mw / 2; left = Math.max(10, Math.min(innerWidth - mw - 10, left))
  let top = BS.y - mh - 8; if (top < 10) top = Math.min(innerHeight - mh - 10, BS.y + B.h + 8)
  m.style.left = left + 'px'; m.style.top = top + 'px'
}
document.addEventListener('click', (e) => {
  if (!B.menu || B.menu.hidden) return
  const ch = e.target.closest('[data-char]')
  if (ch) {
    BS.char = ch.dataset.char; saveBuddy(); B.menu.hidden = true
    buildBuddy(); wave(); say(BUDDIES[BS.char].hello)
    return
  }
  const act = e.target.closest('[data-act]')?.dataset.act
  if (act === 'wander') { BS.wander = !BS.wander; saveBuddy(); e.target.closest('[data-act]').querySelector('.sw').classList.toggle('on', BS.wander); if (BS.wander) scheduleWalk(); return }
  if (act === 'voice') { B.menu.hidden = true; openVoice(); return }
  if (act === 'hide') { B.menu.hidden = true; toggleBuddy(false); toast("Yordamchi yashirildi — chap paneldan qaytarasiz"); return }
  if (!e.target.closest('.bmenu') && !e.target.closest('.buddy')) B.menu.hidden = true
})

// ---------- Ko'rsatish / yashirish (chap paneldagi tugma) ----------
function toggleBuddy(on) {
  BS.on = on ?? !BS.on; saveBuddy()
  if (!BS.on) { buddyCancel(); clearTimeout(B.walkT); clearTimeout(B.blinkT); B.av?.destroy(); B.av = null; B.el?.remove(); B.bubble?.remove(); B.menu?.remove(); B.el = null; renderBuddyToggle() }
  else { buildBuddy(); wave(); say(BUDDIES[BS.char].hello) }
}
function renderBuddyToggle() {
  const b = document.getElementById('buddyBtn'); if (!b) return
  b.querySelector('span').textContent = BS.on ? `Yordamchi: ${BUDDIES[BS.char].name}` : 'Yordamchini chiqarish'
  b.querySelector('.bt-face').innerHTML = buddyFace(BS.char)
}
document.getElementById('buddyBtn')?.addEventListener('click', () => { toggleBuddy(); closeSide() })
document.addEventListener('visibilitychange', () => { if (document.hidden) buddyCancel() })

// ---------- Boshlash ----------
buildBuddy()
if (BS.on && !store.get('buddySeen', false)) { setTimeout(() => { wave(); say(BUDDIES[BS.char].hello + ' Meni surishingiz mumkin, uzoq bossangiz — menyu.') }, 900); store.set('buddySeen', true) }
