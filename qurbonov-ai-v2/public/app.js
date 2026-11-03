// ============ Qurbonov AI — sayt mantig'i ============
// Rejim yo'q: nima yozsangiz, o'zi tushunadi — chat, rasm chizish, rasmni tahrirlash yoki rasm haqida savol.
// Suhbatlar brauzeringizda (localStorage) saqlanadi.

const $ = (id) => document.getElementById(id)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ICON = {
  del: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  speak: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  stopSpeak: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  micOff: '<svg viewBox="0 0 24 24"><path d="M15 10V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.6 2.5M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11a6.4 6.4 0 0 1-.6 2.7M12 17.5V21M3 3l18 18"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
}

// ---------- Saqlash ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('qai.' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('qai.' + k, JSON.stringify(v)) } catch { /* to'lgan yoki yopiq */ } },
}

const S = {
  chats: store.get('chats', []),
  activeId: null,
  mode: store.get('mode', 'auto'),
  cool: store.get('cool', {}),
  providers: [],
  features: {},
  pass: store.get('pass', ''),
  busy: false,
  ctrl: null,
  attach: [],          // biriktirilgan rasmlar (dataURL)
}
const MAX_HISTORY = 60000

function save() {
  S.chats = S.chats.slice(0, 200)
  for (let tries = 0; tries < 80; tries++) {
    try { localStorage.setItem('qai.chats', JSON.stringify(S.chats)); return } catch { /* joy tugadi */ }
    // Joy tugasa — eng eski rasmlarni xotiradan olib tashlaymiz (matni qoladi)
    let dropped = false
    for (let c = S.chats.length - 1; c >= 0 && !dropped; c--) {
      for (const m of S.chats[c].messages) {
        if (m.image) { m.image = null; m.lost = true; dropped = true; break }
        if (m.images?.length) { m.images = []; m.lostImages = true; dropped = true; break }
      }
    }
    if (!dropped) return
  }
}
const active = () => S.chats.find((c) => c.id === S.activeId)
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const H = (json = true) => ({ ...(json ? { 'content-type': 'application/json' } : {}), 'x-qai-pass': S.pass })

// ---------- Markdown ----------
marked.setOptions({ gfm: true, breaks: true })
function md(text) {
  const html = DOMPurify.sanitize(marked.parse(text || ''))
  return html.replace(/<pre>/g, '<pre><button class="cp" data-cp>Nusxa</button>')
}
function plain(text) {   // ovoz uchun: markdownsiz toza matn
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' kod. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[#*_>|~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------- Kichik yordamchilar ----------
let toastT
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show')
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2000)
}
function autosize() { const t = $('input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px' }
const atBottom = () => { const f = $('feed'); return f.scrollHeight - f.scrollTop - f.clientHeight < 140 }
const toBottom = () => { const f = $('feed'); f.scrollTop = f.scrollHeight }

// Rasmni kichraytirish (tez yuborish uchun)
async function shrink(src, max = 1024, q = 0.86) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', q)
}
const fileToDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f) })

// ---------- Server ----------
async function loadProviders() {
  try {
    const r = await fetch('/api/providers', { headers: H(false) })
    const d = await r.json()
    S.providers = d.providers || []
    S.features = d.features || {}
    if (d.needPass && !d.authorized) showGate()
  } catch { S.providers = [] }
  renderStatus(); renderPicker()
}
const resting = (pid) => (S.cool[pid] || 0) > Date.now()
const configured = () => S.providers.filter((p) => p.configured)

// ---------- Chap panel ----------
function renderList() {
  const box = $('chatList')
  if (!S.chats.length) { box.innerHTML = '<div class="empty-list">Suhbatlar shu yerda paydo bo\'ladi.</div>'; return }
  const day = new Date(); day.setHours(0, 0, 0, 0)
  const groups = { 'Bugun': [], 'Oldinroq': [] }
  for (const c of S.chats) (c.updated >= day.getTime() ? groups['Bugun'] : groups['Oldinroq']).push(c)
  box.innerHTML = Object.entries(groups).filter(([, a]) => a.length).map(([g, a]) =>
    `<div class="group">${g}</div>` + a.map((c) => `
      <div class="item ${c.id === S.activeId ? 'on' : ''}" data-id="${c.id}">
        <span>${esc(c.title)}</span><button data-del="${c.id}" title="O'chirish">${ICON.del}</button>
      </div>`).join('')).join('')
}

function renderStatus() {
  $('status').innerHTML = configured().map((p) =>
    `<span class="pill" title="${esc(p.model)}"><i class="dot ${resting(p.id) ? 'rest' : 'ok'}"></i>${esc(p.name)}</span>`).join('')
    || '<span class="pill"><i class="dot"></i>Kalit ulanmagan</span>'
}

// ---------- Model tanlash ----------
function renderPicker() {
  const cur = S.providers.find((p) => p.id === S.mode)
  if (S.mode !== 'auto' && (!cur || !cur.configured)) S.mode = 'auto'
  $('pickerLabel').textContent = S.mode === 'auto' ? 'Avto' : cur.name
  $('pickerDot').className = 'dot ' + (S.mode === 'auto' ? 'auto' : resting(S.mode) ? 'rest' : 'ok')
  $('menu').innerHTML = `
    <div class="menu-h">Model</div>
    <button class="opt ${S.mode === 'auto' ? 'on' : ''}" data-mode="auto">
      <i class="dot auto"></i><span class="t"><b>Avto</b><small>Eng tez ishlaydiganini o'zi tanlaydi</small></span><span class="tick">${ICON.tick}</span>
    </button>` + configured().map((p) => `
    <button class="opt ${S.mode === p.id ? 'on' : ''}" data-mode="${p.id}">
      <i class="dot ${resting(p.id) ? 'rest' : 'ok'}"></i>
      <span class="t"><b>${esc(p.name)}</b><small>${resting(p.id) ? 'dam olyapti · ' : ''}${esc(p.model)}</small></span>
      <span class="tick">${ICON.tick}</span>
    </button>`).join('')
}
function setMode(mode) {
  S.mode = mode; store.set('mode', mode); renderPicker()
  toast(mode === 'auto' ? 'Avto rejim' : `Model: ${S.providers.find((p) => p.id === mode)?.name}`)
}
$('pickerBtn').addEventListener('click', (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden })
$('menu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]'); if (!b) return
  setMode(b.dataset.mode); $('menu').hidden = true; $('input').focus()
})
document.addEventListener('click', (e) => { if (!e.target.closest('.picker')) $('menu').hidden = true })

