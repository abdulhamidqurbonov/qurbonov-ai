// Qurbonov AI — Netlify server qismi (Edge Function).
//
//  Sayt uchun:
//    GET  /api/providers  — ulangan modellar va imkoniyatlar
//    POST /api/chat       — javob so'zma-so'z (stream). Rasm biriktirilsa — rasmni ko'ra oladigan modelga yuboriladi
//    POST /api/image      — rasm chizish; rasm biriktirilsa — o'sha rasmni tahrirlash
//    POST /api/stt        — ovozni matnga (Aisha → Groq Whisper → Cloudflare Whisper)
//    POST /api/tts        — matnni ovozga (Aisha, o'zbekcha)
//
//  Boshqa ilovalar uchun (Unity, Python, Telegram bot ...) — OpenAI bilan bir xil format:
//    GET  /v1/models
//    POST /v1/chat/completions      (Authorization: Bearer <API_KEY>)
//
// Kalitlar Netlify → Environment variables da saqlanadi — saytda ko'rinmaydi.

const env = (k) => ((globalThis.Netlify?.env?.get(k) ?? Deno.env.get(k)) || "").trim();
const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

const PROVIDERS = {
  groq:       { name: "Groq",       kind: "openai",    base: "https://api.groq.com/openai/v1",                          modelEnv: "GROQ_MODEL",       def: "openai/gpt-oss-120b",                       keyEnv: "GROQ_API_KEY",       vision: () => [env("GROQ_VISION_MODEL") || "meta-llama/llama-4-scout-17b-16e-instruct"] },
  gemini:     { name: "Gemini",     kind: "openai",    base: "https://generativelanguage.googleapis.com/v1beta/openai", modelEnv: "GEMINI_MODEL",     def: "gemini-flash-lite-latest,gemini-3.8-flash", keyEnv: "GEMINI_API_KEY",     vision: (p) => modelsOf(p) },
  openrouter: { name: "OpenRouter", kind: "openai",    base: "https://openrouter.ai/api/v1",                            modelEnv: "OPENROUTER_MODEL", def: "openrouter/free",                           keyEnv: "OPENROUTER_API_KEY" },
  qwen:       { name: "Qwen",       kind: "openai",    base: "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1", modelEnv: "QWEN_MODEL", def: "qwen3.8-max",                     keyEnv: "QWEN_API_KEY" },
  cerebras:   { name: "Cerebras",   kind: "openai",    base: "https://api.cerebras.ai/v1",                              modelEnv: "CEREBRAS_MODEL",   def: "llama-3.3-70b",                             keyEnv: "CEREBRAS_API_KEY" },
  mistral:    { name: "Mistral",    kind: "openai",    base: "https://api.mistral.ai/v1",                               modelEnv: "MISTRAL_MODEL",    def: "mistral-small-latest",                      keyEnv: "MISTRAL_API_KEY" },
  claude:     { name: "Claude",     kind: "anthropic", base: "https://api.anthropic.com/v1",                            modelEnv: "CLAUDE_MODEL",     def: "claude-sonnet-5-5",                         keyEnv: "ANTHROPIC_API_KEY",  vision: (p) => modelsOf(p) },
  deepseek:   { name: "DeepSeek",   kind: "openai",    base: "https://api.deepseek.com/v1",                             modelEnv: "DEEPSEEK_MODEL",   def: "deepseek-chat",                             keyEnv: "DEEPSEEK_API_KEY" },
  openai:     { name: "ChatGPT",    kind: "openai",    base: "https://api.openai.com/v1",                               modelEnv: "OPENAI_MODEL",     def: "gpt-4o-mini",                               keyEnv: "OPENAI_API_KEY",     vision: (p) => modelsOf(p) },
};

const keysOf = (p) => list(env(p.keyEnv));
const baseOf = (p) => env(p.keyEnv.replace("_API_KEY", "_BASE_URL")) || p.base; // ixtiyoriy: o'z manzilingiz
const modelsOf = (p) => list(env(p.modelEnv) || p.def);

function order() {
  const ids = list(env("PROVIDER_ORDER") || "groq,gemini,openrouter,qwen,cerebras,mistral,claude,deepseek,openai");
  return ids.filter((id) => PROVIDERS[id]);
}

const SYSTEM = env("SYSTEM_PROMPT") ||
  "Sen Qurbonov AI — Alor Qurbonov yaratgan aqlli yordamchisan. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (odatda o'zbekcha). " +
  "Aniq, foydali va halol javob ber. Muhim: bu suhbatda avval boshqa model javob bergan bo'lishi mumkin. Avvalgi barcha 'assistant' " +
  "javoblarini o'zingniki deb qabul qil va suhbatni to'xtagan joyidan uzluksiz davom ettir — foydalanuvchidan hech narsani qayta so'rama. " +
  "Rasm chizish so'ralsa, sayt uni o'zi chizadi — sen rasm chiza olmayman dema.";
const VOICE_HINT =
  "\n\nHozir ovozli suhbat: javobing ovoz bilan o'qiladi. Qisqa va jonli gapir (1–4 gap), markdown, ro'yxat, jadval, emoji va kod ishlatma.";

// ---------- Xato turlari ----------
const SHORT = { limit: "limit tugadi", auth: "kalit xato", notfound: "mavjud emas", busy: "band", other: "xato" };
class PErr extends Error { constructor(kind, msg) { super(msg || SHORT[kind]); this.kind = kind; } }
function classify(code) {
  if (code === 429 || code === 402) return new PErr("limit", `limit tugadi (${code})`);
  if (code === 401 || code === 403) return new PErr("auth", `kalit xato (${code})`);
  if (code === 404) return new PErr("notfound", "model topilmadi (404)");
  if (code >= 500) return new PErr("busy", `server band (${code})`);
  return new PErr("other", `xato ${code}`);
}

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });

function authorized(req) {
  const pass = env("APP_PASSWORD");
  return !pass || req.headers.get("x-qai-pass") === pass;
}

async function withTimeout(ms, fn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); } finally { clearTimeout(t); }
}

