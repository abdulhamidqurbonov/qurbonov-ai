"""
Qurbonov AI — modellar va avto-almashish (lokal Python versiyasi).
Netlify'dagi netlify/edge-functions/api.js bilan bir xil ishlaydi.

  * .env da bir nechta kalit/model vergul bilan: GEMINI_API_KEY=k1,k2  GEMINI_MODEL=m1,m2
  * Model band (5xx), limit (429), topilmadi (404) bo'lsa — kutmasdan keyingisiga o'tadi.
  * 404 bo'lsa — provayderdan mavjud modellar ro'yxatini olib, eng yaxshisini o'zi tanlaydi.
"""

import os
from dataclasses import dataclass

import httpx

SHORT = {"limit": "limit tugadi", "auth": "kalit xato", "notfound": "mavjud emas", "busy": "band", "other": "xato"}


class ProviderError(Exception):
    def __init__(self, kind: str, reason: str | None = None):
        super().__init__(reason or SHORT[kind])
        self.kind = kind
        self.reason = reason or SHORT[kind]


def env(name: str, default: str = "") -> str:
    return os.getenv(name, "").strip() or default


def split(s: str) -> list[str]:
    return [x.strip() for x in s.split(",") if x.strip()]


@dataclass
class Provider:
    id: str
    name: str
    kind: str
    base_url: str
    model_env: str
    default_model: str
    key_env: str

    @property
    def keys(self) -> list[str]:
        return split(os.getenv(self.key_env, ""))

    @property
    def models(self) -> list[str]:
        return split(env(self.model_env, self.default_model))

    @property
    def base(self) -> str:          # ixtiyoriy: .env da GROQ_BASE_URL=... bilan o'zgartirish mumkin
        return env(self.key_env.replace("_API_KEY", "_BASE_URL"), self.base_url)

    @property
    def model(self) -> str:
        return ", ".join(self.models)


PROVIDERS = {p.id: p for p in [
    Provider("groq", "Groq", "openai", "https://api.groq.com/openai/v1", "GROQ_MODEL", "openai/gpt-oss-120b", "GROQ_API_KEY"),
    Provider("gemini", "Gemini", "openai", "https://generativelanguage.googleapis.com/v1beta/openai", "GEMINI_MODEL", "gemini-3.8-flash,gemini-flash-lite-latest", "GEMINI_API_KEY"),
    Provider("cerebras", "Cerebras", "openai", "https://api.cerebras.ai/v1", "CEREBRAS_MODEL", "llama-3.3-70b", "CEREBRAS_API_KEY"),
    Provider("mistral", "Mistral", "openai", "https://api.mistral.ai/v1", "MISTRAL_MODEL", "mistral-small-latest", "MISTRAL_API_KEY"),
    Provider("openrouter", "OpenRouter", "openai", "https://openrouter.ai/api/v1", "OPENROUTER_MODEL", "openrouter/free", "OPENROUTER_API_KEY"),
    Provider("qwen", "Qwen", "openai", "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1", "QWEN_MODEL", "qwen3.8-max", "QWEN_API_KEY"),
    Provider("claude", "Claude", "anthropic", "https://api.anthropic.com/v1", "CLAUDE_MODEL", "claude-sonnet-5-5", "ANTHROPIC_API_KEY"),
    Provider("deepseek", "DeepSeek", "openai", "https://api.deepseek.com/v1", "DEEPSEEK_MODEL", "deepseek-chat", "DEEPSEEK_API_KEY"),
    Provider("openai", "ChatGPT", "openai", "https://api.openai.com/v1", "OPENAI_MODEL", "gpt-4o-mini", "OPENAI_API_KEY"),
]}


def ordered_providers() -> list[Provider]:
    ids = split(env("PROVIDER_ORDER", "groq,gemini,openrouter,qwen,cerebras,mistral,claude,deepseek,openai"))
    return [PROVIDERS[i] for i in ids if i in PROVIDERS]


def classify(code: int) -> ProviderError:
    if code in (429, 402):
        return ProviderError("limit", f"limit tugadi ({code})")
    if code in (401, 403):
        return ProviderError("auth", f"kalit xato ({code})")
    if code == 404:
        return ProviderError("notfound", "model topilmadi (404)")
    if code >= 500:
        return ProviderError("busy", f"server band ({code})")
    return ProviderError("other", f"xato {code}")


# ---------- Modelni avtomatik topish ----------
_discovered: dict[str, list[str]] = {}
_EXCLUDE = ("whisper", "tts", "guard", "embed", "image", "audio", "realtime", "transcri", "moderation", "imagen",
            "veo", "live", "robotics", "computer-use", "orpheus", "playai", "safeguard", "aqa", "learnlm", "compound", "nano-banana")
_PREFER = (("flash", 6), ("gpt-oss-120b", 5), ("70b", 4), ("versatile", 4), ("120b", 3), ("sonnet", 4), ("latest", 2),
           ("small", 1), ("instant", 1), ("lite", -1), ("8b", -1), ("preview", -2), ("exp", -3), ("thinking", -2))


def _score(i: str) -> int:
    return sum(w for kw, w in _PREFER if kw in i.lower())


async def discover_models(p: Provider, key: str) -> list[str]:
    ck = p.id + key[-6:]
    if ck in _discovered:
        return _discovered[ck]
    ids: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            if p.id == "gemini":
                r = await c.get("https://generativelanguage.googleapis.com/v1beta/models", params={"key": key, "pageSize": 200})
                ids = [m["name"].removeprefix("models/") for m in r.json().get("models", [])
                       if "generateContent" in m.get("supportedGenerationMethods", [])]
            else:
                h = ({"x-api-key": key, "anthropic-version": "2023-06-01"} if p.kind == "anthropic"
                     else {"Authorization": f"Bearer {key}"})
                r = await c.get(f"{p.base}/models", headers=h)
                ids = [m["id"] for m in r.json().get("data", [])]
    except Exception:
        ids = []
    ids = sorted((i for i in ids if not any(x in i.lower() for x in _EXCLUDE)), key=_score, reverse=True)
    _discovered[ck] = ids
    return ids


# ---------- Oqimni ochish ----------
CLIENT = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))   # ulanishlar qayta ishlatiladi — tezroq


async def open_stream(p: Provider, key: str, model: str, system: str, messages: list[dict]) -> httpx.Response:
    max_tokens = int(env("MAX_TOKENS", "4096"))
    if p.kind == "anthropic":
        url = f"{p.base}/messages"
        headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        body = {"model": model, "max_tokens": max_tokens, "system": system, "messages": messages, "stream": True}
    else:
        url = f"{p.base}/chat/completions"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Title": "Qurbonov AI"}
        body = {"model": model, "max_tokens": max_tokens, "stream": True,
                "messages": [{"role": "system", "content": system}] + messages}
    try:
        req = CLIENT.build_request("POST", url, headers=headers, json=body,
                                   timeout=httpx.Timeout(120.0, connect=10.0, read=30.0))
        resp = await CLIENT.send(req, stream=True)
    except httpx.HTTPError:
        raise ProviderError("busy", "javob kelmadi")
    if resp.status_code == 200:
        return resp
    await resp.aclose()
    raise classify(resp.status_code)