// "/groq", "/gemini", "/avto" — yashirin tezkor buyruqlar (yozish shart emas, menyu bor)
function command(text) {
  const m = text.match(/^\/(\S+)\s*$/); if (!m) return false
  const name = m[1].toLowerCase()
  if (['avto', 'auto'].includes(name)) { setMode('auto'); return true }
  const p = S.providers.find((x) => x.id === name || x.name.toLowerCase() === name)
  if (!p || !p.configured) return false
  setMode(p.id); return true
}

// ---------- Niyatni aniqlash (rejimsiz) ----------
// Rasm chizish so'rovi
const DRAW_RE = new RegExp([
  "\\b(rasm|surat|tasvir|logo|logotip|poster|banner|avatar|ikonka|oboy|fon\\s*rasm)\\w*\\s+(\\S+\\s+){0,3}(chiz|yarat|yasa|qilib\\s*ber|ishla)",
  "\\b(chizib|chizgin|chizing|chiz)\\b",
  "\\b(rasm|surat)\\w*\\s*:",
  "нарису|сгенерир\\S*\\s+(картин|изображ|фото|рисун|лого)|созда\\S*\\s+(картин|изображ|рисун|лого)",
  "\\bdraw\\b|\\b(generate|create|make)\\s+(me\\s+)?(an?\\s+)?(image|picture|photo|logo|illustration|wallpaper)",
].join('|'), 'i')
// Rasmni o'zgartirish so'rovi
const EDIT_RE = new RegExp([
  "o['ʻ‘`]?zgart|tahrir|almashtir|aylantir|olib\\s*tashla|o['ʻ‘`]?chir(ib|gin|ing)?\\b|qo['ʻ‘`]?sh(ib|gin|ing)?\\b|rangini|rangga|fonini|fonga|uslubida|stilida|qilib\\s*(ber|qo['ʻ‘`]?y)|yaxshila|tiniqlashtir|kattalashtir|kiyintir",
  "измени|поменя|замени|добавь|убери|удали|сделай|перекрась|стилиз",
  "\\b(edit|change|replace|remove|add|make\\s+(it|him|her|them|this)|turn\\s+(it|this)|recolor|restyle|enhance)\\b",
].join('|'), 'i')

function lastGenerated(chat) {
  if (!chat) return null
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i]
    if (m.role === 'assistant') return m.kind === 'image' && m.image ? m.image : null
  }
  return null
}

// "Rasm qanday yaratiladi?" kabi savollar — chizish emas
const QUESTION_RE = /(qanday|qanaqa|nima\s*uchun|nega|qaysi|mumkinmi|bo['ʻ‘`]?ladimi|\bhow\b|\bwhy\b|\bwhich\b|как|почему|какой)/i
function detect(text, images, chat) {
  if (!images.length && QUESTION_RE.test(text) && /\?\s*$/.test(text)) return 'chat'
  if (images.length) return EDIT_RE.test(text) || DRAW_RE.test(text) ? 'edit' : 'vision'
  if (DRAW_RE.test(text)) return 'draw'
  if (EDIT_RE.test(text) && lastGenerated(chat) && text.length < 220) return 'edit-last'
  return 'chat'
}

// So'z qoliplari ishonchsiz bo'lsa — AI'dan so'raymiz (rasm bilan bog'liq noaniq holatlar)
const IMG_WORD_RE = /rasm|surat|tasvir|foto|logo|image|picture|photo|картин|фото|изображ|рисун/i
async function smartIntent(text, images, chat) {
  const quick = detect(text, images, chat)
  if (!text) return quick
  const last = lastGenerated(chat)
  const ambiguous =
    (images.length > 0 && !/\?\s*$/.test(text)) ||
    (!images.length && last && text.length < 260 && quick !== 'draw') ||
    (!images.length && quick === 'chat' && IMG_WORD_RE.test(text)) ||
    (!images.length && quick === 'draw' && QUESTION_RE.test(text))
  if (!ambiguous) return quick
  const prevUser = [...chat.messages].reverse().find((m, i) => m.role === 'user' && i > 0)?.content || ''
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch('/api/intent', { method: 'POST', signal: ctrl.signal, headers: H(), body: JSON.stringify({ text, hasImages: images.length > 0, hasLastImage: !!last, prev: prevUser }) })
    clearTimeout(t)
    const d = await r.json()
    const map = { draw: 'draw', edit: 'edit', vision: 'vision', edit_last: 'edit-last', chat: images.length ? 'vision' : 'chat' }
    return map[d.intent] || quick
  } catch { return quick }
}
// Tahrirda asl rasm nisbatini saqlaymiz
const imgAspect = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight || 1); i.onerror = () => res(1); i.src = src })

// ---------- Xabarlarni chizish ----------
const IDEAS = [
  ['Rasm chiz', "Tog'lar orasida quyosh botishi, kinematografik rasm chizib ber"],
  ['Sotuv skripti', "Kursni sotish uchun qisqa qo'ng'iroq skripti yozib ber"],
  ['Kodni tushuntir', 'Python’da async/await qanday ishlaydi? Oddiy misol bilan'],
  ["G'oya", "Toshkentda kichik sarmoya bilan qanday biznes boshlasa bo'ladi?"],
]
function hello() {
  const none = S.providers.length && !configured().length
  return `<div class="hello">
    <div class="mark"><img src="/logo.svg" alt=""></div>
    <h2>Bugun nima qilamiz?</h2>
    <p>Yozing, gapiring yoki rasm yuklang — nima kerakligini o'zim tushunaman. Model band bo'lsa, boshqasiga o'tib ketaman.</p>
    ${none ? '<div class="warn-box">⚠ Hali API kalit ulanmagan. Netlify\'da (yoki .env faylda) kamida bitta kalit qo\'ying.</div>' : ''}
    <div class="ideas">${IDEAS.map(([t, q]) => `<button class="idea" data-q="${esc(q)}"><b>${t}</b><span>${esc(q)}</span></button>`).join('')}</div>
  </div>`
}