// ---------- base64 yordamchilari ----------
function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function dataUrlToBlob(url) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url || "");
  if (!m) return null;
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] || "application/octet-stream" });
}

// ---------- Modelni avtomatik topish ----------
const discovered = new Map();
const EXCLUDE = ["whisper", "tts", "guard", "embed", "image", "audio", "realtime", "transcri", "moderation", "imagen", "veo", "live", "robotics", "computer-use", "orpheus", "playai", "safeguard", "aqa", "learnlm", "compound", "nano-banana"];
const PREFER = [["flash", 6], ["gpt-oss-120b", 5], ["70b", 4], ["versatile", 4], ["120b", 3], ["sonnet", 4], ["latest", 2], ["small", 1], ["instant", 1], ["lite", -1], ["8b", -1], ["preview", -2], ["exp", -3], ["thinking", -2]];
const score = (id) => PREFER.reduce((s, [kw, w]) => s + (id.toLowerCase().includes(kw) ? w : 0), 0);

async function discover(pid, p, key) {
  const ck = pid + key.slice(-6);
  if (discovered.has(ck)) return discovered.get(ck);
  let ids = [];
  try {
    if (pid === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${key}`);
      ids = ((await r.json()).models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));
    } else {
      const headers = p.kind === "anthropic" ? { "x-api-key": key, "anthropic-version": "2023-06-01" } : { Authorization: `Bearer ${key}` };
      const r = await fetch(`${baseOf(p)}/models`, { headers });
      ids = ((await r.json()).data || []).map((m) => m.id);
    }
  } catch { ids = []; }
  ids = ids.filter((i) => !EXCLUDE.some((x) => i.toLowerCase().includes(x))).sort((a, b) => score(b) - score(a));
  discovered.set(ck, ids);
  return ids;
}

// ================= CHAT =================

// Xabarlarni tozalash: {role, content, images?}. Ketma-ket bir xil rollar birlashtiriladi.
function clean(messages) {
  const out = [];
  for (const m of messages || []) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = String(m.content || "");
    const images = role === "user" && Array.isArray(m.images) ? m.images.filter((u) => /^data:image\//.test(u)).slice(0, 4) : [];
    if (!content.trim() && !images.length) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) { last.content += "\n\n" + content; last.images.push(...images); }
    else out.push({ role, content, images });
  }
  while (out.length && out[0].role !== "user") out.shift();
  // Faqat oxirgi rasmli xabardagi rasmlar yuboriladi (tez va arzon), oldingilari matn bilan almashtiriladi
  let seen = false;
  for (let i = out.length - 1; i >= 0; i--) {
    if (!out[i].images.length) continue;
    if (seen) { out[i].content = "[foydalanuvchi rasm yuborgan edi]\n" + out[i].content; out[i].images = []; }
    seen = true;
  }
  return out;
}
const hasImages = (msgs) => msgs.some((m) => m.images.length);

// Provayder formatiga o'tkazish
function toWire(kind, msgs, withImages) {
  return msgs.map((m) => {
    if (!withImages || !m.images.length) {
      const text = m.images.length ? "[foydalanuvchi rasm yubordi, lekin bu model rasmni ko'ra olmaydi]\n" + m.content : m.content;
      return { role: m.role, content: text || "…" };
    }
    if (kind === "anthropic") {
      return {
        role: m.role,
        content: [
          ...m.images.map((u) => {
            const [, mt, data] = /^data:([^;]+);base64,(.*)$/s.exec(u) || [];
            return { type: "image", source: { type: "base64", media_type: mt, data } };
          }),
          { type: "text", text: m.content || "Bu rasmda nima bor?" },
        ],
      };
    }
    return {
      role: m.role,
      content: [{ type: "text", text: m.content || "Bu rasmda nima bor?" }, ...m.images.map((u) => ({ type: "image_url", image_url: { url: u } }))],
    };
  });
}

async function openStream(p, key, model, wire, system, maxTokens) {
  const base = baseOf(p);
  maxTokens = maxTokens || Number(env("MAX_TOKENS")) || 4096;
  let url, headers, body;
  if (p.kind === "anthropic") {
    url = `${base}/messages`;
    headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    body = { model, max_tokens: maxTokens, system, messages: wire, stream: true };
  } else {
    url = `${base}/chat/completions`;
    headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Qurbonov AI" };
    body = { model, max_tokens: maxTokens, stream: true, messages: [{ role: "system", content: system }, ...wire] };
  }
  let resp;
  try {
    // javob 12 s ichida boshlanmasa — keyingi modelga
    resp = await withTimeout(Number(env("WAIT_MS")) || 12000, (signal) => fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal }));
  } catch {
    throw new PErr("busy", "javob kelmadi");
  }
  if (resp.ok && resp.body) return resp;
  try { await resp.body?.cancel(); } catch { /* */ }
  throw classify(resp.status);
}

// Asosiy navbat: ishlaydigan birinchi model oqimini qaytaradi
async function runChat(msgs, { mode = "auto", avoid = [], system = SYSTEM, maxTokens } = {}) {
  const vision = hasImages(msgs);
  let ids = order().filter((id) => keysOf(PROVIDERS[id]).length);
  const av = new Set(avoid);
  ids = [...ids.filter((id) => !av.has(id)), ...ids.filter((id) => av.has(id))];
  if (mode && mode !== "auto" && ids.includes(mode)) ids = [mode, ...ids.filter((id) => id !== mode)];

  // Rasm bo'lsa: avval rasmni ko'ra oladigan modellar, keyin (zaxira) qolganlari rasmsiz
  const plan = [];
  if (vision) {
    for (const pid of ids) if (PROVIDERS[pid].vision) plan.push({ pid, models: PROVIDERS[pid].vision(PROVIDERS[pid]), images: true });
    for (const pid of ids) plan.push({ pid, models: modelsOf(PROVIDERS[pid]), images: false });
  } else {
    for (const pid of ids) plan.push({ pid, models: modelsOf(PROVIDERS[pid]), images: false });
  }

  const skipped = [];
  for (const step of plan) {
    const p = PROVIDERS[step.pid];
    const keys = keysOf(p);
    const wire = toWire(p.kind, msgs, step.images);
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      const queue = [...step.models];
      let extended = step.images; // rasmli rejimda boshqa modellarni qidirmaymiz
      for (let i = 0; i < queue.length; i++) {
        const model = queue[i];
        try {
          const upstream = await openStream(p, key, model, wire, system, maxTokens);
          return { upstream, pid: step.pid, p, model, skipped, sawImage: step.images };
        } catch (e) {
          const kind = e.kind || "other";
          skipped.push({ pid: step.pid, name: model + (keys.length > 1 ? ` (kalit ${ki + 1})` : ""), kind, short: SHORT[kind], reason: e.message });
          if (kind === "auth") break;
          if (kind !== "other" && !extended && env("AUTO_MODEL") !== "0") {
            extended = true;
            const extra = (await discover(step.pid, p, key)).filter((m) => !queue.includes(m)).slice(0, kind === "notfound" ? 3 : 1);
            queue.push(...extra);
          }
        }
      }
    }
  }
  const err = new Error(ids.length
    ? "Hech bir model javob bera olmadi: " + skipped.map((s) => `${s.name} — ${s.reason}`).join("; ")
    : "Hali birorta API kalit qo'yilmagan. Netlify → Environment variables ga kalit qo'shing.");
  err.skipped = skipped;
  throw err;
}

// SSE oqimini o'qib, matn bo'laklarini beradi (OpenAI va Anthropic formatlari)
async function* sseText(body, kind) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let n;
    while ((n = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, n).trim();
      buf = buf.slice(n + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        const t = kind === "anthropic" ? (j.type === "content_block_delta" ? j.delta?.text : "") : j.choices?.[0]?.delta?.content;
        if (t) yield t;
      } catch { /* qisman qator */ }
    }
  }
}

// Ekrandagi kichkina yordamchi (Yulduz, Nilufar, Temur) nomidan gapirish
function personaHint(p) {
  if (!p || typeof p !== "object") return "";
  const name = String(p.name || "").slice(0, 40), trait = String(p.trait || "").slice(0, 300);
  if (!name) return "";
  return `\n\nHozir sen ekrandagi kichkina anime-yordamchi "${name}" qiyofasidasan. Xaraktering: ${trait}. ` +
    `O'zingni "${name}" deb tanishtir, shu xarakterda gapir, lekin baribir foydali va aniq javob ber.`;
}

async function handleChat(req) {
  let input;
  try { input = await req.json(); } catch { return json({ detail: "Noto'g'ri so'rov" }, 400); }
  const msgs = clean(input.messages);
  if (!msgs.length) return json({ detail: "Bo'sh xabar" }, 400);
  try {
    const r = await runChat(msgs, {
      mode: input.mode,
      avoid: Array.isArray(input.avoid) ? input.avoid : [],
      system: SYSTEM + (input.voice ? VOICE_HINT : "") + personaHint(input.persona),
      maxTokens: input.voice ? 600 : undefined,
    });
    return new Response(r.upstream.body, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "x-qai-provider": r.pid,
        "x-qai-name": r.p.name,
        "x-qai-model": encodeURIComponent(r.model),
        "x-qai-format": r.p.kind,
        "x-qai-vision": r.sawImage ? "1" : "0",
        "x-qai-skipped": encodeURIComponent(JSON.stringify(r.skipped)),
      },
    });
  } catch (e) {
    return json({ detail: e.message, skipped: e.skipped || [] }, 503);
  }
}

