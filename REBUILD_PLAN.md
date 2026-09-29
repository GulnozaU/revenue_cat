# Cutline Rebuild Plan (internal)

## Audit summary

Works today:
- Real upload → disk (`storage/uploads`)
- ffprobe metadata, thumbnail, proxy, WAV extract
- Zod EditPlan + FFmpeg render (cuts, PNG captions, stickers, music)
- Editor timeline bound to EditPlan; Apply preview / Export re-render
- Project JSON persistence

Broken / wrong for Shipathon:
- AI path uses OpenAI/local whisper — does NOT send MP4 to Gemini
- No AI_MODE mock/real
- UI feels generic; no dashboard; weak aesthetic system
- Limited assets

## Execution order

1. Gemini Files API video → structured EditPlan (+ fixtures + AI_MODE)
2. Pipeline: replace transcript-first AI with Gemini video understanding
3. Visual system + landing + dashboard + new-project flow
4. Expand aesthetics/assets; editor polish; export progress
5. Smoke test real flow