const AVA = '<div class="ava"><img src="/logo.svg" alt=""></div>'
function msgHTML(m, i) {
  if (m.role === 'user') {
    const pics = m.images?.length ? `<div class="thumbs">${m.images.map((u, k) => `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="rasm ${k + 1}"></a>`).join('')}</div>`
      : m.lostImages ? '<div class="thumbs-lost">rasm xotira to\'lgani uchun saqlanmadi</div>' : ''
    return `<div class="msg user">${pics}${m.content ? `<div class="body">${m.voice ? '<span class="vmark">🎤</span> ' : ''}${esc(m.content)}</div>` : ''}</div>`
  }
  const sw = m.note ? `<div class="switch">${ICON.swap}<span>${esc(m.note)} → <b>${esc(m.provider)}</b></span></div>` : ''
  if (m.kind === 'image') {
    const pic = m.image
      ? `<a class="gen" href="${m.image}" target="_blank" rel="noopener"><img src="${m.image}" alt="${esc(m.prompt || '')}" loading="lazy"></a>`
      : `<div class="gen lost">Rasm xotira to'lgani uchun saqlanmadi</div>`
    return `<div class="msg ai">${AVA}<div class="wrap">${sw}${pic}
      <div class="meta"><span class="who">${esc(m.provider || '')}${m.edited ? ' · tahrir' : ''}</span>
        ${m.image ? `<button data-dl="${i}" title="Yuklab olish">${ICON.dl}</button><button data-useimg="${i}" title="Shu rasmni tahrirlash">${ICON.edit}</button>` : ''}
        <button data-redo="${i}" title="Qayta chizish">${ICON.redo}</button></div></div></div>`
  }
  return `<div class="msg ai">${AVA}<div class="wrap">${sw}
    <div class="md">${md(m.content)}</div>
    <div class="meta"><span class="who">${esc(m.provider || '')}${m.model ? ' · ' + esc(m.model) : ''}</span>
      <button data-copy="${i}" title="Nusxa olish">${ICON.copy}</button>
      <button data-speak="${i}" title="Ovoz bilan o'qish">${ICON.speak}</button>
      <button data-redo="${i}" title="Qayta javob">${ICON.redo}</button></div></div></div>`
}

function renderFeed(extra = '') {
  const c = active()
  const msgs = c ? c.messages : []
  $('feed').innerHTML = (msgs.length ? msgs.map(msgHTML).join('') : extra ? '' : hello()) + extra
  $('title').textContent = c ? c.title : 'Yangi suhbat'
  toBottom()
}

function openChat(id) { if (S.busy) stop(); S.activeId = id; renderList(); renderFeed(); closeSide() }
function newChat() { if (S.busy) stop(); S.activeId = null; renderList(); renderFeed(); closeSide(); $('input').focus() }
function removeChat(id) {
  if (!confirm("Bu suhbat o'chirilsinmi?")) return
  if (S.busy && S.activeId === id) stop()
  S.chats = S.chats.filter((c) => c.id !== id); save()
  if (S.activeId === id) S.activeId = null
  renderList(); renderFeed()
}

// ---------- Biriktirilgan rasmlar ----------
function renderTray() {
  const t = $('tray')
  t.hidden = !S.attach.length
  t.innerHTML = S.attach.map((u, i) => `<div class="att"><img src="${u}" alt=""><button type="button" data-rm="${i}" title="Olib tashlash">${ICON.del}</button></div>`).join('')
    + (S.attach.length ? `<div class="att-hint">Savol bering yoki nima o'zgartirishni yozing</div>` : '')
}
async function addFiles(files) {
  for (const f of [...files].filter((f) => f.type.startsWith('image/')).slice(0, 4 - S.attach.length)) {
    try { S.attach.push(await shrink(await fileToDataURL(f), 1024)) } catch { toast("Rasmni o'qib bo'lmadi") }
  }
  renderTray(); $('input').focus()
}
$('attachBtn').addEventListener('click', () => $('file').click())
$('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = '' })
$('tray').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { S.attach.splice(+b.dataset.rm, 1); renderTray() } })
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'))
  if (files.length) { e.preventDefault(); addFiles(files) }
})
let dragN = 0
$('main').addEventListener('dragenter', (e) => { if ([...e.dataTransfer.types].includes('Files')) { dragN++; $('drop').hidden = false } })
$('main').addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; $('drop').hidden = true } })
$('main').addEventListener('dragover', (e) => e.preventDefault())
$('main').addEventListener('drop', (e) => { e.preventDefault(); dragN = 0; $('drop').hidden = true; addFiles(e.dataTransfer.files) })

// ---------- Yuborish ----------
function history(msgs) {
  const out = []; let total = 0; let withImg = false
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    total += (m.content || '').length
    if (total > MAX_HISTORY && out.length) break
    const item = { role: m.role, content: m.content || '' }
    if (m.role === 'user' && m.images?.length && !withImg) { item.images = m.images; withImg = true }  // faqat oxirgi rasmli xabar
    out.unshift(item)
  }
  return out
}
function stop() { if (S.ctrl) S.ctrl.abort() }
function setBusy(b) {
  S.busy = b
  $('form').classList.toggle('busy', b)
  $('sendBtn').setAttribute('aria-label', b ? "To'xtatish" : 'Yuborish')
}