// ================= RASM =================
// Chizish: Cloudflare FLUX (kuniga ~170 ta tekin) → Pollinations (zaxira)
// Tahrirlash: Cloudflare FLUX.2 klein (biriktirilgan rasm asosida)

const cfReady = () => !!(env("CF_ACCOUNT_ID") && env("CF_API_TOKEN"));
const cfUrl = (model) => `${env("CF_BASE_URL") || "https://api.cloudflare.com/client/v4"}/accounts/${env("CF_ACCOUNT_ID")}/ai/run/${model}`;

async function quickLLM(system, text, maxTokens = 220) {
  for (const pid of order()) {
    const p = PROVIDERS[pid];
    const key = keysOf(p)[0];
    if (!key || p.kind !== "openai") continue;
    try {
      const r = await withTimeout(8000, (signal) => fetch(`${baseOf(p)}/chat/completions`, {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelsOf(p)[0], max_tokens: maxTokens, stream: false, messages: [{ role: "system", content: system }, { role: "user", content: text }] }),
      }));
      if (!r.ok) continue;
      const out = (await r.json()).choices?.[0]?.message?.content?.trim();
      if (out) return out.replace(/^["']|["']$/g, "").slice(0, 900);
    } catch { /* keyingisi */ }
  }
  return null;
}

const toEnglishPrompt = async (text, edit) => env("TRANSLATE_PROMPT") === "0" ? text : (await quickLLM(edit
  ? "You turn a user's photo-edit request (any language, often Uzbek) into ONE precise English instruction for a reference-based image model (FLUX.2). " +
    "The reference photo is 'image 0' (and 'image 1'... if more). Say exactly what to change AND explicitly say to keep everything else identical: " +
    "same person, face, identity, pose, composition, lighting, background, colors and style unless the user asked to change them. " +
    "If the user wants a style change (anime, cartoon, oil painting...), describe the target style richly but keep subject and composition. " +
    "Example: 'Edit image 0: change the shirt color to deep red. Keep the same person, face, pose, background, lighting and framing exactly as in image 0.' Output ONLY the instruction."
  : "Translate the user's image request (any language, often Uzbek) into ONE rich English prompt for a high-quality image generator: subject, details, setting, lighting, " +
    "camera/art style, mood, quality words (highly detailed, sharp focus). Keep any text the user wants written in the image in quotes exactly. Output ONLY the prompt, no quotes around it, no explanations.", text)) || text;

