import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";
import type {
  AestheticId,
  EditPlan,
  VideoFormat,
} from "@/lib/types/edit-plan";
import {
  FORMAT_PRESETS,
  normalizeEditPlan,
  validateEditPlan,
} from "@/lib/types/edit-plan";
import { getStyle } from "@/lib/styles/presets";
import { MUSIC_LIBRARY } from "@/lib/assets/library";

export type GeminiEditInput = {
  videoPath: string;
  mimeType: string;
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  sourceDuration: number;
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: { type: string; id?: string; start?: number; end?: number };
  };
};

function getAiMode(): "mock" | "real" {
  const mode = (process.env.AI_MODE ?? "real").toLowerCase();
  return mode === "mock" ? "mock" : "real";
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local or set AI_MODE=mock."
    );
  }
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function uploadAndWait(videoPath: string, mimeType: string) {
  const ai = getClient();
  let file = await ai.files.upload({
    file: videoPath,
    config: { mimeType: mimeType || "video/mp4" },
  });

  const started = Date.now();
  while (!file.state || String(file.state) !== "ACTIVE") {
    if (String(file.state) === "FAILED") {
      throw new Error("Gemini failed to process the uploaded video.");
    }
    if (Date.now() - started > 180_000) {
      throw new Error("Timed out waiting for Gemini video processing.");
    }
    await sleep(2500);
    if (!file.name) throw new Error("Gemini file missing name.");
    file = await ai.files.get({ name: file.name });
  }

  if (!file.uri || !file.mimeType) {
    throw new Error("Gemini file upload incomplete (missing uri/mimeType).");
  }

  return file as { uri: string; mimeType: string; name?: string };
}

function buildSystemPrompt(aestheticId: AestheticId, format: VideoFormat) {
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
- Cut awkward pauses / dead air based on what you see and hear.
- Captions should reflect actual spoken words or on-screen meaning.
- Stickers only from: star, star2, heart, heart2, bow, flower, spark, sparkle, fire, arrow, circle.
- Music trackId only from: ${tracks}.
- Respect aesthetic "${style.name}": pacing=${style.pacing}, captionStyle=${style.captionStyle}, stickerUsage=${style.stickerUsage}, zoomFrequency=${style.zoomFrequency}.
- Target format: ${FORMAT_PRESETS[format].ratio} (${FORMAT_PRESETS[format].aspect}).`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

async function saveFixture(name: string, data: unknown) {
  const dir = path.join(process.cwd(), "storage", "fixtures");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${name}.json`),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

export async function loadMockEditPlan(
  sourceDuration: number,
  format: VideoFormat,
  aestheticId: AestheticId
): Promise<EditPlan> {
  const fixturePath = path.join(
    process.cwd(),
    "storage",
    "fixtures",
    "last-edit-plan.json"
  );
  try {
    const raw = JSON.parse(await fs.readFile(fixturePath, "utf8"));
    const validated = validateEditPlan(raw);
    if (validated.success) {
      return normalizeEditPlan(validated.data, sourceDuration);
    }
  } catch {
    /* fall through */
  }

  // Built-in deterministic mock (still a valid EditPlan — for offline UI/dev)
  const style = getStyle(aestheticId);
  const take = Math.min(sourceDuration, Math.max(4, sourceDuration * 0.7));
  const plan = {
    sourceDuration,
    format: FORMAT_PRESETS[format].ratio,
    aestheticId,
    duration: take,
    clips: [
      {
        id: "clip_1",
        sourceStart: 0,
        sourceEnd: take,
        timelineStart: 0,
        timelineEnd: take,
        speed: 1,
        action: "keep" as const,
        reason: "Mock fixture opening",
      },
    ],
    cuts: [],
    captions: [
      {
        id: "cap_1",
        start: 0.2,
        end: Math.min(2.5, take),
        text: "First cut (mock mode)",
        style: style.captionStyle,
        fontId: style.fontId,
        fontSize: 44,
        x: 0.5,
        y: 0.78,
        animation: "none" as const,
      },
    ],
    textOverlays: [],
    stickers:
      style.stickerUsage === "none"
        ? []
        : [
            {
              id: "stk_1",
              assetId: "heart",
              start: 0.4,
              end: Math.min(2, take),
              x: 0.82,
              y: 0.18,
              scale: 0.28,
              rotation: -8,
            },
          ],
    zooms:
      style.zoomFrequency === "none"
        ? []
        : [
            {
              id: "zoom_1",
              start: Math.min(1, take / 3),
              end: Math.min(2.2, take / 2),
              scale: 1.08,
              x: 0.5,
              y: 0.45,
            },
          ],
    music: style.musicTrackId
      ? {
          trackId: style.musicTrackId,
          volume: style.musicVolume,
          startAt: 0,
          fadeIn: 0.4,
          fadeOut: 0.8,
        }
      : null,
    styleNotes: "AI_MODE=mock fixture",
  };

  const validated = validateEditPlan(plan);
  if (!validated.success) throw new Error(validated.error);
  return normalizeEditPlan(validated.data, sourceDuration);
}

/**
 * Uploads the REAL MP4 to Gemini Files API, waits until ACTIVE,
 * then requests a structured EditPlan.
 */
export async function generateEditPlanWithGemini(
  input: GeminiEditInput
): Promise<{ plan: EditPlan; provider: "gemini" | "mock" }> {
  if (getAiMode() === "mock") {
    const plan = await loadMockEditPlan(
      input.sourceDuration,
      input.format,
      input.aestheticId
    );
    return { plan, provider: "mock" };
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY missing. Set the key or use AI_MODE=mock for offline fixtures."
    );
  }

  const abs = path.isAbsolute(input.videoPath)
    ? input.videoPath
    : path.join(/* turbopackIgnore: true */ process.cwd(), "storage", input.videoPath.replace(/^storage\//, ""));

  await fs.access(abs);

  const uploaded = await uploadAndWait(abs, input.mimeType || "video/mp4");
  const ai = getClient();
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const userText = input.improve
    ? `Improve this existing edit plan based on the instruction.
Instruction: ${input.improve.instruction}
Selection: ${JSON.stringify(input.improve.selection ?? null)}
Current plan: ${JSON.stringify(input.improve.currentPlan)}
Source duration: ${input.sourceDuration}
Creator prompt: ${input.prompt}
Return a full updated EditPlan JSON.`
    : `Creator prompt: ${input.prompt}
Source duration seconds: ${input.sourceDuration}
Aesthetic: ${input.aestheticId}
Create the first edit plan JSON now.`;

  const response = await ai.models.generateContent({
    model,
    contents: createUserContent([
      createPartFromUri(uploaded.uri, uploaded.mimeType),
      userText,
    ]),
    config: {
      systemInstruction: buildSystemPrompt(input.aestheticId, input.format),
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty edit plan.");
  }

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new Error("Gemini returned invalid JSON for the edit plan.");
  }

  const validated = validateEditPlan(parsed);
  if (!validated.success) {
    throw new Error(`Invalid Gemini edit plan: ${validated.error}`);
  }

  const plan = normalizeEditPlan(validated.data, input.sourceDuration);
  await saveFixture("last-edit-plan", plan);
  await saveFixture(`edit-plan-${Date.now()}`, {
    meta: {
      aestheticId: input.aestheticId,
      format: input.format,
      prompt: input.prompt,
      provider: "gemini",
      model,
    },
    plan,
  });

  return { plan, provider: "gemini" };
}