function ensureChat(title) {
  let chat = active()
  if (!chat) {
    chat = { id: uid(), title: (title || 'Rasm').replace(/[*#`]/g, '').replace(/\s+/g, ' ').slice(0, 42), updated: Date.now(), messages: [] }
    S.chats.unshift(chat); S.activeId = chat.id
  }
  return chat
}

async function send(textArg, opts = {}) {
  if (S.busy) { stop(); return }
  const input = $('input')
  const text = (textArg ?? input.value).trim()
  const images = textArg === undefined || opts.withAttach ? [...S.attach] : []
  if (!text && !images.length) return
  if (!images.length && command(text)) { input.value = ''; autosize(); return }
  if (textArg === undefined || opts.withAttach) { input.value = ''; autosize(); S.attach = []; renderTray(); input.placeholder = 'Xabar yozing yoki rasm yuklang…' }

  const chat = ensureChat(text || 'Rasm')
  const userMsg = { role: 'user', content: text, ...(images.length ? { images } : {}), ...(opts.voice ? { voice: true } : {}) }
  chat.messages.push(userMsg)
  chat.updated = Date.now()
  S.chats = [chat, ...S.chats.filter((c) => c.id !== chat.id)]
  save(); renderList()
  setBusy(true); renderFeed(`<div class="msg ai">${AVA}<div class="wrap"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div>Tushunyapman…</div></div></div>`)
  const intent = await smartIntent(text, images, { messages: chat.messages.slice(0, -1) })
  setBusy(false)
  if (S.activeId !== chat.id || !chat.messages.includes(userMsg)) return
  userMsg.intent = intent; save()
  const refFromLast = intent === 'edit-last' ? lastGenerated(chat) : null

  if (intent === 'draw') return draw(chat, text)
  if (intent === 'edit') return draw(chat, text, images)
  if (intent === 'edit-last' && refFromLast) return draw(chat, text, [refFromLast])
  return ask(chat)   // chatdagi mikrofon: javob odatdagidek (to'liq) yoziladi
}

// ---------- Rasm chizish / tahrirlash ----------
async function draw(chat, prompt, refs = []) {
  setBusy(true)
  const editing = refs.length > 0
  renderFeed(`<div class="msg ai">${AVA}<div class="wrap">
    <div class="gen loading"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div>${editing ? 'Rasm tahrirlanyapti…' : 'Rasm chizilyapti…'}</div></div></div></div>`)
  const ctrl = new AbortController(); S.ctrl = ctrl
  try {
    const small = editing ? await Promise.all(refs.map((u) => shrink(u, 500, 0.92))) : []
    const aspect = editing ? await imgAspect(refs[0]) : 0
    const res = await fetch('/api/image', { method: 'POST', signal: ctrl.signal, headers: H(), body: JSON.stringify({ prompt, images: small, aspect }) })
    if (res.status === 401) { showGate(); throw new Error("Parol noto'g'ri — qayta kiriting") }
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d.detail || `Xato ${res.status}`)
    const note = (d.skipped || []).map((s) => `${s.name} ${s.short}`).join(', ')
    finish(chat, { role: 'assistant', kind: 'image', image: d.image, prompt, provider: d.provider, note, edited: editing,
      content: editing ? `[Rasm tahrirlandi: ${prompt}]` : `[Rasm yaratildi: ${prompt}]` })
    return { image: d.image }
  } catch (err) {
    setBusy(false)
    if (err.name === 'AbortError') { renderFeed(); return null }
    if (S.activeId === chat.id) renderFeed(`<div class="err"><span>✕ ${esc(err.message)}</span><button data-retry>Qayta urinish</button></div>`)
    return null
  } finally {
    if (S.ctrl === ctrl) S.ctrl = null
  }
}

// ---------- Chat (oqim) ----------
async function ask(chat, opts = {}, attempt = 0) {
  setBusy(true)
  renderFeed(`<div class="msg ai" id="live">${AVA}<div class="wrap">
    <div id="liveSwitch"></div><div class="md cursor" id="liveText"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div>O'ylayapman…</div></div></div></div>`)
  const ctrl = new AbortController(); S.ctrl = ctrl
  const avoid = Object.keys(S.cool).filter(resting)
  let text = '', provider = '', model = '', note = ''
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', signal: ctrl.signal, headers: H(),
      body: JSON.stringify({ messages: history(chat.messages), mode: S.mode, avoid, voice: !!opts.voice, persona: opts.persona }),
    })
    if (res.status === 401) { showGate(); throw new Error("Parol noto'g'ri — qayta kiriting") }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      markCool(d.skipped || [])
      throw new Error(d.detail || `Xato ${res.status}`)
    }
    const pid = res.headers.get('x-qai-provider')
    provider = res.headers.get('x-qai-name') || pid
    model = decodeURIComponent(res.headers.get('x-qai-model') || '')
    const fmt = res.headers.get('x-qai-format')
    const skipped = JSON.parse(decodeURIComponent(res.headers.get('x-qai-skipped') || '%5B%5D'))
    markCool(skipped)
    if (pid) delete S.cool[pid]
    if (skipped.length) {
      note = skipped.map((s) => `${s.name} ${s.short}`).join(', ')
      $('liveSwitch').innerHTML = `<div class="switch">${ICON.swap}<span>${esc(note)} → <b>${esc(provider)}</b></span></div>`
    }
    const el = $('liveText')
    const reader = res.body.getReader(); const dec = new TextDecoder()
    let buf = '', raf = 0
    const paint = () => { raf = 0; const stick = atBottom(); el.innerHTML = md(text); if (stick) toBottom(); opts.onText?.(text) }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let n
      while ((n = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, n).trim(); buf = buf.slice(n + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const j = JSON.parse(data)
          if (j.error) throw new Error(j.error.message || 'Oqimda xato')
          const t = fmt === 'anthropic' ? (j.type === 'content_block_delta' ? j.delta?.text : '') : j.choices?.[0]?.delta?.content
          if (t) { text += t; if (!raf) raf = requestAnimationFrame(paint) }
        } catch (e) { if (e.message && !(e instanceof SyntaxError)) throw e }
      }
    }
    if (!text.trim()) {
      S.cool[pid] = Date.now() + 60_000; store.set('cool', S.cool)
      if (attempt < 2) return ask(chat, opts, attempt + 1)
      throw new Error("Model bo'sh javob qaytardi")
    }
    const msg = { role: 'assistant', content: text, provider, model, note }
    finish(chat, msg); return msg
  } catch (err) {
    if (err.name === 'AbortError') {
      if (text.trim()) finish(chat, { role: 'assistant', content: text + '\n\n*(to\'xtatildi)*', provider, model, note })
      else { setBusy(false); renderFeed() }
      return null
    }
    if (text.trim()) { const msg = { role: 'assistant', content: text, provider, model, note }; finish(chat, msg); return msg }
    setBusy(false)
    if (S.activeId === chat.id) renderFeed(`<div class="err"><span>✕ ${esc(err.message)}</span><button data-retry>Qayta urinish</button></div>`)
    return null
  } finally {
    if (S.ctrl === ctrl) S.ctrl = null
    renderStatus(); renderPicker()
  }
}