async function readCfImage(r) {
  if (!r.ok) {
    const e = classify(r.status)
    try { const d = await r.json(); const m = d.errors?.[0]?.message || d.error || ""; if (m) e.message = `${e.message} (${String(m).slice(0, 120)})` } catch { /* */ }
    throw e;
  }
  const ct = r.headers.get("content-type") || "";
  if (ct.startsWith("image/")) return `data:${ct};base64,${toBase64(await r.arrayBuffer())}`;
  const d = await r.json();
  const b64 = d.result?.image || d.image;
  if (!b64) throw new PErr("other", "rasm qaytmadi");
  return b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`;
}

// O'lcham: so'rov matnidan (telefon oboyi → tik, banner → keng) yoki tahrirda asl rasm nisbatidan
const fit16 = (v) => Math.max(256, Math.min(1920, Math.round(v / 16) * 16));
function sizeFor(text, aspect) {
  let a = +aspect || 0;
  if (!a) {
    if (/telefon|oboy|wallpaper|tik|vertikal|story|stories|portret|portrait|обои|вертик/i.test(text)) a = 9 / 16;
    else if (/banner|keng|gorizontal|youtube|preview|prevyu|muqova|cover|landscape|пейзаж|горизонт/i.test(text)) a = 16 / 9;
    else a = 1;
  }
  a = Math.max(0.5, Math.min(2, a));
  const area = 1024 * 1024;
  return { width: fit16(Math.sqrt(area * a)), height: fit16(Math.sqrt(area / a)) };
}

async function genCloudflare(prompt, size) {
  const r = await fetch(cfUrl(env("CF_IMAGE_MODEL") || "@cf/black-forest-labs/flux-1-schnell"), {
    method: "POST",
    headers: { Authorization: `Bearer ${env("CF_API_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, steps: 8, ...(size || {}) }),
  });
  return readCfImage(r);
}

// FLUX.2 Klein: ham chizadi, ham tahrirlaydi (4 tagacha namuna rasm, har biri < 512px)
async function flux2Cloudflare(model, prompt, images, size) {
  const form = new FormData();
  form.append("prompt", prompt);
  (images || []).slice(0, 4).forEach((u, i) => { const b = dataUrlToBlob(u); if (b) form.append(`input_image_${i}`, b, `image_${i}.jpg`); });
  form.append("width", String(size.width));
  form.append("height", String(size.height));
  if (images?.length) form.append("guidance", env("CF_EDIT_GUIDANCE") || "5");
  const r = await withTimeout(45000, (signal) => fetch(cfUrl(model), { method: "POST", signal, headers: { Authorization: `Bearer ${env("CF_API_TOKEN")}` }, body: form }));
  return readCfImage(r);
}

async function genPollinations(prompt, size = { width: 1024, height: 1024 }) {
  const key = env("POLLINATIONS_API_KEY");
  const q = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1e9);
  const url = key
    ? `https://gen.pollinations.ai/image/${q}?model=flux&width=${size.width}&height=${size.height}&seed=${seed}&nologo=true`
    : `https://image.pollinations.ai/prompt/${q}?model=flux&width=${size.width}&height=${size.height}&seed=${seed}&nologo=true`;
  try {
    const r = await withTimeout(35000, (signal) => fetch(url, { signal, headers: key ? { Authorization: `Bearer ${key}` } : {} }));
    if (!r.ok) throw classify(r.status);
    const ct = r.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) throw new PErr("other", "rasm qaytmadi");
    return `data:${ct};base64,${toBase64(await r.arrayBuffer())}`;
  } catch (e) {
    if (e instanceof PErr) throw e;
    throw new PErr("busy", "javob kelmadi");
  }
}

// Niyatni AI bilan aniqlash (so'z qoliplari ishonchsiz bo'lgan holatlar uchun)
async function handleIntent(req) {
  let input;
  try { input = await req.json(); } catch { return json({ intent: "chat" }); }
  const text = String(input.text || "").slice(0, 600);
  const hasImages = !!input.hasImages, hasLast = !!input.hasLastImage;
  const prev = String(input.prev || "").slice(0, 300);
  const sys = "Classify what the user wants from an AI assistant. Context: " +
    (hasImages ? "the user ATTACHED image(s) to this message. " : "") + (hasLast ? "The assistant's previous reply was a generated image. " : "") +
    (prev ? `Previous user message: "${prev}". ` : "") +
    "Answer with exactly ONE word:\n" +
    "draw — wants a NEW picture/image/logo created\n" +
    (hasImages ? "edit — wants the attached image changed/edited/restyled/combined (output = a new image)\nvision — asks a question about the attached image or wants it described/analyzed/read (output = text)\n" : "") +
    (hasLast ? "edit_last — wants the previously generated image changed (e.g. 'make it red', 'add a cat', 'now at night', 'qizil qil', 'fonini o'zgartir')\n" : "") +
    "chat — anything else (questions, conversation, code, explanations, even questions ABOUT drawing)\nThe message may be Uzbek, Russian or English.";
  const out = (await quickLLM(sys, text, 300) || "").toLowerCase();
  const m = out.match(/edit_last|edit|vision|draw|chat/);
  let intent = m ? m[0] : "";
  if (intent === "edit" && !hasImages) intent = hasLast ? "edit_last" : "chat";
  if (intent === "edit_last" && !hasLast) intent = "chat";
  if (intent === "vision" && !hasImages) intent = "chat";
  return json({ intent: intent || "" });
}

