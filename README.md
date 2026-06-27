# Atlas

A dark, premium personal dashboard — built as an installable PWA.

## Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS v4** (CSS-first config via `@theme` in `src/index.css`)
- **lucide-react** for icons
- **vite-plugin-pwa** for the installable manifest + service worker

## Design system

Defined as CSS variables / Tailwind tokens in [`src/index.css`](src/index.css):

| Token | Value |
|-------|-------|
| Background | `#08090C` |
| Card surface | `#15171E` |
| Hairline border | `rgba(255,255,255,0.08)` |
| Mint accent | `#34F5C5` |
| Amber accent | `#FFB155` |
| Indigo accent | `#8A93FF` |
| Rose accent | `#FF6B81` |

Fonts: **Inter** (body) and **Space Grotesk** (headlines / big numbers).

## Structure

```
src/
  App.tsx              # phone-width shell layout
  components/
    StatusBar.tsx      # cosmetic iOS status bar (auto-hides when installed)
    Header.tsx         # Atlas logo + notification bell
    TabBar.tsx         # Home / Energy / Sleep / Training / Journal
  screens/
    Home.tsx           # blank for now
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (+ PWA assets)
npm run preview    # preview the production build
```

## Install to a phone

Open the deployed app in mobile Safari/Chrome → **Add to Home Screen**. The
manifest uses the dark theme colour (`#08090C`) and launches standalone.
