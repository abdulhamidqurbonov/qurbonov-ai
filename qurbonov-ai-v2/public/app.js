// ============ Qurbonov AI — sayt mantig'i ============
// Suhbatlar brauzeringizda (localStorage) saqlanadi. Server faqat modellarga ulanadi.

const $ = (id) => document.getElementById(id)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const ICON = {
  del: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
}

// ---------- Saqlash (brauzerda) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('qai.' + k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem('qai.' + k, JSON.stringify(v)) } catch { /* to'lgan yoki yopiq */ } },
}

const S = {
  chats: store.get('chats', []),          // [{id, title, updated, messages:[{role, content, provider, model, note}]}]
  activeId: null,
  mode: store.get('mode', 'auto'),        // 'auto' yoki provayder id
  cool: store.get('cool', {}),            // {pid: vaqt} — limitga tushgan modellar shu vaqtgacha oxiriga suriladi
  providers: [],
  pass: store.get('pass', ''),
  busy: false,
  ctrl: null,
}
const MAX_HISTORY = 60000

const save = () => store.set('chats', S.chats.slice(0, 200))
const active = () => S.chats.find((c) => c.id === S.activeId)
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ---------- Markdown ----------
marked.setOptions({ gfm: true, breaks: true })
function md(text) {
  const html = DOMPurify.sanitize(marked.parse(text || ''))
  return html.replace(/<pre>/g, '<pre><button class="cp" data-cp>Nusxa</button>')
}

