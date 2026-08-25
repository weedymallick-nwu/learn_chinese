# fardinApp — English → Chinese CLI Translator

A terminal-styled web translator built with **Next.js 15 + TypeScript + Tailwind CSS**,
using the dark design system extracted in `DESIGN-rustfinity-com.md`
(black canvas `#000000`, accent `#d97757`, Geist Sans/Mono).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Use it

- Type any English sentence at the `~/translate ❯` prompt and press **Enter**
- The Simplified Chinese translation types out live, followed by full-sentence
  pinyin **and a word-by-word breakdown** — each Chinese word shown with its
  own pinyin and English meanings
- `↑` / `↓` cycle through your sentence history · `Ctrl+L` clears the screen
- Built-in commands: `/help`, `/clear`, `/about`

## How translation works

The browser POSTs to `/api/translate`. The server tries Google's public
translate endpoint first (returns Chinese + romanization), then falls back to
MyMemory if unavailable. No API keys needed. Pinyin is computed **offline**
via `pinyin-pro`, so it works on any network.

## 📱 Install on your phone (PWA — recommended)

1. Find your PC's local IP: run `ipconfig` and note the IPv4 (e.g. `192.168.1.5`).
2. Start the server exposed to your network: `npm run dev -- -H 0.0.0.0`
3. On your phone (same Wi-Fi) open `http://<PC-IP>:3000` in Chrome.
4. Chrome menu (⋮) → **Add to Home screen** → Install.
   You now get an app icon, full-screen window, and offline access to the UI.

## 🤖 Get a real APK file

I can't compile Android binaries here, but your PWA makes it a 5-minute job:

1. Deploy the site free: `npx vercel` (gives you a `https://…vercel.app` URL).
2. Open **https://www.pwabuilder.com**, paste that URL, pick **Android**.
3. Download the package — inside is a signed `apk` you can copy to your phone
   and install (allow "install unknown apps" when prompted).
