// ============ Shinobu bilan o'yinlar: Tir, Tosh-qaychi-qog'oz, Yurakcha ushlash ============

// Qiyinlik: siz ko'p yutsangiz, Shinobu ham kuchayadi (osonlikcha yutqazmaydi)
const GSTAT = Object.assign({ win: 0, lose: 0 }, store.get('gstat', {}))
const skill = () => Math.max(0.55, Math.min(0.95, 0.68 + (GSTAT.win - GSTAT.lose) * 0.04))

const Games = {
  active: null,
  LIST: [
    { id: 'tir', name: 'Tir', desc: 'Nishonlarni urib, Shinobu bilan bellashing' },
    { id: 'whack', name: "Ko'rshapalak urish", desc: "Chiqib qolgan ko'rshapalaklarni tez uring" },
    { id: 'memory', name: 'Xotira kartalari', desc: 'Juftlarni toping — navbatma-navbat' },
    { id: 'ttt', name: 'Krestik-nolik', desc: "Uchtasini bir qatorga tering" },
    { id: 'reaction', name: 'Kim tezroq', desc: "Yashil chiqqanda birinchi bosing" },
    { id: 'quiz', name: 'Savol-javob', desc: 'Bilimingizni sinang, u ham javob beradi' },
    { id: 'snake', name: 'Ilon', desc: "Olmalarni yeng, uning rekordini yangilang" },
    { id: 'rps', name: "Tosh-qaychi-qog'oz", desc: '5 raund, kim yutadi?' },
    { id: 'hearts', name: 'Yurakcha ushlash', desc: "Tushayotgan yurakchalarni savatga yig'ing" },
  ],
  start(kind) {
    if (this.active) return
    const fn = { tir: gameTir, rps: gameRps, hearts: gameHearts, whack: gameWhack, memory: gameMemory, ttt: gameTtt, reaction: gameReaction, quiz: gameQuiz, snake: gameSnake }[kind]
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
      if (res === 'win') GSTAT.win++; if (res === 'lose') GSTAT.lose++; store.set('gstat', GSTAT)
      const head = { win: "Siz yutdingiz!", lose: 'Shinobu yutdi!', draw: 'Durang!' }[res]
      g.body.innerHTML = `<div class="g-end"><b>${head}</b><span>Siz: ${you}${unit} · Shinobu: ${her}${unit}</span><div><button class="g-btn" data-again>Yana o'ynaymiz</button><button class="g-btn ghost" data-close>Yopish</button></div></div>`
      g.body.querySelector('[data-again]').onclick = () => { close(); Games.start(kind) }
      g.body.querySelector('[data-close]').onclick = close
      if (res === 'win') { Pet.react('lose', pick(["Hmph! Bu safar omadingiz keldi xolos.", "Yutqazdim?! Yana bir marta, hozir ko'rsataman!", "Mayli, zo'r ekansiz… ozgina.", "Bu hisobga kirmaydi! Qaytadan!"])); Pet.mood(4) }
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
    const herTry = 380 + Math.random() * 1100 * (1.3 - skill())
    g.later(() => { if (!t.dataset.hit && t.isConnected && Math.random() < 0.3 + skill() * 0.3) { t.dataset.hit = 1; her += pts; upd(); boom(t, 'her') } }, herTry)
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
  const seen = store.get('rpsSeen', { rock: 1, paper: 1, scissors: 1 })
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
      // ko'p tanlaydiganingizni eslab qoladi va uni yengishga harakat qiladi
      const fav = Object.entries(seen).sort((a, b) => b[1] - a[1])[0][0]
      const counter = keys.find((k) => RPS[k].beats === fav)
      const hers = Math.random() < (skill() - 0.45) ? counter : keys[Math.floor(Math.random() * 3)]
      seen[mine]++; store.set('rpsSeen', seen)
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
    her += Math.random() < skill() + 0.1 ? 1 + (Math.random() < 0.2 ? 2 : 0) : 0; upd()
    if (left === 15) Pet.react('cheer', you >= her ? 'Yaxshi ketyapsiz… lekin hali tugamadi!' : "Men ko'proq yig'dim! Ha-ha!")
    if (left <= 0) g.finish(you, her)
  }, 1000)
}