async function handleImage(req) {
  let input;
  try { input = await req.json(); } catch { return json({ detail: "Noto'g'ri so'rov" }, 400); }
  const text = String(input.prompt || "").trim().slice(0, 1500);
  const images = Array.isArray(input.images) ? input.images.filter((u) => /^data:image\//.test(u)) : [];
  if (!text) return json({ detail: "Rasm tavsifini yozing" }, 400);
  const edit = images.length > 0;
  const prompt = await toEnglishPrompt(text, edit);
  const size = sizeFor(text, edit ? input.aspect : 0);
  const skipped = [];
  const K9 = env("CF_EDIT_MODEL") || "@cf/black-forest-labs/flux-2-klein-9b", K4 = "@cf/black-forest-labs/flux-2-klein-4b";
  const steps = edit
    ? [
        { id: "cloudflare", name: "FLUX.2 Klein 9B", ok: cfReady(), run: () => flux2Cloudflare(K9, prompt, images, size) },
        { id: "cloudflare4", name: "FLUX.2 Klein 4B", ok: cfReady() && K9 !== K4, run: () => flux2Cloudflare(K4, prompt, images, size) },
      ]
    : [
        { id: "cloudflare", name: "FLUX.2 Klein 9B", ok: cfReady() && !env("CF_IMAGE_MODEL"), run: () => flux2Cloudflare(K9, prompt, [], size) },
        { id: "cloudflare1", name: "Cloudflare FLUX", ok: cfReady(), run: () => genCloudflare(prompt, size) },
        { id: "pollinations", name: "Pollinations", ok: env("POLLINATIONS") !== "0", run: () => genPollinations(prompt, size) },
      ];
  for (const s of steps) {
    if (!s.ok) continue;
    try {
      return json({ image: await s.run(), provider: s.name, prompt, edit, skipped });
    } catch (e) {
      skipped.push({ pid: s.id, name: s.name, kind: e.kind || "other", short: SHORT[e.kind] || "xato", reason: e.message });
    }
  }
  const why = skipped.map((s) => `${s.name} — ${s.reason}`).join("; ") ||
    (edit ? "rasm tahrirlash uchun Cloudflare (CF_ACCOUNT_ID, CF_API_TOKEN) kerak" : "rasm xizmati ulanmagan");
  return json({ detail: (edit ? "Rasmni tahrirlab bo'lmadi: " : "Rasm yaratib bo'lmadi: ") + why, skipped }, 503);
}

// ================= OVOZ =================
const aishaReady = () => !!env("AISHA_API_KEY");
const AISHA = () => env("AISHA_BASE_URL") || "https://back.aisha.group";

async function sttAisha(blob, lang) {
  const form = new FormData();
  form.append("audio", blob, "voice.wav");
  form.append("language", lang);
  form.append("has_diarization", "false");
  const r = await withTimeout(30000, (signal) => fetch(`${AISHA()}/api/v1/stt/post/`, { method: "POST", signal, headers: { "X-Api-Key": env("AISHA_API_KEY") }, body: form }));
  if (!r.ok) throw classify(r.status);
  const d = await r.json();
  return String(d.transcript ?? d.text ?? "").trim();
}

async function sttGroq(blob, lang) {
  const p = PROVIDERS.groq;
  const key = keysOf(p)[0];
  const form = new FormData();
  form.append("file", blob, "voice.wav");
  form.append("model", env("STT_MODEL") || "whisper-large-v3-turbo");
  form.append("response_format", "json");
  if (lang) form.append("language", lang);
  const r = await withTimeout(30000, (signal) => fetch(`${baseOf(p)}/audio/transcriptions`, { method: "POST", signal, headers: { Authorization: `Bearer ${key}` }, body: form }));
  if (!r.ok) throw classify(r.status);
  return String((await r.json()).text || "").trim();
}

async function sttCloudflare(blob, lang) {
  const audio = toBase64(await blob.arrayBuffer());
  const r = await withTimeout(30000, (signal) => fetch(cfUrl("@cf/openai/whisper-large-v3-turbo"), {
    method: "POST", signal,
    headers: { Authorization: `Bearer ${env("CF_API_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ audio, language: lang }),
  }));
  if (!r.ok) throw classify(r.status);
  const d = await r.json();
  return String(d.result?.text || "").trim();
}

async function handleSTT(req) {
  let form;
  try { form = await req.formData(); } catch { return json({ detail: "Noto'g'ri so'rov" }, 400); }
  const blob = form.get("audio");
  const lang = String(form.get("lang") || "uz");
  if (!(blob instanceof Blob) || !blob.size) return json({ detail: "Ovoz yozilmadi" }, 400);
  const steps = [
    { name: "Aisha", ok: aishaReady(), run: () => sttAisha(blob, lang) },
    { name: "Groq Whisper", ok: keysOf(PROVIDERS.groq).length > 0, run: () => sttGroq(blob, lang) },
    { name: "Cloudflare Whisper", ok: cfReady(), run: () => sttCloudflare(blob, lang) },
  ];
  const skipped = [];
  for (const s of steps) {
    if (!s.ok) continue;
    try { return json({ text: await s.run(), provider: s.name }); }
    catch (e) { skipped.push(`${s.name} — ${e.message || "xato"}`); }
  }
  return json({ detail: "Ovozni matnga aylantirib bo'lmadi: " + (skipped.join("; ") || "ovoz xizmati ulanmagan (GROQ yoki AISHA kaliti kerak)") }, 503);
}

// Azure AI Speech — Microsoft'ning tiniq "Neural" ovozlari (uz-UZ-MadinaNeural, uz-UZ-SardorNeural).
// Tekin tarif (F0): oyiga 500 000 belgi. AZURE_SPEECH_KEY + AZURE_SPEECH_REGION kerak.
const azureReady = () => !!(env("AZURE_SPEECH_KEY") && env("AZURE_SPEECH_REGION"));
const AZ_VOICES = {
  uz: (m) => m ? env("AZURE_VOICE_MALE") || "uz-UZ-SardorNeural" : env("AZURE_VOICE") || "uz-UZ-MadinaNeural",
  ru: (m) => m ? "ru-RU-DmitryNeural" : "ru-RU-SvetlanaNeural",
  en: (m) => m ? "en-US-GuyNeural" : "en-US-AriaNeural",
};
const xml = (t) => t.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

async function ttsAzure(text, lang, male, anime) {
  const voice = AZ_VOICES[lang](male);
  const locale = voice.split("-").slice(0, 2).join("-");
  const ssml = `<speak version='1.0' xml:lang='${locale}'><voice name='${voice}'><prosody ${anime ? `pitch='${env("AZURE_PET_PITCH") || "+8%"}' rate='${env("AZURE_PET_RATE") || "+6%"}'` : `rate='${env("AZURE_RATE") || "+4%"}'`}>${xml(text)}</prosody></voice></speak>`;
  const r = await withTimeout(25000, (signal) => fetch(env("AZURE_TTS_URL") || `https://${env("AZURE_SPEECH_REGION")}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST", signal,
    headers: {
      "Ocp-Apim-Subscription-Key": env("AZURE_SPEECH_KEY"),
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "qurbonov-ai",
    },
    body: ssml,
  }));
  if (!r.ok) throw classify(r.status);
  return `data:audio/mpeg;base64,${toBase64(await r.arrayBuffer())}`;
}

// ElevenLabs (Eleven v3 o'zbekchani qo'llaydi). Bepul tarif oyiga ~10 000 belgi — tugasa Azure'ga o'tadi.
const elevenReady = () => !!env("ELEVENLABS_API_KEY");
async function ttsEleven(text, male, anime) {
  const voice = anime ? env("ELEVENLABS_PET_VOICE") : male ? env("ELEVENLABS_VOICE_MALE") || "JBFqnCBsd6RMkjVDRZzb" : env("ELEVENLABS_VOICE") || "EXAVITQu4vr4xnSDxMaL";
  const r = await withTimeout(30000, (signal) => fetch(`${env("ELEVENLABS_BASE_URL") || "https://api.elevenlabs.io"}/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: "POST", signal,
    headers: { "xi-api-key": env("ELEVENLABS_API_KEY"), "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: env("ELEVENLABS_MODEL") || "eleven_v3" }),
  }));
  if (!r.ok) throw classify(r.status);
  return `data:audio/mpeg;base64,${toBase64(await r.arrayBuffer())}`;
}

// Gemini TTS (o'zbekchani biladi, ohangni so'z bilan boshqarsa bo'ladi, AI Studio'da "Voice design" bilan o'z ovozingizni yaratasiz)
const geminiTtsReady = () => env("GEMINI_TTS") !== "off" && !!list(env("GEMINI_API_KEY") || "")[0];
const PET_STYLE = "cute, sweet and playful young anime girl; bright, slightly high voice; lively and a little teasing; clear pronunciation";
async function ttsGemini(text, anime) {
  const keys = list(env("GEMINI_API_KEY"));
  const model = env("GEMINI_TTS_MODEL") || "gemini-3.8-flash-tts";
  const voice = (anime ? env("GEMINI_PET_VOICE") : env("GEMINI_TTS_VOICE")) || (anime ? "Leda" : "Kore");
  const style = anime ? env("GEMINI_PET_STYLE") || PET_STYLE : env("GEMINI_TTS_STYLE") || "";
  const part = { text, ...(style ? { speech_metadata: { style } } : {}) };
  let last = null;
  for (const key of keys) {
    for (const voiceConfig of [{ voice }, { prebuiltVoiceConfig: { voiceName: voice } }]) {
      const r = await withTimeout(30000, (signal) => fetch(`${env("GEMINI_TTS_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta"}/models/${model}:generateContent`, {
        method: "POST", signal,
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [part] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig } } }),
      }));
      if (r.ok) {
        const d = await r.json();
        const inl = d?.candidates?.[0]?.content?.parts?.find((x) => x.inlineData || x.inline_data);
        const data = inl?.inlineData || inl?.inline_data;
        if (!data?.data) throw new Error("bo'sh audio");
        let mime = data.mimeType || data.mime_type || "audio/wav";
        if (/l16|pcm/i.test(mime)) return pcmToWav(data.data, +(mime.match(/rate=(\d+)/)?.[1] || 24000));
        return `data:${mime.split(";")[0]};base64,${data.data}`;
      }
      last = r.status;
      if (r.status !== 400) break; // 400 bo'lsa — boshqa formatda qayta urinib ko'ramiz
    }
  }
  throw classify(last || 500);
}
// Xom PCM kelsa, WAV sarlavha qo'shamiz
function pcmToWav(b64, rate) {
  const pcm = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const h = new DataView(new ArrayBuffer(44));
  const w = (o, str) => [...str].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer)); out.set(pcm, 44);
  return `data:audio/wav;base64,${toBase64(out.buffer)}`;
}

async function handleTTS(req) {
  let input;
  try { input = await req.json(); } catch { return json({ detail: "Noto'g'ri so'rov" }, 400); }
  const text = String(input.text || "").trim().slice(0, 1000);
  const lang = ["uz", "ru", "en"].includes(input.lang) ? input.lang : "uz";
  if (!text) return json({ detail: "Bo'sh matn" }, 400);
  const anime = input.style === "anime"; // Shinobu: yosh anime qiz ovozi
  if (anime && geminiTtsReady()) {
    try { return json({ url: await ttsGemini(text, true), provider: "Gemini" }); }
    catch { /* limit yoki xato — keyingisiga */ }
  }
  if (elevenReady() && (!anime || env("ELEVENLABS_PET_VOICE"))) {
    try { return json({ url: await ttsEleven(text, input.gender === "male", anime), provider: "ElevenLabs" }); }
    catch { /* limit tugagan bo'lsa Azure'ga o'tamiz */ }
  }
  if (azureReady()) {
    try { return json({ url: await ttsAzure(text, lang, input.gender === "male", anime), provider: "Azure" }); }
    catch { /* Aisha yoki brauzerga o'tamiz */ }
  }
  if (!aishaReady()) return json({ detail: "Ovoz xizmati ulanmagan", fallback: true }, 501);
  const form = new FormData();
  form.append("transcript", text);
  form.append("language", lang);
  if (lang === "uz") {
    form.append("model", env("AISHA_VOICE") || "Gulnoza");
    form.append("mood", env("AISHA_MOOD") || "Neutral");
  }
  try {
    const r = await withTimeout(30000, (signal) => fetch(`${AISHA()}/api/v1/tts/post/`, { method: "POST", signal, headers: { "X-Api-Key": env("AISHA_API_KEY") }, body: form }));
    if (!r.ok) {
      const e = classify(r.status);
      return json({ detail: "Aisha: " + (e.kind === "limit" ? "balans tugagan" : e.message), fallback: true }, 502);
    }
    const d = await r.json();
    const path = d.audio_path || d.audio || d.url;
    if (!path) return json({ detail: "Aisha audio qaytarmadi", fallback: true }, 502);
    return json({ url: path.startsWith("http") ? path : AISHA() + path, provider: "Aisha" });
  } catch {
    return json({ detail: "Aisha javob bermadi", fallback: true }, 504);
  }
}

// ================= HAMROH (Shinobu) =================
// Gapni tushunib, nima deyish, qanday his qilish va nima qilishni JSON qilib qaytaradi.
const ACTIONS = ["none", "go_edge", "go_left", "go_right", "go_center", "come_closer", "sit", "stand", "sleep", "lie_down", "wake", "dance",
  "yawn", "wave", "turn_away", "sad_turn", "turn_back", "eat", "hug", "cry", "cheer", "laugh", "giggle", "jump", "coy", "shy_cover", "pout", "puff",
  "tantrum", "stomp", "scared", "surprised", "bow", "clap", "stretch", "blow_kiss", "sad", "bored", "think", "joke",
  "game_tir", "game_rps", "game_hearts", "game_memory", "game_ttt", "game_snake", "game_quiz", "game_reaction", "game_whack"];
const EMOTIONS = ["neutral", "happy", "love", "shy", "sad", "cry", "angry", "surprised", "sleepy", "relaxed", "laugh", "pout", "scared", "smug", "hurt", "bored", "excited"];

function companionSystem(c) {
  const s = c.state || {};
  const boy = c.gender === "male";
  return `Sen ${c.name} — foydalanuvchi ekranida yashaydigan kichkina 3D anime ${boy ? "yigitsan" : "qizsan"} (tirik hamroh). Sen ODAMDEK his qilasan va harakat qilasan.
Xarakteringiz: ${c.trait}
Hissiyotlaring: quvonasan, kulasan, sakraysan, uyalasan (yuzingni yopasan), nozlanasan, xafa bo'lasan (orqangni o'girib olasan), yig'laysan, jahling chiqadi (oyoq tepasan, lunjingni shishirasan), arazlaysan, qo'rqasan, hayron qolasan, zerikasan, och qolasan, uyqung keladi.
Foydalanuvchi — ${c.owner || "egang"}. U bilan o'zbek tilida, jonli, tabiiy, qisqa (1–3 gap) gaplash. Markdown va emoji ishlatma. Har safar boshqacha gapir, takrorlanma.

HOZIRGI HOLATING (0–100): ochlik=${s.hunger}, charchoq=${100 - (s.energy ?? 100)}, kayfiyat=${s.mood}, mehr=${s.affection}.
${s.sleeping ? "Hozir uxlab yotgan eding, uyg'otishdi." : ""}${s.sulking ? " Sen hozir ARAZLAB turibsan. Sovg'a yoki chin dildan kechirim so'ralmaguncha sovuq, qisqa javob ber (pout/hurt). Kechirim so'rasa — asta yumshab, turn_back qil." : ""}
${s.hunger > 70 ? "Qorning juda och — buni aytib qo'y." : ""}${(s.energy ?? 100) < 25 ? " Uyqung kelyapti — esnab, ko'rpa yoki yostiq so'ra." : ""}${s.messy ? " Yuzingga ovqat yuqib qolgan." : ""}
Vaqt: ${s.time || ""}. Oxirgi sovg'alar: ${s.gifts || "yo'q"}.

NIYATNI TUSHUN (so'zma-so'z emas, ma'nosiga qarab):
- Qo'pollik, haqorat, masxara, "yomonsan", "kerakmassan" → emotion: hurt yoki cry, action: sad_turn yoki cry, insult=true, mood_delta -10..-25.
- Maqtov, "chiroyli", "yaxshi ko'raman", "yoqimtoysan" → shy yoki love; action: shy_cover, coy yoki blow_kiss; mood_delta +5..+15.
- Hazil, kulgili gap → laugh, action: laugh yoki giggle. Ajoyib yangilik → excited, action: jump yoki clap.
- Qo'rqitsa → scared. Kutilmagan gap → surprised. Jahlini chiqarsa (lekin haqorat emas) → angry/pout, action: tantrum, puff yoki pout.
- "Chekkaga o'tib tur", "to'syapsan", "berkitib qo'ydingiz", "xalaqit beryapsan" → go_edge. "Chapga/o'ngga o't" → go_left/go_right. "O'rtaga kel" → go_center. "Yonimga kel" → come_closer.
- "Uxla", "yot", "men uxlayman sen ham uxla", "dam ol" → sleep. "Tur", "uyg'on" → wake. "O'tir" → sit. "Raqsga tush" → dance. "Ta'zim qil" → bow. "Qarsak chal" → clap. "Kerishib ol" → stretch. "Sakra" → jump.
- "Kechirasan", "uzr", "kechir" (arazlab turganda) → turn_back, mood_delta +15.
- "O'ynaymiz", "zerikdim" → o'yin taklif qil: game_tir, game_whack, game_memory, game_ttt, game_reaction, game_quiz, game_snake, game_rps yoki game_hearts. Kulgi so'rasa → joke (rostdan kulgili, qisqa hazil ayt).
- Oddiy savolga — xarakteringda qolib, aniq va foydali javob ber.

FAQAT shu JSON bilan javob ber (boshqa hech narsa yozma):
{"say":"aytadigan gaping","emotion":"${EMOTIONS.join("|")}","action":"${ACTIONS.join("|")}","mood_delta":0,"insult":false}`;
}

async function handleCompanion(req) {
  let input;
  try { input = await req.json(); } catch { return json({ detail: "Noto'g'ri so'rov" }, 400); }
  const c = input.companion || {};
  const history = (Array.isArray(input.history) ? input.history : []).slice(-10)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 600) }));
  const text = String(input.text || "").slice(0, 1000);
  if (!text) return json({ detail: "Bo'sh" }, 400);
  const msgs = clean([...history, { role: "user", content: text }]);
  let raw = "";
  try {
    const r = await runChat(msgs, { system: companionSystem({ name: String(c.name || "Shinobu").slice(0, 40), trait: String(c.trait || "").slice(0, 500), gender: c.gender === "male" ? "male" : "female", owner: String(c.owner || "").slice(0, 40), state: c.state || {} }), maxTokens: 400 });
    for await (const t of sseText(r.upstream.body, r.p.kind)) raw += t;
  } catch (e) {
    return json({ detail: e.message }, 503);
  }
  let out = null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { out = JSON.parse(m[0]); } catch { /* */ } }
  if (!out || typeof out.say !== "string") out = { say: raw.replace(/[{}"]/g, "").trim().slice(0, 400) || "Hmm…", emotion: "neutral", action: "none" };
  return json({
    say: String(out.say).replace(/[*_#`]/g, "").slice(0, 500),
    emotion: EMOTIONS.includes(out.emotion) ? out.emotion : "neutral",
    action: ACTIONS.includes(out.action) ? out.action : "none",
    mood_delta: Math.max(-30, Math.min(30, Number(out.mood_delta) || 0)),
    insult: !!out.insult,
  });
}

// ================= ULAGICHLAR: OpenAI-mos API =================
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function apiKeyOk(req) {
  const allowed = list(env("API_KEY") || env("APP_PASSWORD"));
  if (!allowed.length) return null; // kalit o'rnatilmagan
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return allowed.includes(got);
}

function normalizeOpenAI(messages) {
  const sys = [];
  const msgs = [];
  for (const m of messages || []) {
    let text = "";
    const images = [];
    if (typeof m.content === "string") text = m.content;
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === "text") text += (text ? "\n" : "") + part.text;
        else if (part.type === "image_url") {
          const u = typeof part.image_url === "string" ? part.image_url : part.image_url?.url;
          if (u?.startsWith("data:image/")) images.push(u);
        }
      }
    }
    if (m.role === "system" || m.role === "developer") sys.push(text);
    else msgs.push({ role: m.role, content: text, images });
  }
  return { system: sys.join("\n\n"), messages: msgs };
}

