# ZERO TOLERANCE — NANYA CNC Machining Challenge (v4.0)

Browser 3D game (Three.js r160, WebGL). No server code, no build step needed to deploy. Works on desktop and phones.

## Folders
| Folder | What it is |
|---|---|
| `dist/` | **Ready to upload.** One `index.html`; loads Three.js from the jsDelivr CDN. |
| `dist-selfhosted/` | Same game, but Three.js is in `vendor/` so nothing loads from a third-party CDN. Upload the whole folder. |
| `src/` | Source: `shell.html` (UI/CSS), `p1_engine.js` (3D engine, machines, jobs), `p2_audio.js` (music/SFX), `p3_game.js` (gameplay, scoring, progression), `p4_ui.js` (menus, HUD, results, input, main loop), `p5_intro.js` (NANYA logo intro), `p6_features.js` (Night Shift, Shop Talk quiz, daily streak, announcer, PB ghost, FX), `assets/`, `build.py`. |
| `embed-snippet.html` | iframe code to place the game inside an existing page. |

## Launch on nye-cnc.com
1. Upload `dist-selfhosted/` (recommended) or `dist/` to the web server as a folder named `game`
   (cPanel File Manager / FTP → `public_html/game/`). The game is then at **https://nye-cnc.com/game/**.
2. Link to it from the menu or a banner ("Play the Machining Challenge"), or paste `embed-snippet.html` into a page
   (WordPress: add a *Custom HTML* block). Full-page link is the best experience on phones.
3. Must be served over **https** (needed for audio/clipboard on some browsers). Opening the file directly from disk may block the ES-module imports in the self-hosted version — always test through a web server, e.g. `cd dist-selfhosted && python3 -m http.server 8000`.

## Settings to edit (top of `src/p1_engine.js`, then run `python3 build.py`)
- `LEAD_ENDPOINT` — URL that receives leaderboard/lead form submissions as JSON POST
  `{name, company, email, country, score, mode, label, at}`. Empty = scores are saved only in the player's browser.
  Point it at a CRM webhook, Google Apps Script, Zapier/Make hook, or a small PHP script.
- `STUDIO_CREDIT` — splash credit ("BRAND EDGE CREATIONS"). Set to `''` to skip that screen.
- `MACHINES` / `JOBS` — machine specs, links, job list, difficulty.

Quick edits without rebuilding: open `dist/index.html` in a text editor and search for `LEAD_ENDPOINT` or `STUDIO_CREDIT`.

## Rebuild after editing source
```
cd src
python3 build.py dist dist-selfhosted   # regenerates both builds
```

## Notes
- Player progress, XP, credits and settings are stored in `localStorage` (keys starting `zt3-`).
- Fonts load from Google Fonts; if blocked, system fonts are used.
- Three.js is MIT licensed (`dist-selfhosted/vendor/three/LICENSE`).