// ---------- Ko'rshapalak urish (whack-a-mole) ----------
function gameWhack(g) {
  g.title("Ko'rshapalak urish")
  const T = 30; let you = 0, her = 0, left = T
  const target = Math.round(18 + skill() * 14)
  her = target
  g.body.innerHTML = `<div class="whack"><div class="tir-time"><i></i></div><div class="wh-grid">${'<button class="wh-hole"><i></i></button>'.repeat(9)}</div></div>`
  const holes = [...g.body.querySelectorAll('.wh-hole')], bar = g.body.querySelector('.tir-time i')
  const upd = () => g.score(`<span>Siz <b>${you}</b></span><span>Shinobu rekordi <b>${her}</b></span>`)
  upd()
  holes.forEach((h) => h.onpointerdown = (e) => {
    e.preventDefault()
    if (h.classList.contains('up')) { h.classList.remove('up'); h.classList.add('bonk'); you += h.dataset.gold ? 3 : 1; upd(); setTimeout(() => h.classList.remove('bonk'), 250) }
  })
  const pop = () => {
    const free = holes.filter((h) => !h.classList.contains('up')); if (!free.length) return
    const h = pick(free); h.dataset.gold = Math.random() < 0.12 ? '1' : ''
    h.classList.toggle('gold', !!h.dataset.gold); h.classList.add('up')
    const life = Math.max(520, 1150 - (T - left) * 18)
    g.later(() => h.classList.remove('up'), life)
  }
  g.every(pop, 560); pop()
  g.every(() => {
    left--; bar.style.width = (left / T) * 100 + '%'
    if (left === 12) Pet.react(you > her ? 'surprised' : 'smug', you > her ? 'Voy, rekordimni yangilayapsizmi?!' : "Mening rekordimga yetolmaysiz!")
    if (left <= 0) g.finish(you, her)
  }, 1000)
}

