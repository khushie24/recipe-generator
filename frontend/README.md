# Ingredient Scanner — Frontend

React (Vite) app that captures a live camera frame, sends it to your FastAPI
backend for Gemini-based ingredient detection, then fetches recipe matches.

## 1. Install & run in the browser first

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:8000
npm run dev
```

Open the printed localhost URL. Your browser will ask for camera
permission — allow it. This is the fastest loop for iterating on UI and
API wiring before touching Android at all.

**Before this works, your backend needs CORS enabled** for
`http://localhost:5173` (add it to `main.py`'s `CORSMiddleware`
`allow_origins`), and needs to be running (`uvicorn app.main:app --reload`).

## 2. API contract

`src/services/api.js` is wired to your actual `schemas.py`:

- `POST /detect` — body `{ "image_base64": "<base64 jpeg, no data-URL prefix>" }`
  → `{ "ingredients": ["tomato", "onion", ...] }`
- `POST /recipes` — body `{ "ingredients": [...] }`
  → `{ "recipes": [{ "id", "title", "image", "matched_ingredients",
    "instructions", "source" }] }`, where `source` is `"themealdb"` or
    `"ai_generated"`.

Your `Recipe` model doesn't return each recipe's full ingredient list, so
the UI shows what *was* matched from your scan rather than what's still
missing — if you want a "3 more ingredients needed" callout later, that
needs the recipe's full ingredient list added to the schema.

## 3. Deploy the backend to Render

Do this before wiring up the phone build so you can test against the real
(cold-start-prone) URL early rather than discovering CORS/env issues after
building the APK. Once deployed, put that URL in `.env` as
`VITE_API_BASE_URL` and confirm `npm run dev` still works end-to-end.

## 4. Add Capacitor and the Android platform

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init "Ingredient Scanner" "com.yourname.ingredientscanner" --web-dir=dist
npm run build
npx cap add android
npx cap sync android
```

(`capacitor.config.ts` in this repo already has matching values — `cap init`
may prompt to overwrite it, which is fine.)

### Grant camera permission on Android

Open `android/app/src/main/AndroidManifest.xml` and add, inside `<manifest>`
and above `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Without this, `getUserMedia` inside the Capacitor webview will silently
fail or reject.

### Allow cleartext/local testing (optional, dev only)

If you test against a backend on your LAN over plain `http://` (not
`https://`) during development, add
`android:usesCleartextTraffic="true"` to the `<application>` tag in the
same manifest. Remove it again once you're pointing at your `https://`
Render URL.

## 5. Test on a real device

```bash
npx cap open android
```

This opens Android Studio. Connect your phone via USB with USB debugging
enabled, select it as the run target, and hit Run. Every time you change
frontend code:

```bash
npm run build
npx cap sync android
```

then re-run from Android Studio (or use the `npm run cap:sync` shortcut
defined in `package.json`).

## 6. Build & sideload a signed release APK

In Android Studio: **Build → Generate Signed Bundle / APK → APK**, create
or reuse a keystore, build the release variant, then copy the resulting
`.apk` from `android/app/release/` onto your phone and install it (you'll
need to allow "install unknown apps" for whichever app you transfer it
through).

## Notes on the camera implementation

This uses `getUserMedia` directly for a *live* preview with a capture
button, rather than the `@capacitor/camera` plugin — that plugin launches
the phone's separate native camera app for a single shot, which isn't a
scanning experience. `getUserMedia` works fine inside the Capacitor
webview once the manifest permission above is in place.