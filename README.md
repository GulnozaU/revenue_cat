# Cutline

AI-powered visual video editor for creators.
**Pipeline:** Upload MP4 → Gemini Files API watches the real video → validated EditPlan → FFmpeg renders MP4 → visual editor → export.

# Live hosted link:
https://revenue-cat-gules.vercel.app

## Run

```bash
npm install
cp .env.example .env.local
# Set GEMINI_API_KEY=...
# AI_MODE=real   # or mock for offline fixtures

npm run dev
```

Open http://localhost:3000

- `/` landing  
- `/dashboard` workspace  
- `/new` create project  
- `/editor/[id]` CapCut-style editor  

## AI modes

| Mode | Behavior |
|------|----------|
| `AI_MODE=real` | Uploads the actual MP4 to Gemini Files API, waits until ACTIVE, returns structured EditPlan |
| `AI_MODE=mock` | Uses saved fixtures / deterministic plan — **no Gemini calls** |

Normal editor actions never call Gemini. Only initial create + explicit AI Improve do.

## Smoke test

```bash
AI_MODE=mock npm run smoke
```

## Notes

- Export requires a successful FFmpeg render; the file must exist before “ready”.
- Stickers/captions/music are burned into the MP4 (Sharp PNG overlays + amix).
- Style learning UI is scaffolded but not faked as complete.
