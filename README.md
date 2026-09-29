# Cutline

AI-powered video editor for creators — Shipaton 2026 Next Gen submission.

> Upload your video → describe how you want it edited → AI creates a polished first cut → refine it in a visual editor.

**Not a chatbot.** The product feels closer to CapCut / Canva / Figma. AI is embedded inside the editor.

## Architecture

```
VIDEO
  → TRANSCRIPTION + VIDEO METADATA
  → SCENE / SILENCE / TIMING ANALYSIS
  → AI EDIT PLAN (structured JSON)
  → VALIDATED JSON (Zod)
  → RENDERER / PREVIEW
  → VISUAL EDITOR
  → FINAL EXPORT
```

The LLM decides **what** should happen. FFmpeg / preview code decides **how**.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Zod-validated edit plans
- Storage abstraction (`local` now → Supabase/S3/R2 later)
- Transcription abstraction (OpenAI Whisper when keyed, otherwise mock)
- FFmpeg renderer command builder (preview-first for demos)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API keys required — the full UI runs on realistic mock analysis + edit plans.

Optional `.env.local` (see `.env.example`):

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Core flow

1. Landing → **Start editing** (no login)
2. Upload MP4 / MOV / WebM
3. Pick format (Reels / TikTok / Shorts / YouTube)
4. Describe the edit in natural language
5. Processing stages → first cut
6. Visual editor: clips, captions, text, music, zooms, timeline
7. **AI Improve** on a selection
8. Export requires sign-in

## Project layout

```
src/lib/types/edit-plan.ts   # EditPlan types + Zod validation
src/lib/storage/             # StorageProvider abstraction
src/lib/transcription/       # TranscriptionProvider abstraction
src/lib/analysis/            # Silence / scenes / highlights
src/lib/ai/edit-plan.ts      # LLM + mock plan generation
src/lib/renderer/            # FFmpeg command builder + timeline mapping
src/app/api/                 # analyze, edit-plan, improve, export, upload
src/components/editor/       # CapCut-style visual editor
```

## Notes

- Client preview applies the edit plan live (clip mapping, captions, zooms).
- Server never blindly trusts AI JSON — Zod validates before render/export.
- Demo auth is email-only for the hackathon; swap for Clerk/Supabase later.
