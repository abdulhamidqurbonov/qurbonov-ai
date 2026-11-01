// ============ Shinobu bilan o'yinlar: Tir, Tosh-qaychi-qog'oz, Yurakcha ushlash ============

const Games = {
  active: null,
  start(kind) {
    if (this.active) return
    const fn = { tir: gameTir, rps: gameRps, hearts: gameHearts }[kind]
    if (!fn) return
    stopSpeaking?.()
    const box = document.createElement('div'); box.className = 'game'
    box.innerHTML = `<div class="g-card"><div class="g-top"><b class="g-title"></b><div class="g-score"></div><button class="g-x" aria-label="Yopish"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="g-body"></div></div>`
    document.body.appendChild(box)
    const g = { box, body: box.querySelector('.g-body'), stops: [], over: false,
      title(t) { box.querySelector('.g-title').textContent = t },
      score(h) { box.querySelector('.g-score').innerHTML = h },
      later(f, ms) { const id = setTimeout(f, ms); this.stops.push(() => clearTimeout(id)) },
      every(f, ms) { const id = setInterval(f, ms); this.stops.push(() => clearInterval(id)) },
      raf(f) { let on = true; const loop = (t) => { if (!on) return; f(t); requestAnimationFrame(loop) }; requestAnimationFrame(loop); this.stops.push(() => { on = false }) },
    }
    const close = () => { g.over = true; g.stops.forEach((s) => s()); box.remove(); this.active = null; removeEventListener('keydown', onKey) }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', onKey)
    box.querySelector('.g-x').onclick = close
    g.close = close
    g.finish = (you, her, unit = '') => {
      g.over = true; g.stops.forEach((s) => s()); g.stops = []
      const res = you > her ? 'win' : you < her ? 'lose' : 'draw'
      const head = { win: "Siz yutdingiz!", lose: 'Shinobu yutdi!', draw: 'Durang!' }[res]
      g.body.innerHTML = `<div class="g-end"><b>${head}</b><span>Siz: ${you}${unit} · Shinobu: ${her}${unit}</span><div><button class="g-btn" data-again>Yana o'ynaymiz</button><button class="g-btn ghost" data-close>Yopish</button></div></div>`
      g.body.querySelector('[data-again]').onclick = () => { close(); Games.start(kind) }
      g.body.querySelector('[data-close]').onclick = close
      if (res === 'win') { Pet.react('lose', pick(["Hmph! Bu safar omadingiz keldi xolos.", "Yutqazdim?! Yana bir marta, hozir ko'rsataman!", "Mayli, zo'r ekansiz… ozgina."])); Pet.mood(4) }
      else if (res === 'lose') { Pet.react('win', pick(["Ha-ha! Men buyuk vampirman, menga teng kelolmaysiz!", "Yutdim! Mukofotga donut berasiz!", "Ko'rdingizmi? Men eng zo'riman!"])); Pet.mood(12) }
      else { Pet.react('think', "Durang? Qayta o'ynaymiz, men baribir yutaman!"); Pet.mood(6) }
    }
    this.active = g
    fn(g)
    Pet.react('cheer', pick(["Boshladik! Yutqazsangiz menga shirinlik olib berasiz.", "Tayyormisiz? Men ayamayman!", "Qani, kim zo'r ekan ko'ramiz!"]))
  },
}

// ---------- Tir: nishonlarni urish, Shinobu ham otadi ----------
function gameTir(g) {
  g.title('Tir')
  const T = 30
  let you = 0, her = 0, left = T
  g.body.innerHTML = `<div class="tir"><div class="tir-time"><i></i></div></div>`
  const field = g.body.querySelector('.tir'), bar = field.querySelector('.tir-time i')
  const upd = () => g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
  upd()
  const spawn = () => {
    if (g.over) return
    const t = document.createElement('button'); t.className = 'tir-t'
    const gold = Math.random() < 0.15
    if (gold) t.classList.add('gold')
    const size = gold ? 38 : 46 + Math.random() * 16
    const fw = field.clientWidth, fh = field.clientHeight
    t.style.width = t.style.height = size + 'px'
    t.style.left = Math.random() * (fw - size) + 'px'; t.style.top = 14 + Math.random() * (fh - size - 14) + 'px'
    const pts = gold ? 3 : 1
    const life = gold ? 1100 : 1700 + Math.random() * 700
    t.onpointerdown = (e) => {
      e.preventDefault(); if (t.dataset.hit) return
      t.dataset.hit = 1; you += pts; upd(); boom(t, 'you')
      if (pts === 3 && Math.random() < 0.5) Pet.react('think', pick(['Voy, oltin nishon!', 'Hmm, chaqqon ekansiz.']))
    }
    field.appendChild(t)
    // Shinobu ham otadi: ba'zan sizdan oldin uradi
    const herTry = 450 + Math.random() * 1300
    g.later(() => { if (!t.dataset.hit && t.isConnected && Math.random() < 0.42) { t.dataset.hit = 1; her += pts; upd(); boom(t, 'her') } }, herTry)
    g.later(() => t.remove(), life)
  }
  const boom = (t, who) => { t.classList.add('hit', who); g.later(() => t.remove(), 260) }
  // Bo'sh joyga bosish — o'q tegmadi
  field.addEventListener('pointerdown', (e) => {
    if (e.target !== field) return
    const m = document.createElement('i'); m.className = 'tir-miss'; const r = field.getBoundingClientRect()
    m.style.left = e.clientX - r.left + 'px'; m.style.top = e.clientY - r.top + 'px'; field.appendChild(m); g.later(() => m.remove(), 400)
  })
  g.every(spawn, 650); spawn()
  g.every(() => {
    left -= 1; bar.style.width = (left / T) * 100 + '%'
    if (left === 10) Pet.react('cheer', her > you ? "Men oldindaman! Ha-ha!" : "Hali ham yetib olaman!")
    if (left <= 0) g.finish(you, her)
  }, 1000)
}

