# Cutline — Implementation Audit (post-rebuild)

## Before (fake)

| Stage | Status |
|------|--------|
| Upload | Blob URLs only |
| Metadata | HTML5 only |
| Transcription | Hardcoded mock script |
| Edit plan | Heuristic mock without render |
| Renderer | `preview-only` — never encoded |
| Export | Toast only |
| Music / stickers / fonts | Decorative |

## After (this rebuild)

| Stage | Status | Evidence |
|------|--------|----------|
| Upload | **REAL** — saved under `storage/uploads/` | `ingestUploadedFile` |
| Metadata | **REAL** — ffprobe duration/width/height/fps | smoke test logged 8s 720×1280 @30fps |
| Proxy + thumb + WAV | **REAL** — ffmpeg | per-asset files on disk |
| Transcription | **REAL** — OpenAI Whisper if keyed, else local `whisper-tiny.en`, else silence fallback | smoke: `local-whisper` |
| Edit plan | **REAL structured JSON** + Zod validate | clips/captions/stickers/music |
| Aesthetic styles | **REAL presets** drive plan | 8 styles |
| Preview render | **REAL MP4** via ffmpeg | smoke: `preview.mp4` ~87KB |
| Export | **REAL MP4** downloadable | smoke: `export.mp4` ~73KB |
| Timeline | Bound to single `EditPlan` | trim/add update plan |
| Apply preview / AI Improve | Re-renders MP4 | `/api/projects/[id]/render` + `improve` |
| Stickers / music / fonts | Real files burned into render | PNG overlay + amix |

## Still incomplete / limited

- Homebrew ffmpeg lacks `drawtext` → captions burned via **Sharp SVG→PNG overlays** (still in final video)
- Local whisper on sine-tone test media produces limited text (use real speech + optional `OPENAI_API_KEY`)
- Zoom is a simplified global scale (not keyframed zoompan per window)
- Auth remains demo email gate
- No cloud persistence / billing

## Verify

```bash
# generates storage/tmp/smoke_source.mp4 first if needed
ffmpeg -y -f lavfi -i "color=c=#1a3030:s=720x1280:d=8:r=30" \
  -f lavfi -i "sine=frequency=440:duration=8" \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest storage/tmp/smoke_source.mp4

npx tsx scripts/smoke-pipeline.ts
```

UI flow: `/upload` → real file → processing (server pipeline) → editor plays `previewUrl` → Apply preview / Export.
