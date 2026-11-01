// Qurbonov AI — Netlify server qismi (Edge Function).
// /api/providers  — qaysi modellar ulangan
// /api/chat       — javobni so'zma-so'z (stream) qaytaradi; model ishlamasa avtomatik keyingisiga o'tadi
//
// API kalitlar Netlify sozlamalarida (Environment variables) saqlanadi — saytda ko'rinmaydi.

const env = (k) => ((globalThis.Netlify?.env?.get(k) ?? Deno.env.get(k)) || "").trim();
const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

const PROVIDERS = {
  groq:       { name: "Groq",       kind: "openai",    base: "https://api.groq.com/openai/v1",                          modelEnv: "GROQ_MODEL",       def: "openai/gpt-oss-120b",                    keyEnv: "GROQ_API_KEY" },
  gemini:     { name: "Gemini",     kind: "openai",    base: "https://generativelanguage.googleapis.com/v1beta/openai", modelEnv: "GEMINI_MODEL",     def: "gemini-3.8-flash,gemini-flash-lite-latest", keyEnv: "GEMINI_API_KEY" },
  cerebras:   { name: "Cerebras",   kind: "openai",    base: "https://api.cerebras.ai/v1",                              modelEnv: "CEREBRAS_MODEL",   def: "llama-3.3-70b",                          keyEnv: "CEREBRAS_API_KEY" },
  mistral:    { name: "Mistral",    kind: "openai",    base: "https://api.mistral.ai/v1",                               modelEnv: "MISTRAL_MODEL",    def: "mistral-small-latest",                   keyEnv: "MISTRAL_API_KEY" },
  openrouter: { name: "OpenRouter", kind: "openai",    base: "https://openrouter.ai/api/v1",                            modelEnv: "OPENROUTER_MODEL", def: "openrouter/auto",                        keyEnv: "OPENROUTER_API_KEY" },
  claude:     { name: "Claude",     kind: "anthropic", base: "https://api.anthropic.com/v1",                            modelEnv: "CLAUDE_MODEL",     def: "claude-sonnet-5-5",                      keyEnv: "ANTHROPIC_API_KEY" },
  deepseek:   { name: "DeepSeek",   kind: "openai",    base: "https://api.deepseek.com/v1",                             modelEnv: "DEEPSEEK_MODEL",   def: "deepseek-chat",                          keyEnv: "DEEPSEEK_API_KEY" },
  openai:     { name: "ChatGPT",    kind: "openai",    base: "https://api.openai.com/v1",                               modelEnv: "OPENAI_MODEL",     def: "gpt-4o-mini",                            keyEnv: "OPENAI_API_KEY" },
};

const keysOf = (p) => list(env(p.keyEnv));
const baseOf = (p) => env(p.keyEnv.replace("_API_KEY", "_BASE_URL")) || p.base; // ixtiyoriy: o'z manzilingiz
const modelsOf = (p) => list(env(p.modelEnv) || p.def);

function order() {
  const ids = list(env("PROVIDER_ORDER") || "groq,gemini,cerebras,mistral,openrouter,claude,deepseek,openai");
  return ids.filter((id) => PROVIDERS[id]);
}

const SYSTEM = env("SYSTEM_PROMPT") ||
  "Sen Qurbonov AI — Alor Qurbonov yaratgan aqlli yordamchisan. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (odatda o'zbekcha). " +
  "Aniq, foydali va halol javob ber. Muhim: bu suhbatda avval boshqa model javob bergan bo'lishi mumkin. Avvalgi barcha 'assistant' " +
  "javoblarini o'zingniki deb qabul qil va suhbatni to'xtagan joyidan uzluksiz davom ettir — foydalanuvchidan hech narsani qayta so'rama.";

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

