"""
Kalitlaringiz bilan qaysi modellar ishlashini ko'rsatadi.

Ishlatish:  python models.py
Keyin chiqqan nomlardan birini .env dagi ..._MODEL qatoriga yozasiz.
"""

from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from providers import ordered_providers  # noqa: E402


def gemini_models(key: str) -> list[str]:
    r = httpx.get("https://generativelanguage.googleapis.com/v1beta/models",
                  params={"key": key, "pageSize": 200}, timeout=20)
    r.raise_for_status()
    return sorted(m["name"].removeprefix("models/") for m in r.json().get("models", [])
                  if "generateContent" in m.get("supportedGenerationMethods", []))


def openai_style_models(base_url: str, key: str) -> list[str]:
    r = httpx.get(f"{base_url}/models", headers={"Authorization": f"Bearer {key}"}, timeout=20)
    r.raise_for_status()
    return sorted(m["id"] for m in r.json().get("data", []))


def anthropic_models(key: str) -> list[str]:
    r = httpx.get("https://api.anthropic.com/v1/models",
                  headers={"x-api-key": key, "anthropic-version": "2023-06-01"}, timeout=20)
    r.raise_for_status()
    return sorted(m["id"] for m in r.json().get("data", []))


if __name__ == "__main__":
    found = False
    for p in ordered_providers():
        if not p.keys:
            continue
        found = True
        key = p.keys[0]
        print(f"\n=== {p.name}  (hozir .env da: {p.model}) ===")
        try:
            if p.id == "gemini":
                names = gemini_models(key)
            elif p.kind == "anthropic":
                names = anthropic_models(key)
            else:
                names = openai_style_models(p.base_url, key)
            for n in names:
                mark = "  <- ishlatilyapti" if n in p.models else ""
                print(f"  {n}{mark}")
        except httpx.HTTPError as e:
            print(f"  Ro'yxatni olib bo'lmadi: {e}")
    if not found:
        print(".env faylda hali birorta API kalit yo'q.")
