# Qurbonov AI 🔶

Limiti tugasa yoki band bo'lsa, avtomatik boshqa modelga o'tadigan AI chat.
Javob so'zma-so'z darrov chiqadi. Modelni qo'lda ham tanlash mumkin.

Bitta sayt, ikki xil ishga tushirish:
- 🌐 **Netlify** — internetda, telefondan ham (pastda qo'llanma)
- 💻 **Kompyuterda** — `python run.py`

```
qurbonov-ai/
├── public/                    ← sayt (dizayn): index.html, style.css, app.js
├── netlify/edge-functions/
│   └── api.js                 ← Netlify server qismi (modellar, avto-almashish)
├── netlify.toml               ← Netlify sozlamasi
├── main.py, providers.py      ← kompyuterda ishlatish uchun Python server
├── run.py                     ← python run.py
├── models.py                  ← kalitingda qaysi modellar borligini ko'rsatadi
└── .env.example               ← kalitlar shabloni (kompyuter uchun)
```

---

## 🌐 Netlify'ga joylash (Node.js o'rnatish shart emas)

> ⚠️ Netlify'ning "drag & drop" usuli server qismini ishga tushirmaydi. GitHub orqali joylaymiz — hammasi brauzerda.

### 1. GitHub'ga yuklash
1. **github.com** → ro'yxatdan o'ting → o'ng yuqorida **+** → **New repository**
2. Nomi: `qurbonov-ai`, **Private** ni tanlang → **Create repository**
3. Ochilgan sahifada **"uploading an existing file"** havolasini bosing
4. Papka ichidagi **hamma fayl va papkalarni** sudrab tashlang (public, netlify, netlify.toml va h.k.)
   - ❌ **`.env` faylni YUKLAMANG** — unda kalitlaringiz bor!
5. Pastda **Commit changes** ni bosing

### 2. Netlify'ga ulash
1. **app.netlify.com** → GitHub bilan kiring
2. **Add new project → Import an existing project → GitHub** → `qurbonov-ai` ni tanlang
3. Sozlamalarni o'zgartirmang (netlify.toml hammasini aytib turibdi) → **Deploy**

### 3. Kalitlarni qo'shish (eng muhim qadam)
**Project configuration → Environment variables → Add a variable**:

| Key | Value |
|---|---|
| `APP_PASSWORD` | o'zingiz o'ylagan parol (albatta qo'ying!) |
| `GROQ_API_KEY` | `gsk_...` |
| `GEMINI_API_KEY` | `AIza...` (bir nechta bo'lsa vergul bilan) |
| `GEMINI_MODEL` | `gemini-3.8-flash,gemini-flash-lite-latest` |

So'ng **Deploys → Trigger deploy → Deploy site**. 1 daqiqada sayt `https://...netlify.app` manzilida ishlaydi. Birinchi kirganda parol so'raydi.

🔒 **Nega parol shart:** parolsiz sayt manzilini bilgan har kim sizning kalitlaringiz hisobidan foydalana oladi.

### Kodni yangilash
GitHub'dagi faylni oching → ✏️ (Edit) yoki **Add file → Upload files** bilan almashtiring → **Commit**. Netlify o'zi qayta joylaydi.

---

## 💻 Kompyuterda ishlatish

```bash
pip install -r requirements.txt
python run.py
```
`.env.example` ni nusxalab `.env` qiling va kalitlarni yozing. Brauzer o'zi ochiladi: http://127.0.0.1:8000

---

## Qanday ishlaydi

- **Avto rejim:** `PROVIDER_ORDER` bo'yicha navbat (Groq eng tez, shuning uchun birinchi). Model band/limit/topilmadi bo'lsa — **kutmasdan** keyingisiga o'tadi.
- **Qo'lda tanlash:** pastdagi **Avto ▾** tugmasi yoki chatga `/groq`, `/gemini`, `/avto` yozing. Tanlangan model ishlamasa ham suhbat to'xtamaydi — zaxiraga o'tadi.
- **Model nomini bilish shart emas:** model topilmasa, provayderdan ro'yxat olib eng yaxshisini o'zi tanlaydi.
- **Limitga tushgan model** 10 daqiqa navbat oxiriga suriladi (pastda 🟡).
- **Suhbatlar** brauzeringizda saqlanadi (boshqa telefon/kompyuterda ko'rinmaydi).
- **To'xtatish:** javob yozilayotganda ⏹ tugmasi yoki Esc. **Yangi suhbat:** Ctrl+K.

---

## Shinobu Oshino va do'stlari (3D hamroh)

- **Bosish:** bir marta — tinglaydi; boshini bossangiz — erkalaysiz (uyaladi); tez-tez 3 marta — qitiqlaysiz (kuladi).
- **Hissiyotlar:** uyalish (yuzini yopadi, qizaradi), nozlanish, kulish, sakrash, qarsak, xafa bo'lsa orqasini o'girib "xafa bo'ldim" deydi,
  jahli chiqsa oyog'ini tepadi, lunjini shishiradi, qo'rqadi, hayron qoladi, zerikadi, yig'laydi.
- **Uyqu:** yerga yonboshlab yotadi; ko'rpa yopsangiz, yostiq bersangiz — ko'rinadi.
- **Ovqat:** shirinlik yesa yuziga yuqadi — menyudagi salfetka bilan artib qo'yasiz.
- **22 xil sovg'a**, **9 ta o'yin** (u osonlikcha yutqazmaydi — siz ko'p yutsangiz, u ham kuchayadi).
- **Personajlar:** menyu → Sozlamalar → Personajni almashtirish. Yangi personaj: VRoid'da yasang → `public/models/yulduz.vrm` (yoki `temur.vrm`) va kichik `.jpg` yuz rasmini qo'ying.
  Ism va xarakterni `public/companion.js` dagi `CHARS` da o'zgartirasiz.
- **Ko'rinish:** soch, ko'z va kiyim rangini o'zgartirish (Sozlamalar → Ko'rinishini o'zgartirish).

## Rasm
- Chizish: FLUX.2 Klein 9B (Cloudflare) → FLUX.1 → Pollinations. "Telefon oboyi" desangiz tik, "banner" desangiz keng chizadi.
- Tahrirlash: FLUX.2 Klein 9B → 4B, asl rasm nisbati saqlanadi.
- Nima xohlayotganingiz noaniq bo'lsa (rasm yuklab savol berdingizmi yoki o'zgartirish so'radingizmi), sayt AI'dan so'rab aniqlaydi.