async function handleV1(req, path) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const ok = apiKeyOk(req);
  if (ok === null) return json({ error: { message: "Netlify'da API_KEY o'rnatilmagan", type: "auth" } }, 403, CORS);
  if (!ok) return json({ error: { message: "API kalit noto'g'ri", type: "auth" } }, 401, CORS);

  if (path === "/v1/models") {
    const data = [{ id: "qurbonov-ai", object: "model", owned_by: "qurbonov" }];
    for (const id of order()) if (keysOf(PROVIDERS[id]).length) data.push({ id: `qurbonov-ai/${id}`, object: "model", owned_by: "qurbonov" });
    return json({ object: "list", data }, 200, CORS);
  }
  if (path !== "/v1/chat/completions" || req.method !== "POST") return json({ error: { message: "Topilmadi" } }, 404, CORS);

  let input;
  try { input = await req.json(); } catch { return json({ error: { message: "Noto'g'ri JSON" } }, 400, CORS); }
  const { system, messages } = normalizeOpenAI(input.messages);
  const msgs = clean(messages);
  if (!msgs.length) return json({ error: { message: "messages bo'sh" } }, 400, CORS);
  const want = String(input.model || "qurbonov-ai").replace(/^qurbonov-ai\/?/, "") || "auto";

  let r;
  try {
    r = await runChat(msgs, { mode: want, system: system ? SYSTEM + "\n\n" + system : SYSTEM, maxTokens: input.max_tokens || input.max_completion_tokens });
  } catch (e) {
    return json({ error: { message: e.message, type: "unavailable" } }, 503, CORS);
  }
  const id = "chatcmpl-" + crypto.randomUUID();
  const created = Math.floor(Date.now() / 1000);
  const modelName = `qurbonov-ai/${r.pid}/${r.model}`;
  const extra = { ...CORS, "x-qai-provider": r.pid, "x-qai-model": encodeURIComponent(r.model) };

  if (input.stream) {
    const enc = new TextEncoder();
    const chunk = (delta, finish = null) =>
      enc.encode(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model: modelName, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
    const stream = new ReadableStream({
      async start(c) {
        c.enqueue(chunk({ role: "assistant", content: "" }));
        try { for await (const t of sseText(r.upstream.body, r.p.kind)) c.enqueue(chunk({ content: t })); } catch { /* uzildi */ }
        c.enqueue(chunk({}, "stop"));
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", ...extra } });
  }

  let text = "";
  for await (const t of sseText(r.upstream.body, r.p.kind)) text += t;
  return json({
    id, object: "chat.completion", created, model: modelName,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }, 200, extra);
}

// ================= Marshrutlar =================
export default async (req) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, "");

  if (path.startsWith("/v1/")) return handleV1(req, path);

  if (path === "/api/providers") {
    return json({
      needPass: !!env("APP_PASSWORD"),
      authorized: authorized(req),
      features: {
        image: cfReady() || env("POLLINATIONS") !== "0",
        edit: cfReady(),
        vision: order().some((id) => PROVIDERS[id].vision && keysOf(PROVIDERS[id]).length),
        stt: aishaReady() || keysOf(PROVIDERS.groq).length > 0 || cfReady(),
        tts: geminiTtsReady() ? "gemini" : elevenReady() ? "elevenlabs" : azureReady() ? "azure" : aishaReady() ? "aisha" : "browser",
        api: !!(env("API_KEY") || env("APP_PASSWORD")),
      },
      providers: order().map((id) => ({ id, name: PROVIDERS[id].name, model: modelsOf(PROVIDERS[id]).join(", "), configured: keysOf(PROVIDERS[id]).length > 0 })),
    });
  }

  if (req.method !== "POST") return json({ detail: "Topilmadi" }, 404);
  if (!authorized(req)) return json({ detail: "Parol noto'g'ri" }, 401);

  if (path === "/api/chat") return handleChat(req);
  if (path === "/api/image") return handleImage(req);
  if (path === "/api/intent") return handleIntent(req);
  if (path === "/api/stt") return handleSTT(req);
  if (path === "/api/tts") return handleTTS(req);
  if (path === "/api/companion") return handleCompanion(req);
  return json({ detail: "Topilmadi" }, 404);
};

export const config = { path: ["/api/*", "/v1/*"] };