// ---------- Tosh-qaychi-qog'oz: 5 raund ----------
const RPS = {
  rock: { n: 'Tosh', beats: 'scissors', svg: '<svg viewBox="0 0 48 48"><path d="M10 26c-2-8 4-14 12-14 4-3 12-2 15 3 5 1 7 6 5 11 2 6-3 12-10 12H20c-6 0-9-5-10-12z" fill="#b8b2a8"/><path d="M18 22c3-1 6 0 8 2M28 18c3 0 5 2 6 4" stroke="#8d877d" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  scissors: { n: 'Qaychi', beats: 'paper', svg: '<svg viewBox="0 0 48 48"><g stroke="#cfd6e0" stroke-width="3.5" stroke-linecap="round"><path d="M22 26L40 8M22 22L40 40"/></g><circle cx="13" cy="15" r="6" stroke="#f4b544" stroke-width="3.5" fill="none"/><circle cx="13" cy="33" r="6" stroke="#f4b544" stroke-width="3.5" fill="none"/><path d="M18 19l4 5M18 29l4-5" stroke="#f4b544" stroke-width="3.5"/></svg>' },
  paper: { n: "Qog'oz", beats: 'rock', svg: '<svg viewBox="0 0 48 48"><path d="M12 6h18l8 8v28H12z" fill="#f3efe7"/><path d="M30 6v8h8" fill="#d9d3c7"/><path d="M17 20h15M17 26h15M17 32h10" stroke="#b8b2a8" stroke-width="2" stroke-linecap="round"/></svg>' },
}
function gameRps(g) {
  g.title("Tosh-qaychi-qog'oz")
  let you = 0, her = 0, round = 0, lock = false
  const upd = () => g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
  g.body.innerHTML = `<div class="rps"><div class="rps-arena"><div class="rps-side"><small>Siz</small><i data-you></i></div><b class="rps-vs">5 raunddan</b><div class="rps-side"><small>Shinobu</small><i data-her></i></div></div>
    <div class="rps-pick">${Object.entries(RPS).map(([k, v]) => `<button data-k="${k}">${v.svg}<span>${v.n}</span></button>`).join('')}</div></div>`
  upd()
  const yEl = g.body.querySelector('[data-you]'), hEl = g.body.querySelector('[data-her]'), vs = g.body.querySelector('.rps-vs')
  g.body.querySelector('.rps-pick').onclick = (e) => {
    const b = e.target.closest('[data-k]'); if (!b || lock) return
    lock = true
    const mine = b.dataset.k, keys = Object.keys(RPS)
    yEl.innerHTML = RPS[mine].svg; hEl.innerHTML = ''; hEl.classList.add('shake'); vs.textContent = '…'
    g.later(() => {
      const hers = keys[Math.floor(Math.random() * 3)]
      hEl.classList.remove('shake'); hEl.innerHTML = RPS[hers].svg
      round++
      if (mine === hers) { vs.textContent = 'Teng'; Pet.react('think') }
      else if (RPS[mine].beats === hers) { you++; vs.textContent = 'Siz oldingiz'; Pet.react('lose') }
      else { her++; vs.textContent = 'Shinobu oldi'; Pet.react('cheer') }
      upd(); lock = false
      if (you === 3 || her === 3 || round === 5) g.later(() => g.finish(you, her), 900)
    }, 700)
  }
}

// ---------- Yurakcha ushlash ----------
function gameHearts(g) {
  g.title('Yurakcha ushlash')
  const T = 30
  let you = 0, left = T, x = 0.5, items = [], last = 0, spawnAcc = 0
  g.body.innerHTML = `<div class="hearts"><canvas></canvas><div class="tir-time"><i></i></div><small class="hearts-tip">Savatni sichqoncha, barmoq yoki ← → bilan suring. Qora yurakdan qoching!</small></div>`
  const wrap = g.body.querySelector('.hearts'), cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d'), bar = wrap.querySelector('.tir-time i')
  const fit = () => { const r = wrap.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio }
  fit()
  // Shinobu "o'z hisobini" ham yig'adi — taxminiy raqib
  let her = 0
  const upd = () => g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
  upd()
  wrap.addEventListener('pointermove', (e) => { const r = wrap.getBoundingClientRect(); x = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width)) })
  wrap.addEventListener('pointerdown', (e) => { const r = wrap.getBoundingClientRect(); x = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width)) })
  const keys = {}
  const kd = (e) => { keys[e.key] = e.type === 'keydown' }
  addEventListener('keydown', kd); addEventListener('keyup', kd)
  g.stops.push(() => { removeEventListener('keydown', kd); removeEventListener('keyup', kd) })
  const heart = (c, px, py, s, col) => {
    c.save(); c.translate(px, py); c.scale(s / 24, s / 24); c.translate(-12, -11)
    c.fillStyle = col; c.beginPath(); c.moveTo(12, 21); c.bezierCurveTo(4, 15, 0, 11, 0, 6.5); c.arc(6, 6.5, 6, Math.PI, 0); c.arc(18, 6.5, 6, Math.PI, 0); c.bezierCurveTo(24, 11, 20, 15, 12, 21); c.fill(); c.restore()
  }
  g.raf((t) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t
    const W = cv.width, Hh = cv.height, d = devicePixelRatio
    if (keys.ArrowLeft) x = Math.max(0.06, x - dt * 0.9)
    if (keys.ArrowRight) x = Math.min(0.94, x + dt * 0.9)
    spawnAcc += dt
    const rate = 0.55 - (T - left) * 0.008
    if (spawnAcc > rate) {
      spawnAcc = 0
      const kind = Math.random() < 0.18 ? 'bad' : Math.random() < 0.12 ? 'gold' : 'ok'
      items.push({ x: 0.05 + Math.random() * 0.9, y: -0.05, v: 0.28 + Math.random() * 0.22 + (T - left) * 0.006, kind })
    }
    ctx.clearRect(0, 0, W, Hh)
    const bx = x * W, by = Hh - 34 * d, bw = 74 * d
    // savat
    ctx.fillStyle = '#c98f5a'; ctx.beginPath(); ctx.moveTo(bx - bw / 2, by); ctx.lineTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2 - 8 * d, by + 26 * d); ctx.lineTo(bx - bw / 2 + 8 * d, by + 26 * d); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 2 * d; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 13 * d, by + 2 * d); ctx.lineTo(bx + i * 11 * d, by + 24 * d); ctx.stroke() }
    items = items.filter((it) => {
      it.y += it.v * dt
      const px = it.x * W, py = it.y * Hh
      heart(ctx, px, py, (it.kind === 'gold' ? 30 : 26) * d, it.kind === 'bad' ? '#2a2530' : it.kind === 'gold' ? '#f4b544' : '#ff5a7a')
      if (it.kind === 'bad') { ctx.strokeStyle = '#8d929c'; ctx.lineWidth = 1.6 * d; ctx.beginPath(); ctx.moveTo(px, py - 8 * d); ctx.lineTo(px - 3 * d, py); ctx.lineTo(px + 3 * d, py + 3 * d); ctx.stroke() }
      if (py > by - 6 * d && py < by + 18 * d && Math.abs(px - bx) < bw / 2) {
        if (it.kind === 'bad') { you = Math.max(0, you - 3); Pet.react('cheer') } else you += it.kind === 'gold' ? 3 : 1
        upd(); return false
      }
      return py < Hh + 20 * d
    })
  })
  g.every(() => {
    left -= 1; bar.style.width = (left / T) * 100 + '%'
    her += Math.random() < 0.75 ? 1 + (Math.random() < 0.15 ? 2 : 0) : 0; upd()
    if (left === 15) Pet.react('cheer', you >= her ? 'Yaxshi ketyapsiz… lekin hali tugamadi!' : "Men ko'proq yig'dim! Ha-ha!")
    if (left <= 0) g.finish(you, her)
  }, 1000)
}
