# Cutline

AI-powered video editor — Shipaton 2026.

**Real pipeline:** upload → ffprobe → proxy → transcription → validated edit plan → FFmpeg MP4 → editor → export.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Start editing** → upload an MP4 → Create my edit.

Optional for better ASR + LLM plans:

```bash
cp .env.example .env.local
# OPENAI_API_KEY=sk-...
```

Without a key, local Whisper (`Xenova/whisper-tiny.en`) runs on-device.

## Smoke test (no UI)

```bash
ffmpeg -y -f lavfi -i "color=c=#1a3030:s=720x1280:d=8:r=30" \
  -f lavfi -i "sine=frequency=440:duration=8" \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest storage/tmp/smoke_source.mp4

npm run smoke
```

## Architecture

```
VIDEO FILE
  → ffprobe + thumbnail + proxy + wav
  → transcription (OpenAI | local whisper | silence fallback)
  → analysis (silences / highlights)
  → structured EditPlan (Zod-validated)
  → FFmpeg render (cuts, captions, stickers, music)
  → editor preview MP4
  → export MP4
```

See `AUDIT.md` for what was fake vs what is real now.