// ---------- Kichik yordamchilar ----------
let toastT
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show')
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800)
}
function autosize() { const t = $('input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px' }
const atBottom = () => { const f = $('feed'); return f.scrollHeight - f.scrollTop - f.clientHeight < 120 }
const toBottom = () => { const f = $('feed'); f.scrollTop = f.scrollHeight }

// ---------- Server ----------
async function loadProviders() {
  try {
    const r = await fetch('/api/providers', { headers: { 'x-qai-pass': S.pass } })
    const d = await r.json()
    S.providers = d.providers || []
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
  const list = S.providers
  $('status').innerHTML = list.filter((p) => p.configured).map((p) =>
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
    </button>`).join('') + (S.providers.length > configured().length
      ? `<div class="menu-foot">Yana ${S.providers.length - configured().length} ta model kalit qo'shilsa ochiladi</div>` : '')
}

function setMode(mode, silent) {
  S.mode = mode; store.set('mode', mode); renderPicker()
  if (!silent) toast(mode === 'auto' ? 'Avto rejim yoqildi' : `Model: ${S.providers.find((p) => p.id === mode)?.name}`)
}

$('pickerBtn').addEventListener('click', (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden })
$('menu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]'); if (!b || b.disabled) return
  setMode(b.dataset.mode); $('menu').hidden = true; $('input').focus()
})
document.addEventListener('click', (e) => { if (!e.target.closest('.picker')) $('menu').hidden = true })

// Buyruqlar: /avto, /groq, /gemini ...
function command(text) {
  const m = text.match(/^\/(\S+)\s*$/); if (!m) return false
  const name = m[1].toLowerCase()
  if (['avto', 'auto'].includes(name)) { setMode('auto'); return true }
  const p = S.providers.find((x) => x.id === name || x.name.toLowerCase() === name)
  if (!p) { toast(`Bunday model yo'q: ${name}`); return true }
  if (!p.configured) { toast(`${p.name} uchun kalit qo'yilmagan`); return true }
  setMode(p.id); return true
}

// ---------- Xabarlar ----------
const IDEAS = [
  ['Sotuv skripti', "Kursni sotish uchun qisqa qo'ng'iroq skripti yozib ber"],
  ['Kodni tushuntir', 'Python’da async/await qanday ishlaydi? Oddiy misol bilan'],
  ['Tarjima', "Quyidagi matnni rus tiliga chiroyli tarjima qil:"],
  ["G'oya", "Toshkentda kichik sarmoya bilan qanday biznes boshlasa bo'ladi?"],
]

function hello() {
  const none = S.providers.length && !configured().length
  return `<div class="hello">
    <div class="mark"><img src="/logo.svg" alt=""></div>
    <h2>Bugun nima qilamiz?</h2>
    <p>Bitta modelning limiti tugasa yoki band bo'lsa, avtomatik keyingisiga o'taman — siz to'xtamay davom etasiz.</p>
    ${none ? '<div class="warn-box">⚠ Hali API kalit ulanmagan. Netlify\'da (yoki .env faylda) kamida bitta kalit qo\'ying.</div>' : ''}
    <div class="ideas">${IDEAS.map(([t, q]) => `<button class="idea" data-q="${esc(q)}"><b>${t}</b><span>${esc(q)}</span></button>`).join('')}</div>
  </div>`
}

function msgHTML(m, i) {
  if (m.role === 'user') return `<div class="msg user"><div class="body">${esc(m.content)}</div></div>`
  const sw = m.note ? `<div class="switch">${ICON.swap}<span>${esc(m.note)} → <b>${esc(m.provider)}</b></span></div>` : ''
  return `<div class="msg ai"><div class="ava"><img src="/logo.svg" alt=""></div><div class="wrap">${sw}
    <div class="md">${md(m.content)}</div>
    <div class="meta"><span class="who">${esc(m.provider || '')}${m.model ? ' · ' + esc(m.model) : ''}</span>
      <button data-copy="${i}" title="Nusxa olish">${ICON.copy}</button>
      <button data-redo="${i}" title="Qayta javob">${ICON.redo}</button></div></div></div>`
}

function renderFeed(extra = '') {
  const c = active()
  const msgs = c ? c.messages : []
  $('feed').innerHTML = (msgs.length ? msgs.map(msgHTML).join('') : extra ? '' : hello()) + extra
  $('title').textContent = c ? c.title : 'Yangi suhbat'
  toBottom()
}

function openChat(id) {
  if (S.busy) stop()
  S.activeId = id; renderList(); renderFeed(); closeSide()
}
function newChat() {
  if (S.busy) stop()
  S.activeId = null; renderList(); renderFeed(); closeSide(); $('input').focus()
}
function removeChat(id) {
  if (!confirm("Bu suhbat o'chirilsinmi?")) return
  if (S.busy && S.activeId === id) stop()
  S.chats = S.chats.filter((c) => c.id !== id); save()
  if (S.activeId === id) S.activeId = null
  renderList(); renderFeed()
}

// ---------- Yuborish (stream) ----------
function history(msgs) {
  const out = []; let total = 0
  for (let i = msgs.length - 1; i >= 0; i--) {
    total += msgs[i].content.length
    if (total > MAX_HISTORY && out.length) break
    out.unshift({ role: msgs[i].role, content: msgs[i].content })
  }
  return out
}

function stop() { if (S.ctrl) S.ctrl.abort() }

function setBusy(b) {
  S.busy = b
  $('form').classList.toggle('busy', b)
  $('sendBtn').setAttribute('aria-label', b ? "To'xtatish" : 'Yuborish')
}

async function send(textArg) {
  if (S.busy) { stop(); return }
  const input = $('input')
  const text = (textArg ?? input.value).trim()
  if (!text) return
  if (command(text)) { input.value = ''; autosize(); return }
  if (textArg === undefined) { input.value = ''; autosize() }

  let chat = active()
  if (!chat) {
    chat = { id: uid(), title: text.replace(/[*#`]/g, '').replace(/\s+/g, ' ').slice(0, 42), updated: Date.now(), messages: [] }
    S.chats.unshift(chat); S.activeId = chat.id
  }
  chat.messages.push({ role: 'user', content: text })
  chat.updated = Date.now()
  S.chats = [chat, ...S.chats.filter((c) => c.id !== chat.id)]
  save(); renderList()
  await ask(chat)
}

async function ask(chat, attempt = 0) {
  setBusy(true)
  renderFeed(`<div class="msg ai" id="live"><div class="ava"><img src="/logo.svg" alt=""></div><div class="wrap">
    <div id="liveSwitch"></div><div class="md cursor" id="liveText"><div class="thinking"><div class="dots"><i></i><i></i><i></i></div>O'ylayapman…</div></div></div></div>`)

  const ctrl = new AbortController(); S.ctrl = ctrl
  const avoid = Object.keys(S.cool).filter(resting)
  let text = '', provider = '', model = '', note = ''

  try {
    const res = await fetch('/api/chat', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-qai-pass': S.pass },
      body: JSON.stringify({ messages: history(chat.messages), mode: S.mode, avoid }),
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

    // Oqimni o'qish
    const el = $('liveText')
    const reader = res.body.getReader(); const dec = new TextDecoder()
    let buf = '', raf = 0
    const paint = () => { raf = 0; const stick = atBottom(); el.innerHTML = md(text); if (stick) toBottom() }
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
          const t = fmt === 'anthropic'
            ? (j.type === 'content_block_delta' ? j.delta?.text : '')
            : j.choices?.[0]?.delta?.content
          if (t) { text += t; if (!raf) raf = requestAnimationFrame(paint) }
        } catch (e) { if (e.message && !(e instanceof SyntaxError)) throw e }
      }
    }
    if (!text.trim()) {
      S.cool[pid] = Date.now() + 60_000; store.set('cool', S.cool)
      if (attempt < 2) return ask(chat, attempt + 1)        // bo'sh javob — boshqa modelga
      throw new Error("Model bo'sh javob qaytardi")
    }
    finish(chat, { role: 'assistant', content: text, provider, model, note })
  } catch (err) {
    if (err.name === 'AbortError') {
      if (text.trim()) finish(chat, { role: 'assistant', content: text + '\n\n*(to\'xtatildi)*', provider, model, note })
      else { setBusy(false); renderFeed() }
      return
    }
    if (text.trim()) { finish(chat, { role: 'assistant', content: text, provider, model, note }); return }
    setBusy(false)
    if (S.activeId === chat.id) {
      renderFeed(`<div class="err"><span>✕ ${esc(err.message)}</span><button data-retry>Qayta urinish</button></div>`)
    }
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

// ---------- Hodisalar ----------
$('form').addEventListener('submit', (e) => { e.preventDefault(); send() })
$('input').addEventListener('input', autosize)
$('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() }
})
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); newChat() }
  if (e.key === 'Escape') { $('menu').hidden = true; if (S.busy) stop() }
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
  const pre = e.target.closest('[data-cp]')
  if (pre) {
    await navigator.clipboard.writeText(pre.parentElement.querySelector('code')?.innerText || '')
    pre.textContent = 'Olindi ✓'; setTimeout(() => (pre.textContent = 'Nusxa'), 1200); return
  }
  const redo = e.target.closest('[data-redo]')
  if (redo && !S.busy) {
    const c = active(); const i = +redo.dataset.redo
    c.messages = c.messages.slice(0, i); save(); ask(c); return
  }
  if (e.target.closest('[data-retry]') && !S.busy) { const c = active(); if (c) ask(c) }
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
  const r = await fetch('/api/providers', { headers: { 'x-qai-pass': S.pass } }).then((x) => x.json()).catch(() => ({}))
  if (r.needPass && !r.authorized) { $('gateErr').textContent = "Parol noto'g'ri"; return }
  $('gate').hidden = true; $('gateErr').textContent = ''
  S.providers = r.providers || []; renderStatus(); renderPicker(); renderFeed()
})

// ---------- Boshlash ----------
renderList(); renderFeed(); renderPicker()
loadProviders().then(() => { if (!active()) renderFeed() })