// ---------- Bitta modelga so'rov (stream) ----------
async function openStream(p, key, model, messages) {
  const base = baseOf(p);
  const maxTokens = Number(env("MAX_TOKENS")) || 4096;
  let url, headers, body;
  if (p.kind === "anthropic") {
    url = `${base}/messages`;
    headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    body = { model, max_tokens: maxTokens, system: SYSTEM, messages, stream: true };
  } else {
    url = `${base}/chat/completions`;
    headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Qurbonov AI" };
    body = { model, max_tokens: maxTokens, stream: true, messages: [{ role: "system", content: SYSTEM }, ...messages] };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000); // javob boshlanmasa — 30 s da keyingisiga
  let resp;
  try {
    resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
  } catch {
    throw new PErr("busy", "javob kelmadi");
  } finally {
    clearTimeout(timer);
  }
  if (resp.ok && resp.body) return resp;
  try { await resp.body?.cancel(); } catch { /* */ }
  throw classify(resp.status);
}

// Ketma-ket bir xil rollarni birlashtirish, birinchisi 'user' bo'lishi
function clean(messages) {
  const out = [];
  for (const m of messages || []) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = String(m.content || "");
    if (!content.trim()) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + content;
    else out.push({ role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

function authorized(req) {
  const pass = env("APP_PASSWORD");
  return !pass || req.headers.get("x-qai-pass") === pass;
}

// ---------- Asosiy ----------
export default async (req) => {
  const path = new URL(req.url).pathname;

  if (path === "/api/providers") {
    return json({
      needPass: !!env("APP_PASSWORD"),
      authorized: authorized(req),
      providers: order().map((id) => ({ id, name: PROVIDERS[id].name, model: modelsOf(PROVIDERS[id]).join(", "), configured: keysOf(PROVIDERS[id]).length > 0 })),
    });
  }

  if (path !== "/api/chat" || req.method !== "POST") return json({ detail: "Topilmadi" }, 404);
  if (!authorized(req)) return json({ detail: "Parol noto'g'ri" }, 401);

  let input;
  try { input = await req.json(); } catch { return json({ detail: "Noto'g'ri so'rov" }, 400); }
  const messages = clean(input.messages);
  if (!messages.length) return json({ detail: "Bo'sh xabar" }, 400);

  // Navbat: tanlangan model birinchi, "dam olayotganlar" oxirida
  let ids = order().filter((id) => keysOf(PROVIDERS[id]).length);
  const avoid = new Set(Array.isArray(input.avoid) ? input.avoid : []);
  ids = [...ids.filter((id) => !avoid.has(id)), ...ids.filter((id) => avoid.has(id))];
  if (input.mode && input.mode !== "auto" && ids.includes(input.mode)) ids = [input.mode, ...ids.filter((id) => id !== input.mode)];

  const skipped = [];
  for (const pid of ids) {
    const p = PROVIDERS[pid];
    const keys = keysOf(p);
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      const queue = [...modelsOf(p)];
      let extended = false;
      for (let i = 0; i < queue.length; i++) {
        const model = queue[i];
        try {
          const upstream = await openStream(p, key, model, messages);
          return new Response(upstream.body, {
            headers: {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-cache",
              "x-qai-provider": pid,
              "x-qai-name": p.name,
              "x-qai-model": encodeURIComponent(model),
              "x-qai-format": p.kind,
              "x-qai-skipped": encodeURIComponent(JSON.stringify(skipped)),
            },
          });
        } catch (e) {
          const kind = e.kind || "other";
          skipped.push({ pid, name: model + (keys.length > 1 ? ` (kalit ${ki + 1})` : ""), kind, short: SHORT[kind], reason: e.message });
          if (kind === "auth") break;                       // bu kalit yaroqsiz — keyingi kalitga
          // limit ko'pincha model bo'yicha — shu kalitning boshqa modeli ishlashi mumkin
          if (kind !== "auth" && kind !== "other" && !extended && env("AUTO_MODEL") !== "0") {
            extended = true;                                // mavjud modellardan eng yaxshilarini qo'shamiz
            const extra = (await discover(pid, p, key)).filter((m) => !queue.includes(m)).slice(0, kind === "notfound" ? 3 : 1);
            queue.push(...extra);
          }
        }
      }
    }
  }

  const detail = ids.length
    ? "Hech bir model javob bera olmadi: " + skipped.map((s) => `${s.name} — ${s.reason}`).join("; ")
    : "Hali birorta API kalit qo'yilmagan. Netlify → Site configuration → Environment variables ga kalit qo'shing.";
  return json({ detail, skipped }, 503);
};

export const config = { path: "/api/*" };