function markCool(skipped) {
  const now = Date.now()
  for (const s of skipped) {
    if (s.kind === 'limit') S.cool[s.pid] = now + 10 * 60_000
    else if (s.kind === 'busy' && !S.cool[s.pid]) S.cool[s.pid] = now + 60_000
  }
  for (const k of Object.keys(S.cool)) if (S.cool[k] < now) delete S.cool[k]
  store.set('cool', S.cool)
}
function finish(chat, msg) {
  chat.messages.push(msg); chat.updated = Date.now(); save()
  setBusy(false)
  if (S.activeId === chat.id) renderFeed()
  renderList()
}

// ================= OVOZ =================

// --- Yozib olish: mikrofon → 16 kHz WAV ---
class Recorder {
  constructor({ onLevel, onSilence, vad = false } = {}) { Object.assign(this, { onLevel, onSilence, vad }) }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    const src = this.ctx.createMediaStreamSource(this.stream)
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 1024; src.connect(this.an)
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''
    this.mr = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined)
    this.chunks = []; this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data)
    this.mr.start(250)
    this.t0 = Date.now(); this.spoke = false; this.lastLoud = Date.now(); this.peak = 0
    const buf = new Float32Array(this.an.fftSize)
    const tick = () => {
      if (!this.mr || this.mr.state !== 'recording') return
      this.an.getFloatTimeDomainData(buf)
      let s = 0; for (const v of buf) s += v * v
      const rms = Math.sqrt(s / buf.length)
      this.onLevel?.(Math.min(1, rms * 9), buf)
      const noise = 0.012
      if (rms > noise * 2.2) { this.lastLoud = Date.now(); if (Date.now() - this.t0 > 250) this.spoke = true }
      if (this.vad) {
        const quiet = Date.now() - this.lastLoud
        if ((this.spoke && quiet > 1300) || Date.now() - this.t0 > 45000 || (!this.spoke && Date.now() - this.t0 > 15000)) { this.onSilence?.(this.spoke); return }
      }
      this.raf = requestAnimationFrame(tick)
    }
    tick()
  }
  async stop() {
    cancelAnimationFrame(this.raf)
    if (!this.mr) return null
    const done = new Promise((r) => (this.mr.onstop = r))
    if (this.mr.state !== 'inactive') this.mr.stop()
    await done
    this.stream.getTracks().forEach((t) => t.stop())
    const blob = new Blob(this.chunks, { type: this.mr.mimeType || 'audio/webm' })
    const ctx = this.ctx; this.mr = null
    try { return await toWav16k(blob, ctx) } finally { ctx.close().catch(() => {}) }
  }
  cancel() {
    cancelAnimationFrame(this.raf)
    try { this.mr?.state !== 'inactive' && this.mr?.stop() } catch { /* */ }
    this.stream?.getTracks().forEach((t) => t.stop()); this.ctx?.close().catch(() => {}); this.mr = null
  }
}

async function toWav16k(blob, ctx) {
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
  const rate = 16000
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * rate)), rate)
  const s = off.createBufferSource(); s.buffer = audio; s.connect(off.destination); s.start()
  const pcm = (await off.startRendering()).getChannelData(0)
  const buf = new ArrayBuffer(44 + pcm.length * 2); const v = new DataView(buf)
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true)
  return { blob: new Blob([buf], { type: 'audio/wav' }), seconds: audio.duration }
}

async function transcribe(wav, signal) {
  const fd = new FormData(); fd.append('audio', wav, 'voice.wav'); fd.append('lang', 'uz')
  const r = await fetch('/api/stt', { method: 'POST', headers: H(false), body: fd, signal })
  if (r.status === 401) { showGate(); throw new Error("Parol noto'g'ri") }
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.detail || 'Ovozni tanib bo\'lmadi')
  return (d.text || '').trim()
}