// ---------- Xotira kartalari (navbatma-navbat) ----------
function gameMemory(g) {
  g.title('Xotira kartalari')
  const ids = ['rose', 'teddy', 'donut', 'cake', 'cat', 'ring', 'strawberry', 'balloon']
  const deck = [...ids, ...ids].sort(() => Math.random() - 0.5)
  let you = 0, her = 0, turn = 'you', open = [], lock = false
  const memory = new Map()   // Shinobu ko'rgan kartalarni eslab qoladi (ba'zan unutadi)
  g.body.innerHTML = `<div class="mem"><div class="mem-turn"></div><div class="mem-grid">${deck.map((id, i) => `<button class="mem-c" data-i="${i}"><i>${PROP_SVG[id]}</i></button>`).join('')}</div></div>`
  const cards = [...g.body.querySelectorAll('.mem-c')], turnEl = g.body.querySelector('.mem-turn')
  const upd = () => { g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`); turnEl.textContent = turn === 'you' ? 'Sizning navbatingiz' : "Shinobu o'ylayapti…" }
  upd()
  const flip = (i) => { cards[i].classList.add('open'); open.push(i); if (Math.random() < skill()) memory.set(i, deck[i]) }
  const check = () => {
    lock = true
    const [a, b] = open
    g.later(() => {
      if (deck[a] === deck[b]) {
        cards[a].classList.add('done'); cards[b].classList.add('done'); memory.delete(a); memory.delete(b)
        if (turn === 'you') you++; else { her++; Pet.react('smug') }
      } else {
        cards[a].classList.remove('open'); cards[b].classList.remove('open')
        turn = turn === 'you' ? 'her' : 'you'
      }
      open = []; lock = false; upd()
      if (you + her === ids.length) return g.later(() => g.finish(you, her), 600)
      if (turn === 'her') g.later(herMove, 800)
    }, 750)
  }
  const herMove = () => {
    if (g.over) return
    const left = cards.map((c, i) => i).filter((i) => !cards[i].classList.contains('done'))
    // ma'lum juft bormi?
    const known = [...memory.entries()].filter(([i]) => left.includes(i))
    let pair = null
    for (const [i, v] of known) { const j = known.find(([k, w]) => k !== i && w === v); if (j) { pair = [i, j[0]]; break } }
    const first = pair ? pair[0] : pick(left.filter((i) => !memory.has(i)).concat(left).slice(0, Math.max(1, left.length)))
    flip(first)
    g.later(() => {
      const kn = [...memory.entries()].find(([k, v]) => k !== first && v === deck[first] && left.includes(k))
      const second = pair ? pair[1] : kn ? kn[0] : pick(left.filter((i) => i !== first))
      flip(second); check()
    }, 650)
  }
  g.body.querySelector('.mem-grid').onclick = (e) => {
    const c = e.target.closest('.mem-c'); if (!c || lock || turn !== 'you' || c.classList.contains('open')) return
    flip(+c.dataset.i); if (open.length === 2) check()
  }
}

// ---------- Krestik-nolik (u kuchli — minimax, ba'zan ataylab xato qiladi) ----------
function gameTtt(g) {
  g.title('Krestik-nolik')
  let you = 0, her = 0, round = 0
  const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
  const win = (b) => { for (const [a, c, d] of L) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(Boolean) ? 'draw' : null }
  const mm = (b, me) => {
    const w = win(b); if (w === 'O') return { s: 1 }; if (w === 'X') return { s: -1 }; if (w === 'draw') return { s: 0 }
    let best = { s: me ? -2 : 2, i: -1 }
    b.forEach((v, i) => { if (v) return; b[i] = me ? 'O' : 'X'; const r = mm(b, !me).s; b[i] = null; if (me ? r > best.s : r < best.s) best = { s: r, i } })
    return best
  }
  const play = () => {
    const b = Array(9).fill(null); let lock = false
    const herFirst = round % 2 === 1
    g.body.innerHTML = `<div class="ttt"><div class="mem-turn">${round + 1}-raund (3 raunddan) — siz: X</div><div class="ttt-grid">${'<button></button>'.repeat(9)}</div></div>`
    const cells = [...g.body.querySelectorAll('.ttt-grid button')]
    const draw = () => cells.forEach((c, i) => { c.textContent = b[i] || ''; c.className = b[i] === 'X' ? 'x' : b[i] === 'O' ? 'o' : '' })
    const end = (w) => {
      lock = true
      if (w === 'X') { you++; Pet.react('lose', pick(['Qanday qilib?!', 'Hmph, tasodif!'])) } else if (w === 'O') { her++; Pet.react('win', pick(['Ha-ha! Men yutdim!', 'Oson ekan!'])) } else Pet.react('think', 'Durang… hm.')
      g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
      round++
      g.later(() => (round >= 3 ? g.finish(you, her) : play()), 1300)
    }
    const herTurn = () => {
      lock = true
      g.later(() => {
        const free = b.map((v, i) => v ? -1 : i).filter((i) => i >= 0)
        const i = Math.random() < skill() + 0.08 ? mm(b, true).i : pick(free)
        b[i] = 'O'; draw(); const w = win(b); if (w) return end(w); lock = false
      }, 550)
    }
    g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
    g.body.querySelector('.ttt-grid').onclick = (e) => {
      const i = cells.indexOf(e.target.closest('button')); if (i < 0 || lock || b[i]) return
      b[i] = 'X'; draw(); const w = win(b); if (w) return end(w); herTurn()
    }
    if (herFirst) herTurn()
  }
  play()
}

// ---------- Kim tezroq (reaksiya) ----------
function gameReaction(g) {
  g.title('Kim tezroq')
  let you = 0, her = 0, round = 0, state = 'wait', t0 = 0, herT = 0
  g.body.innerHTML = `<button class="react-pad">Bosing — boshlaymiz</button>`
  const pad = g.body.querySelector('.react-pad')
  const upd = () => g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
  upd()
  const next = () => {
    if (round >= 5) return g.finish(you, her)
    state = 'ready'; pad.className = 'react-pad ready'; pad.textContent = 'Kuting… yashil bo\'lganda bosing'
    g.later(() => {
      if (state !== 'ready') return
      state = 'go'; pad.className = 'react-pad go'; pad.textContent = 'HOZIR!'; t0 = performance.now()
      const myT = 190 + Math.random() * 260 * (1.4 - skill())
      herT = g.later(() => { if (state !== 'go') return; state = 'done'; her++; round++; upd(); pad.className = 'react-pad lost'; pad.textContent = `Shinobu tezroq bosdi (${Math.round(myT)} ms)`; Pet.react('smug'); g.later(next, 1300) }, myT)
    }, 1200 + Math.random() * 2300)
  }
  pad.onpointerdown = () => {
    if (state === 'wait') return next()
    if (state === 'ready') { state = 'done'; her++; round++; upd(); pad.className = 'react-pad lost'; pad.textContent = 'Erta bosdingiz! Ochko Shinobu\'ga'; Pet.react('smug', 'Shoshilmang!'); g.later(next, 1300); return }
    if (state === 'go') { state = 'done'; you++; round++; upd(); pad.className = 'react-pad won'; pad.textContent = `Siz tezroq! ${Math.round(performance.now() - t0)} ms`; Pet.react('surprised'); g.later(next, 1300) }
  }
}

// ---------- Savol-javob ----------
const QUIZ = [
  ["O'zbekistonning poytaxti qaysi shahar?", ['Toshkent', 'Samarqand', 'Buxoro', 'Xiva'], 0],
  ["Bir yilda nechta oy bor?", ['10', '12', '11', '13'], 1],
  ["Qaysi sayyora Quyoshga eng yaqin?", ['Venera', 'Mars', 'Merkuriy', 'Yer'], 2],
  ["Suvning kimyoviy formulasi?", ['CO2', 'H2O', 'O2', 'NaCl'], 1],
  ["Registon maydoni qaysi shaharda?", ['Buxoro', 'Toshkent', 'Samarqand', 'Termiz'], 2],
  ["Eng katta okean qaysi?", ['Atlantika', 'Hind', 'Shimoliy Muz', 'Tinch'], 3],
  ["7 × 8 nechaga teng?", ['54', '56', '64', '58'], 1],
  ["Kamalakda nechta rang bor?", ['5', '6', '7', '8'], 2],
  ["Amir Temur qaysi asrda yashagan?", ['XII', 'XIV', 'XVI', 'X'], 1],
  ["Eng tez quruqlik hayvoni?", ['Sher', 'Gepard', 'Ot', 'Bo\'ri'], 1],
  ["Bir sutkada necha soat bor?", ['12', '20', '24', '36'], 2],
  ["Qaysi biri dasturlash tili?", ['HTML', 'Python', 'CSS', 'JSON'], 1],
  ["Yer o'z o'qi atrofida necha soatda aylanadi?", ['12', '24', '48', '365'], 1],
  ["\"Alpomish\" qanday asar?", ['Doston', 'Roman', "She'r", 'Hikoya'], 0],
  ["Eng katta qit'a qaysi?", ['Afrika', 'Yevropa', 'Osiyo', 'Amerika'], 2],
  ["100 ning yarmi necha?", ['25', '50', '40', '60'], 1],
  ["Qaysi hayvon \"cho'l kemasi\" deyiladi?", ['Ot', 'Fil', 'Tuya', 'Eshak'], 2],
  ["Mirzo Ulug'bek kim bo'lgan?", ['Shoir', 'Astronom', 'Rassom', 'Sayyoh'], 1],
  ["Qaysi meva sariq rangda bo'ladi?", ['Banan', 'Olcha', 'Uzum', 'Anor'], 0],
  ["Kompyuterning \"miyasi\" nima?", ['Monitor', 'Protsessor', 'Sichqoncha', 'Klaviatura'], 1],
  ["Futbol jamoasida maydonda nechta o'yinchi bo'ladi?", ['9', '10', '11', '12'], 2],
  ["Navro'z qaysi oyda nishonlanadi?", ['Yanvar', 'Mart', 'May', 'Sentyabr'], 1],
  ["Eng baland tog' cho'qqisi?", ['Elbrus', 'Everest', 'Monblan', 'Kilimanjaro'], 1],
  ["Alisher Navoiy qaysi tilda ko'p ijod qilgan?", ['Arab', 'Turkiy (eski o\'zbek)', 'Rus', 'Ingliz'], 1],
  ["Qaysi gaz o'simliklar uchun kerak?", ['Karbonat angidrid', 'Geliy', 'Azot', 'Vodorod'], 0],
]
function gameQuiz(g) {
  g.title('Savol-javob')
  const qs = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 7)
  let you = 0, her = 0, i = 0
  const upd = () => g.score(`<span>Siz <b>${you}</b></span><span>Shinobu <b>${her}</b></span>`)
  const show = () => {
    if (i >= qs.length) return g.finish(you, her)
    const [q, opts, ok] = qs[i]
    g.body.innerHTML = `<div class="quiz"><small>${i + 1} / ${qs.length}</small><b>${q}</b><div class="quiz-opts">${opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div><div class="quiz-her"></div></div>`
    upd()
    const btns = [...g.body.querySelectorAll('.quiz-opts button')]
    g.body.querySelector('.quiz-opts').onclick = (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return
      btns.forEach((x) => x.disabled = true)
      const mine = +b.dataset.k
      const herK = Math.random() < skill() ? ok : pick([0, 1, 2, 3].filter((k) => k !== ok))
      btns[ok].classList.add('right'); if (mine !== ok) b.classList.add('wrong')
      if (mine === ok) you++
      if (herK === ok) her++
      g.body.querySelector('.quiz-her').textContent = `Shinobu: "${opts[herK]}" ${herK === ok ? '— to\'g\'ri' : '— xato'}`
      Pet.react(herK === ok ? 'smug' : 'sad')
      upd(); i++; g.later(show, 1600)
    }
  }
  show()
}

// ---------- Ilon ----------
function gameSnake(g) {
  g.title('Ilon')
  const N = 16, rec = store.get('snakeHer', 0) || Math.round(10 + skill() * 8)
  let snake = [[8, 8], [7, 8], [6, 8]], dir = [1, 0], next = [1, 0], food = null, score = 0, dead = false
  g.body.innerHTML = `<div class="snake"><canvas></canvas><small class="hearts-tip">← ↑ → ↓ yoki ekranni suring. Shinobu rekordi: ${rec}</small></div>`
  const wrap = g.body.querySelector('.snake'), cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d')
  const S2 = Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight - 10) / N) * devicePixelRatio
  cv.width = cv.height = S2 * N; cv.style.width = cv.style.height = S2 * N / devicePixelRatio + 'px'
  const upd = () => g.score(`<span>Siz <b>${score}</b></span><span>Shinobu rekordi <b>${rec}</b></span>`)
  const place = () => { do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)] } while (snake.some(([x, y]) => x === food[0] && y === food[1])) }
  place(); upd()
  const key = (e) => {
    const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (m && (m[0] !== -dir[0] || m[1] !== -dir[1])) { next = m; e.preventDefault() }
  }
  addEventListener('keydown', key); g.stops.push(() => removeEventListener('keydown', key))
  let sx = 0, sy = 0
  wrap.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY })
  wrap.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    key({ key: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'), preventDefault() {} })
  })
  const draw = () => {
    ctx.fillStyle = '#10131a'; ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.fillStyle = '#e2304b'; ctx.beginPath(); ctx.arc((food[0] + 0.5) * S2, (food[1] + 0.5) * S2, S2 * 0.38, 0, 7); ctx.fill()
    snake.forEach(([x, y], i) => { ctx.fillStyle = i ? '#4fd18b' : '#9dffc6'; ctx.fillRect(x * S2 + 1, y * S2 + 1, S2 - 2, S2 - 2) })
  }
  draw()
  let speed = 140
  const step = () => {
    if (dead || g.over) return
    dir = next
    const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]]
    if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || snake.some(([x, y]) => x === h[0] && y === h[1])) {
      dead = true
      if (score > rec) store.set('snakeHer', score + 2)   // keyingi safar u ham kuchliroq
      return g.finish(score, rec)
    }
    snake.unshift(h)
    if (h[0] === food[0] && h[1] === food[1]) { score++; upd(); place(); speed = Math.max(70, speed - 4); if (score === rec - 2) Pet.react('scared', 'Voy, rekordimga yaqinlashyapsiz!') } else snake.pop()
    draw(); g.later(step, speed)
  }
  g.later(step, 600)
}
