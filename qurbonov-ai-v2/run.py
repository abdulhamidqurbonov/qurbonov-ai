"""Qurbonov AI'ni ishga tushirish:  python run.py"""
import threading
import webbrowser

import uvicorn

HOST, PORT = "127.0.0.1", 8000

if __name__ == "__main__":
    url = f"http://{HOST}:{PORT}"
    print(f"\n  Qurbonov AI ishga tushdi:  {url}\n  To'xtatish: Ctrl+C\n")
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False, log_level="warning")