// --- Gapirish: Aisha (o'zbekcha) → brauzer ovozi (zaxira) ---
const speaker = { audio: null, token: 0, onEnd: null }
const langOf = (t) => ((t.match(/[Ѐ-ӿ]/g) || []).length > t.length * 0.25 ? 'ru' : 'uz')
function chunksOf(text, max = 600) {
  const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text]
  const out = []; let cur = ''
  for (const p of parts) { if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = '' } cur += p }
  if (cur.trim()) out.push(cur.trim())
  return out.flatMap((c) => c.length > 950 ? c.match(/.{1,900}(\s|$)/g) : [c])
}
function stopSpeaking() {
  speaker.token++
  try { speaker.audio?.pause() } catch { /* */ }
  speaker.audio = null
  try { speechSynthesis.cancel() } catch { /* */ }
  document.querySelectorAll('[data-speak].on').forEach((b) => { b.classList.remove('on'); b.innerHTML = ICON.speak })
}
async function ttsUrl(text, gender, style) {
  if (!S.features.tts || (S.features.tts === 'browser' && style !== 'anime')) return null
  try {
    const r = await fetch('/api/tts', { method: 'POST', headers: H(), body: JSON.stringify({ text, lang: langOf(text), gender, style }) })
    const d = await r.json().catch(() => ({}))
    return r.ok && d.url ? d.url : null
  } catch { return null }
}
function browserSpeak(text, token, gender, style) {
  return new Promise((res) => {
    if (!('speechSynthesis' in window)) return res()
    const u = new SpeechSynthesisUtterance(text)
    const lang = langOf(text) === 'ru' ? 'ru' : 'uz'
    const voices = speechSynthesis.getVoices()
    // Microsoft Edge brauzerida tekin "Natural" ovozlar bor (Madina, Sardor) — ular eng tiniq, shuning uchun birinchi
    const pick = (code) => {
      const vs = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(code))
      const male = /sardor|male|dmitry|guy|ahmet|erkek|pavel|david/i, female = /madina|female|svetlana|aria|zira|emel|irina/i
      const want = gender === 'male' ? male : gender === 'female' ? female : null
      return (want && vs.find((v) => want.test(v.name) && /natural|neural|online/i.test(v.name)))
        || (want && vs.find((v) => want.test(v.name)))
        || vs.find((v) => /natural|neural|online/i.test(v.name)) || vs[0]
    }
    u.voice = pick(lang) || (lang === 'uz' ? pick('tr') : null) || null
    u.lang = u.voice?.lang || (lang === 'uz' ? 'uz-UZ' : 'ru-RU')
    u.rate = 1.02
    if (gender === 'male' && !u.voice?.name.match(/sardor|male|dmitry|guy/i)) u.pitch = 0.85
    if (style === 'anime') { u.pitch = 1.25; u.rate = 1.06 }   // Shinobu: ingichka, yosh qiz ovozi
    u.onend = u.onerror = () => res()
    if (token !== speaker.token) return res()
    speechSynthesis.speak(u)
  })
}
async function speak(text, { onStart, gender, style } = {}) {
  stopSpeaking()
  const token = speaker.token
  // Shinobu: butun gap bitta so'rovda (ovoz o'zgarmasin), boshqa ovozga o'tmaydi
  const parts = style === 'anime' ? [plain(text).slice(0, 1000)].filter(Boolean) : chunksOf(plain(text))
  if (!parts.length) return
  let next = ttsUrl(parts[0], gender, style)
  for (let i = 0; i < parts.length; i++) {
    if (token !== speaker.token) return
    const url = await next
    if (i + 1 < parts.length) next = ttsUrl(parts[i + 1], gender, style)   // keyingisini oldindan tayyorlaymiz
    if (token !== speaker.token) return
    if (i === 0) onStart?.()
    if (url) {
      await new Promise((res) => {
        const a = new Audio(url); speaker.audio = a
        if (style === 'anime') { a.preservesPitch = false; a.playbackRate = 1.05 }   // biroz ingichkaroq
        a.onended = a.onerror = () => res()
        a.play().catch(() => res())
      })
    } else if (style === 'anime') {
      return false   // o'z ovozi ishlamadi — boshqa ovozda gapirmaydi
    } else {
      await browserSpeak(parts[i], token, gender, style)
    }
  }
}

