"""
Qurbonov AI — lokal server (Python). Ishga tushirish:  python run.py
Netlify'dagi versiya bilan bir xil sayt (public/ papkasi) va bir xil API.
"""

import json
import os
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from providers import (PROVIDERS, SHORT, ProviderError, discover_models, env,  # noqa: E402
                       open_stream, ordered_providers)

SYSTEM = env("SYSTEM_PROMPT") or (
    "Sen Qurbonov AI — Alor Qurbonov yaratgan aqlli yordamchisan. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber "
    "(odatda o'zbekcha). Aniq, foydali va halol javob ber. Muhim: bu suhbatda avval boshqa model javob bergan bo'lishi mumkin. "
    "Avvalgi barcha 'assistant' javoblarini o'zingniki deb qabul qil va suhbatni to'xtagan joyidan uzluksiz davom ettir — "
    "foydalanuvchidan hech narsani qayta so'rama."
)

app = FastAPI(title="Qurbonov AI")


def authorized(req: Request) -> bool:
    pw = env("APP_PASSWORD")
    return not pw or req.headers.get("x-qai-pass") == pw


def clean(messages) -> list[dict]:
    out: list[dict] = []
    for m in messages or []:
        role = "assistant" if m.get("role") == "assistant" else "user"
        content = str(m.get("content") or "")
        if not content.strip():
            continue
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n\n" + content
        else:
            out.append({"role": role, "content": content})
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


@app.get("/api/providers")
def providers(req: Request):
    return {
        "needPass": bool(env("APP_PASSWORD")),
        "authorized": authorized(req),
        "providers": [{"id": p.id, "name": p.name, "model": p.model, "configured": bool(p.keys)}
                      for p in ordered_providers()],
    }


@app.post("/api/chat")
async def chat(req: Request):
    if not authorized(req):
        return JSONResponse({"detail": "Parol noto'g'ri"}, 401)
    try:
        data = await req.json()
    except Exception:
        return JSONResponse({"detail": "Noto'g'ri so'rov"}, 400)
    messages = clean(data.get("messages"))
    if not messages:
        return JSONResponse({"detail": "Bo'sh xabar"}, 400)

    ids = [p.id for p in ordered_providers() if p.keys]
    avoid = set(data.get("avoid") or [])
    ids = [i for i in ids if i not in avoid] + [i for i in ids if i in avoid]
    mode = data.get("mode")
    if mode and mode != "auto" and mode in ids:
        ids = [mode] + [i for i in ids if i != mode]

    skipped: list[dict] = []
    for pid in ids:
        p = PROVIDERS[pid]
        keys = p.keys
        for ki, key in enumerate(keys):
            queue = list(p.models)
            extended = False
            i = 0
            while i < len(queue):
                model = queue[i]
                i += 1
                try:
                    upstream = await open_stream(p, key, model, SYSTEM, messages)
                except ProviderError as e:
                    skipped.append({"pid": pid, "name": model + (f" (kalit {ki + 1})" if len(keys) > 1 else ""),
                                    "kind": e.kind, "short": SHORT[e.kind], "reason": e.reason})
                    if e.kind == "auth":
                        break
                    if e.kind != "other" and not extended and env("AUTO_MODEL", "1") != "0":
                        extended = True
                        extra = [m for m in await discover_models(p, key) if m not in queue]
                        queue.extend(extra[:3] if e.kind == "notfound" else extra[:1])
                    continue

                async def relay(resp=upstream):
                    try:
                        async for chunk in resp.aiter_raw():
                            yield chunk
                    finally:
                        await resp.aclose()

                return StreamingResponse(relay(), media_type="text/event-stream", headers={
                    "cache-control": "no-cache",
                    "x-qai-provider": pid,
                    "x-qai-name": p.name,
                    "x-qai-model": quote(model),
                    "x-qai-format": p.kind,
                    "x-qai-skipped": quote(json.dumps(skipped, ensure_ascii=False)),
                })

    detail = ("Hech bir model javob bera olmadi: " + "; ".join(f"{s['name']} — {s['reason']}" for s in skipped)
              if ids else "Hali birorta API kalit qo'yilmagan. .env faylga kamida bitta kalit qo'ying.")
    return JSONResponse({"detail": detail, "skipped": skipped}, 503)


# ---------- Sayt ----------
PUBLIC = BASE / "public"


@app.get("/")
def index():
    return FileResponse(PUBLIC / "index.html")


app.mount("/", StaticFiles(directory=PUBLIC), name="public")
