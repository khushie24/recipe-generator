# 🍳 AI Recipe Generator

**Scan what's in your fridge. Get a recipe. Stop googling "what to cook with chicken and half an onion."**

No typing, no searching — just point your camera and let AI figure out dinner.

> 🎥 Episode 3 of my [**Learning AI Through Projects**](https://lnkd.in/p/d6sfYfVJ) series, where I build and ship one AI-powered app every week.

---

## How it works

📸 Scan your ingredients
↓
🧠 Gemini Vision identifies what’s in frame
↓
🔍 Backend ranks recipes from TheMealDB by ingredient overlap
↓
🤷 No good match? Gemini invents a recipe from scratch using exactly what you have
↓
🍽️ You cook. You eat. You don’t order takeout. You happy.


## Why this isn't just another recipe app

Most "recipe finder" apps assume you already know what you have and can type it out. This one skips that entirely — the camera *is* the search bar. And when your weird ingredient combo doesn't match anything in a database, it doesn't just shrug — Gemini writes you something new.

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | React (Vite) | Fast dev loop, clean component structure |
| Android | Capacitor | Ships as a real installable APK, not just a web wrapper |
| Camera | `getUserMedia` | Live browser-native capture, no native plugin overhead |
| Backend | FastAPI | Lightweight, async-friendly, easy to deploy |
| Vision | Gemini Vision | Ingredient detection from a single frame |
| Recipe DB | TheMealDB | Free, no-key-needed recipe lookup |
| Fallback generation | Gemini (text) | Steps in when the database comes up empty |
| Hosting | Hugging Face Spaces (Docker) | Free backend hosting, zero server management |

## 🔗 Live Backend

API running here → [Hugging Face Space](https://huggingface.co/spaces/khushie24/recipe-api)

## 📁 Project Structure

```
recipe-generator/
├── backend/     → FastAPI + Gemini + TheMealDB integration
├── frontend/    → React app, wrapped into an Android APK via Capacitor
└── app-release.apk   → ready to sideload and try
```


## 🚀 Run it locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Add a `.env` with `GEMINI_API_KEY` and `GEMINI_MODEL`.

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## 📱 Just want to try it?

Grab `app-release.apk` from this repo and sideload it on Android (camera permission required). No build step needed.

---

🔭 Next up in the series: an app that gives *objects* a personality and lets you talk to them.

Built by [Khushi Singh](https://github.com/khushie24) — ECE student turned "ship something every week" enthusiast.