// --- Chatdagi mikrofon: gapiring → matn → yuboriladi ---
let rec = null, recTimer = 0
async function startMic() {
  if (S.busy) return
  if (!S.features.stt) return toast("Ovoz uchun GROQ yoki AISHA kaliti kerak")
  stopSpeaking()
  rec = new Recorder({ onLevel: (_, buf) => drawWave(buf) })
  try { await rec.start() } catch { rec = null; return toast('Mikrofonga ruxsat berilmadi') }
  $('form').classList.add('recording'); $('rec').hidden = false; $('micBtn').classList.add('on')
  const t0 = Date.now()
  recTimer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('recTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s >= 120) finishMic() }, 250)
}
function endMicUI() { clearInterval(recTimer); $('form').classList.remove('recording'); $('rec').hidden = true; $('micBtn').classList.remove('on'); $('recTime').textContent = '0:00' }
async function finishMic() {
  if (!rec) return
  const r = rec; rec = null; endMicUI()
  $('micBtn').classList.add('wait')
  try {
    const out = await r.stop()
    if (!out || out.seconds < 0.4) return toast('Juda qisqa')
    const text = await transcribe(out.blob)
    if (!text) return toast("Hech narsa eshitilmadi")
    await send(text, { voice: true, withAttach: S.attach.length > 0 })
  } catch (e) { toast(e.message || 'Xato') } finally { $('micBtn').classList.remove('wait') }
}
function cancelMic() { rec?.cancel(); rec = null; endMicUI() }
function drawWave(buf) {
  const c = $('recWave'); const g = c.getContext('2d'); const w = c.width, h = c.height
  g.clearRect(0, 0, w, h); g.fillStyle = '#f4b544'
  const bars = 40, step = Math.floor(buf.length / bars)
  for (let i = 0; i < bars; i++) {
    let m = 0; for (let k = 0; k < step; k++) m = Math.max(m, Math.abs(buf[i * step + k]))
    const bh = Math.max(2, Math.min(h, m * h * 3)); g.fillRect(i * (w / bars), (h - bh) / 2, w / bars - 2, bh)
  }
}
$('micBtn').addEventListener('click', () => (rec ? finishMic() : startMic()))
$('recCancel').addEventListener('click', cancelMic)

// --- Ovozli suhbat oynasi (ekran ustida) ---
const V = { on: false, muted: false, rec: null, phase: 'idle', ctrl: null }
function vState(phase, label) {
  V.phase = phase
  $('voice').dataset.phase = phase
  $('voiceState').textContent = label
}
function orbLevel(l) { $('orb').style.setProperty('--lvl', (1 + l * 0.6).toFixed(3)) }

async function openVoice() {
  if (!S.features.stt) return toast("Ovozli suhbat uchun GROQ yoki AISHA kaliti kerak")
  stopSpeaking(); cancelMic()
  V.on = true; V.muted = false
  $('voice').hidden = false; $('voiceSaid').textContent = ''; $('voiceReply').textContent = ''
  $('voiceMute').innerHTML = ICON.mic; $('voiceMute').classList.remove('off')
  voiceListen()
}
function closeVoice() {
  V.on = false
  V.rec?.cancel(); V.rec = null
  V.ctrl?.abort(); stop(); stopSpeaking()
  $('voice').hidden = true
}
async function voiceListen() {
  if (!V.on) return
  if (V.muted) return vState('muted', "Mikrofon o'chiq — yoqish uchun pastdagi tugmani bosing")
  vState('listen', 'Tinglayapman… gapiring')
  const r = new Recorder({ vad: true, onLevel: orbLevel, onSilence: (spoke) => voiceHeard(r, spoke) })
  V.rec = r
  try { await r.start() } catch { vState('error', 'Mikrofonga ruxsat berilmadi'); return }
}
async function voiceHeard(r, spoke) {
  if (V.rec !== r) return
  V.rec = null
  orbLevel(0)
  if (!spoke) { r.cancel(); return voiceListen() }
  vState('think', 'Eshitdim, o\'ylayapman…')
  try {
    const out = await r.stop()
    const text = await transcribe(out.blob)
    if (!V.on) return
    if (!text) return voiceListen()
    $('voiceSaid').textContent = '“' + text + '”'
    $('voiceReply').textContent = ''
    const chat = ensureChat(text)
    chat.messages.push({ role: 'user', content: text, voice: true })
    chat.updated = Date.now(); save(); renderList()
    let intent = await smartIntent(text, [], { messages: chat.messages.slice(0, -1) })
    if (intent === 'draw' || intent === 'edit-last') {
      const res = await draw(chat, text, intent === 'edit-last' ? [lastGenerated(chat)] : [])
      if (!V.on) return
      const say = res ? 'Tayyor! Rasmni chatda ko\'rishingiz mumkin.' : 'Kechirasiz, rasmni chiza olmadim.'
      $('voiceReply').textContent = say
      vState('speak', 'Gapiryapman…'); await speak(say)
      return voiceListen()
    }
    const msg = await ask(chat, { voice: true, onText: (t) => ($('voiceReply').textContent = plain(t).slice(-300)) })
    if (!V.on) return
    if (!msg) { vState('error', 'Javob olinmadi — qayta gapiring'); await sleep(1200); return voiceListen() }
    $('voiceReply').textContent = plain(msg.content).slice(0, 400)
    vState('speak', 'Gapiryapman… (to\'xtatish uchun doirani bosing)')
    await speak(msg.content)
    if (V.on && V.phase === 'speak') voiceListen()
  } catch (e) {
    if (!V.on) return
    vState('error', e.message || 'Xato'); await sleep(1500); voiceListen()
  }
}
$('orb').addEventListener('click', () => {
  if (V.phase === 'speak') { stopSpeaking(); voiceListen() }               // gapni bo'lish
  else if (V.phase === 'listen' && V.rec) { const r = V.rec; r.spoke = true; voiceHeard(r, true) }  // tezroq yuborish
  else if (V.phase === 'muted' || V.phase === 'error') { V.muted = false; $('voiceMute').classList.remove('off'); voiceListen() }
})
$('voiceMute').addEventListener('click', () => {
  V.muted = !V.muted
  $('voiceMute').classList.toggle('off', V.muted); $('voiceMute').innerHTML = V.muted ? ICON.micOff : ICON.mic
  if (V.muted) { V.rec?.cancel(); V.rec = null; vState('muted', "Mikrofon o'chiq"); orbLevel(0) }
  else if (V.phase === 'muted') voiceListen()
})
$('voiceEnd').addEventListener('click', closeVoice)
$('voiceClose').addEventListener('click', closeVoice)
$('voiceBtn').addEventListener('click', openVoice)

// ================= ULAGICHLAR =================
const CONN = () => {
  const base = location.origin + '/v1'
  return {
    Unity: `// QurbonovAI.cs — Unity loyihangizdagi istalgan GameObject'ga qo'shing
using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class QurbonovAI : MonoBehaviour
{
    public string baseUrl = "${base}";
    public string apiKey = "SIZNING_API_KEY";   // Netlify'dagi API_KEY
    [TextArea] public string system = "Sen o'yindagi do'stona NPCsan. Qisqa javob ber.";

    [Serializable] class Msg { public string role; public string content; }
    [Serializable] class Req { public string model = "qurbonov-ai"; public Msg[] messages; }
    [Serializable] class Choice { public Msg message; }
    [Serializable] class Resp { public Choice[] choices; }

    void Start()
    {
        StartCoroutine(Ask("Salom! Sen kimsan?", answer => Debug.Log("AI: " + answer)));
    }

    public IEnumerator Ask(string text, Action<string> onAnswer)
    {
        var body = JsonUtility.ToJson(new Req {
            messages = new[] {
                new Msg { role = "system", content = system },
                new Msg { role = "user", content = text }
            }
        });
        using var req = new UnityWebRequest(baseUrl + "/chat/completions", "POST");
        req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.SetRequestHeader("Authorization", "Bearer " + apiKey);
        yield return req.SendWebRequest();

        if (req.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("Qurbonov AI xato: " + req.error + " " + req.downloadHandler.text);
            onAnswer?.Invoke(null);
            yield break;
        }
        var resp = JsonUtility.FromJson<Resp>(req.downloadHandler.text);
        onAnswer?.Invoke(resp.choices[0].message.content);
    }
}`,
    Python: `# pip install openai
from openai import OpenAI

client = OpenAI(base_url="${base}", api_key="SIZNING_API_KEY")

javob = client.chat.completions.create(
    model="qurbonov-ai",          # yoki "qurbonov-ai/groq", "qurbonov-ai/gemini"
    messages=[{"role": "user", "content": "Salom! O'zingni tanishtir"}],
)
print(javob.choices[0].message.content)`,
    JavaScript: `// Brauzer, Node.js, Telegram bot — hammasida ishlaydi
const res = await fetch("${base}/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer SIZNING_API_KEY" },
  body: JSON.stringify({
    model: "qurbonov-ai",
    messages: [{ role: "user", content: "Salom!" }],
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content);`,
    cURL: `curl ${base}/chat/completions \\
  -H "Authorization: Bearer SIZNING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"qurbonov-ai","messages":[{"role":"user","content":"Salom!"}]}'`,
    'Boshqa ilovalar': `"OpenAI-compatible" ulanishni qo'llaydigan har qanday ilova ishlaydi:
  • n8n, Make, Zapier (OpenAI node → Base URL'ni o'zgartiring)
  • Cursor, Continue, VS Code kengaytmalari
  • Telegram/Discord botlar (openai kutubxonasi orqali)
  • Godot, Unreal (HTTP so'rov orqali — Unity misoliga o'xshash)

Sozlamalar:
  Base URL : ${base}
  API key  : Netlify'dagi API_KEY
  Model    : qurbonov-ai          (avto-almashish bilan)
             qurbonov-ai/groq     (faqat Groq'dan boshlash)
             qurbonov-ai/gemini   (faqat Gemini'dan boshlash)

Rasm yuborish ham mumkin: content ichida {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,..."}}`,
  }
}
let connTab = 'Unity'
function renderConn() {
  const all = CONN()
  $('connUrl').textContent = location.origin + '/v1'
  $('connWarn').hidden = !!S.features.api
  $('connTabs').innerHTML = Object.keys(all).map((k) => `<button class="tab ${k === connTab ? 'on' : ''}" data-tab="${k}">${k}</button>`).join('')
  $('connCode').textContent = all[connTab]
}
$('connBtn').addEventListener('click', () => { renderConn(); $('conn').hidden = false; closeSide() })
$('connClose').addEventListener('click', () => ($('conn').hidden = true))
$('conn').addEventListener('click', async (e) => {
  if (e.target === $('conn')) $('conn').hidden = true
  const t = e.target.closest('[data-tab]'); if (t) { connTab = t.dataset.tab; renderConn() }
  const c = e.target.closest('[data-copy-text]')
  if (c) { await navigator.clipboard.writeText(document.querySelector(c.dataset.copyText).textContent); toast('Nusxalandi') }
})
$('connCopy').addEventListener('click', async () => { await navigator.clipboard.writeText($('connCode').textContent); toast('Kod nusxalandi') })

// ================= Hodisalar =================
$('form').addEventListener('submit', (e) => { e.preventDefault(); send() })
$('input').addEventListener('input', autosize)
$('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() }
})
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); newChat() }
  if (e.key === 'Escape') {
    $('menu').hidden = true
    if (!$('conn').hidden) { $('conn').hidden = true; return }
    if (V.on) { closeVoice(); return }
    if (rec) { cancelMic(); return }
    if (S.busy) stop()
    stopSpeaking()
  }
})
$('chatList').addEventListener('click', (e) => {
  const d = e.target.closest('[data-del]'); if (d) { e.stopPropagation(); removeChat(d.dataset.del); return }
  const it = e.target.closest('.item'); if (it) openChat(it.dataset.id)
})
$('feed').addEventListener('click', async (e) => {
  const idea = e.target.closest('[data-q]')
  if (idea) { $('input').value = idea.dataset.q; autosize(); $('input').focus(); return }
  const cp = e.target.closest('[data-copy]')
  if (cp) {
    const m = active()?.messages[+cp.dataset.copy]; if (!m) return
    await navigator.clipboard.writeText(m.content); cp.innerHTML = ICON.ok
    setTimeout(() => (cp.innerHTML = ICON.copy), 1200); return
  }
  const sp = e.target.closest('[data-speak]')
  if (sp) {
    if (sp.classList.contains('on')) { stopSpeaking(); return }
    const m = active()?.messages[+sp.dataset.speak]; if (!m) return
    stopSpeaking(); sp.classList.add('on'); sp.innerHTML = ICON.stopSpeak
    await speak(m.content)
    sp.classList.remove('on'); sp.innerHTML = ICON.speak; return
  }
  const pre = e.target.closest('[data-cp]')
  if (pre) {
    await navigator.clipboard.writeText(pre.parentElement.querySelector('code')?.innerText || '')
    pre.textContent = 'Olindi ✓'; setTimeout(() => (pre.textContent = 'Nusxa'), 1200); return
  }
  const dl = e.target.closest('[data-dl]')
  if (dl) {
    const m = active()?.messages[+dl.dataset.dl]; if (!m?.image) return
    const a = document.createElement('a'); a.href = m.image
    a.download = 'qurbonov-ai-' + Date.now() + (m.image.startsWith('data:image/png') ? '.png' : '.jpg'); a.click(); return
  }
  const use = e.target.closest('[data-useimg]')
  if (use) {
    const m = active()?.messages[+use.dataset.useimg]; if (!m?.image) return
    S.attach = [await shrink(m.image, 1024)]; renderTray()
    $('input').placeholder = "Nima o'zgartiraylik? (masalan: fonini dengiz qil)"; $('input').focus(); return
  }
  const redo = e.target.closest('[data-redo]')
  if (redo && !S.busy) {
    const c = active(); const i = +redo.dataset.redo
    const old = c.messages[i]
    const prev = c.messages[i - 1]
    c.messages = c.messages.slice(0, i); save()
    if (old?.kind === 'image') draw(c, old.prompt, old.edited && prev?.images?.length ? prev.images : old.edited ? [lastGenerated(c)].filter(Boolean) : [])
    else ask(c)
    return
  }
  if (e.target.closest('[data-retry]') && !S.busy) {
    const c = active(); if (!c) return
    const last = c.messages[c.messages.length - 1]
    if (last?.role !== 'user') return ask(c)
    const intent = last.intent || detect(last.content, last.images || [], { messages: c.messages.slice(0, -1) })
    if (intent === 'draw') draw(c, last.content)
    else if (intent === 'edit') draw(c, last.content, last.images)
    else if (intent === 'edit-last') draw(c, last.content, [lastGenerated({ messages: c.messages.slice(0, -1) })])
    else ask(c)
  }
})

$('newBtn').addEventListener('click', newChat)
$('newBtn2').addEventListener('click', newChat)
const closeSide = () => { $('side').classList.remove('open'); $('scrim').classList.remove('open') }
$('openSide').addEventListener('click', () => { $('side').classList.add('open'); $('scrim').classList.add('open') })
$('closeSide').addEventListener('click', closeSide)
$('scrim').addEventListener('click', closeSide)

// ---------- Parol ----------
function showGate() { $('gate').hidden = false; setTimeout(() => $('gatePass').focus(), 50) }
$('gateForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  S.pass = $('gatePass').value; store.set('pass', S.pass)
  const r = await fetch('/api/providers', { headers: H(false) }).then((x) => x.json()).catch(() => ({}))
  if (r.needPass && !r.authorized) { $('gateErr').textContent = "Parol noto'g'ri"; return }
  $('gate').hidden = true; $('gateErr').textContent = ''
  S.providers = r.providers || []; S.features = r.features || {}
  renderStatus(); renderPicker(); renderFeed()
})

// ---------- Boshlash ----------
if ('speechSynthesis' in window) speechSynthesis.getVoices()
renderList(); renderFeed(); renderPicker()
loadProviders().then(() => { if (!active()) renderFeed() })
