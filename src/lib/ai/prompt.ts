import type { AestheticId, VideoFormat } from "@/lib/types/edit-plan";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";
import { getStyle } from "@/lib/styles/presets";
import { MUSIC_LIBRARY } from "@/lib/assets/library";

/** Shared EditPlan system prompt for NVIDIA + Gemini. */
export function buildEditPlanSystemPrompt(
  aestheticId: AestheticId,
  format: VideoFormat
) {
  const style = getStyle(aestheticId);
  const tracks = MUSIC_LIBRARY.map((t) => t.id).join(", ");
  return `You are a professional short-form video editor.
Watch the attached video carefully. Return ONLY valid JSON for an EditPlan.

Schema:
{
  "sourceDuration": number,
  "format": "vertical_9_16" | "landscape_16_9",
  "aestheticId": "${aestheticId}",
  "duration": number,
  "clips": [{ "id": "clip_1", "sourceStart": 0, "sourceEnd": 2, "timelineStart": 0, "timelineEnd": 2, "speed": 1, "action": "keep", "reason": "..." }],
  "cuts": [],
  "captions": [{ "id": "cap_1", "start": 0, "end": 2, "text": "...", "style": "${style.captionStyle}", "fontId": "${style.fontId}", "fontSize": 44, "x": 0.5, "y": 0.78, "animation": "none" }],
  "textOverlays": [],
  "stickers": [{ "id": "stk_1", "assetId": "star|heart|sparkle|fire|arrow|circle", "start": 0, "end": 1.5, "x": 0.8, "y": 0.2, "scale": 0.3, "rotation": 0 }],
  "zooms": [{ "id": "zoom_1", "start": 1, "end": 2, "scale": 1.08, "x": 0.5, "y": 0.45 }],
  "music": { "trackId": "${tracks}", "volume": ${style.musicVolume}, "startAt": 0, "fadeIn": 0.4, "fadeOut": 0.8 } | null,
  "styleNotes": "..."
}

Rules:
- You MUST watch the video. Use real moments, speech, and visuals you observe.
- Timeline must be continuous from 0 with no gaps between clips.
- Never invent source times beyond sourceDuration.
- Every clip MUST satisfy sourceEnd >= sourceStart + 0.25. Never emit zero-length clips.
- Cut awkward pauses / dead air based on what you see and hear.
- Captions should reflect actual spoken words or on-screen meaning.
- Stickers only from: star, star2, heart, heart2, bow, flower, spark, sparkle, fire, arrow, circle.
- Music trackId only from: ${tracks}.
- cuts must be an array of objects like { "at": 1.2, "type": "hard" } OR an empty array []. Never use bare strings or objects without "at".
- Respect aesthetic "${style.name}": pacing=${style.pacing}, captionStyle=${style.captionStyle}, stickerUsage=${style.stickerUsage}, zoomFrequency=${style.zoomFrequency}.
- Target format: ${FORMAT_PRESETS[format].ratio} (${FORMAT_PRESETS[format].aspect}).
- Return ONLY JSON. No markdown fences. No commentary.`;
}

export function buildEditPlanUserText(input: {
  prompt: string;
  sourceDuration: number;
  aestheticId: AestheticId;
  improve?: {
    instruction: string;
    currentPlan: unknown;
    selection?: unknown;
  };
}) {
  if (input.improve) {
    return `Improve this existing edit plan based on the instruction.
Instruction: ${input.improve.instruction}
Selection: ${JSON.stringify(input.improve.selection ?? null)}
Current plan: ${JSON.stringify(input.improve.currentPlan)}
Source duration: ${input.sourceDuration}
Creator prompt: ${input.prompt}
Return a full updated EditPlan JSON.
IMPORTANT: every clip must have sourceEnd > sourceStart by at least 0.25 seconds.`;
  }

  return `Creator prompt: ${input.prompt}
Source duration seconds: ${input.sourceDuration}
Aesthetic: ${input.aestheticId}
Create the first edit plan JSON now.
IMPORTANT: every clip must have sourceEnd > sourceStart by at least 0.25 seconds.
Do not emit zero-length clips. Stay within 0..${input.sourceDuration}.`;
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  // Strip leading reasoning chatter if model wrapped JSON
  const brace = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (brace >= 0 && last > brace) {
    return JSON.parse(raw.slice(brace, last + 1));
  }
  return JSON.parse(raw);
}
