import { z } from "zod";

export const VideoFormatSchema = z.enum([
  "instagram_reel",
  "tiktok",
  "youtube_short",
  "youtube_landscape",
]);
export type VideoFormat = z.infer<typeof VideoFormatSchema>;

export const FORMAT_PRESETS: Record<
  VideoFormat,
  { label: string; aspect: string; width: number; height: number; ratio: "vertical_9_16" | "landscape_16_9" }
> = {
  instagram_reel: { label: "Reels", aspect: "9:16", width: 1080, height: 1920, ratio: "vertical_9_16" },
  tiktok: { label: "TikTok", aspect: "9:16", width: 1080, height: 1920, ratio: "vertical_9_16" },
  youtube_short: { label: "Shorts", aspect: "9:16", width: 1080, height: 1920, ratio: "vertical_9_16" },
  youtube_landscape: { label: "YouTube", aspect: "16:9", width: 1920, height: 1080, ratio: "landscape_16_9" },
};

export const AestheticIdSchema = z.enum([
  "cute",
  "vlog",
  "clean_lifestyle",
  "fast_paced",
  "cinematic",
  "educational",
  "food",
  "travel",
]);
export type AestheticId = z.infer<typeof AestheticIdSchema>;

export type VideoAsset = {
  id: string;
  filename: string;
  mimeType: string;
  sourcePath: string;
  sourceUrl: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  sizeBytes: number;
  hasAudio: boolean;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  proxyPath?: string;
  proxyUrl?: string;
  audioPath?: string;
};

export const ClipSchema = z
  .object({
    id: z.string(),
    sourceId: z.string().optional(),
    sourceStart: z.number().min(0),
    sourceEnd: z.number().min(0),
    timelineStart: z.number().min(0),
    timelineEnd: z.number().min(0),
    speed: z.number().min(0.25).max(4).default(1),
    action: z.enum(["keep", "remove"]).default("keep"),
    reason: z.string().optional(),
  })
  .refine((c) => c.sourceEnd > c.sourceStart, { message: "Invalid clip source range" })
  .refine((c) => c.timelineEnd > c.timelineStart, { message: "Invalid clip timeline range" });

export type Clip = z.infer<typeof ClipSchema>;

export const CaptionSchema = z
  .object({
    id: z.string(),
    start: z.number().min(0),
    end: z.number().min(0),
    text: z.string().min(1).max(240),
    style: z
      .enum(["clean_bold", "minimal", "kinetic", "boxed", "outline", "soft_bold"])
      .default("clean_bold"),
    fontId: z.string().default("arial_bold"),
    fontSize: z.number().min(16).max(120).default(48),
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.78),
    animation: z.enum(["none", "pop", "fade"]).default("none"),
  })
  .refine((c) => c.end > c.start, { message: "Invalid caption range" });

export type Caption = z.infer<typeof CaptionSchema>;

export const TextOverlaySchema = z.object({
  id: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string().min(1).max(120),
  fontId: z.string().default("arial_bold"),
  fontSize: z.number().min(16).max(140).default(56),
  color: z.string().default("#FFFFFF"),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.2),
});
export type TextOverlay = z.infer<typeof TextOverlaySchema>;

export const StickerSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  x: z.number().min(0).max(1).default(0.8),
  y: z.number().min(0).max(1).default(0.2),
  scale: z.number().min(0.1).max(3).default(0.35),
  rotation: z.number().min(-180).max(180).default(0),
});
export type Sticker = z.infer<typeof StickerSchema>;

export const ZoomSchema = z
  .object({
    id: z.string(),
    start: z.number().min(0),
    end: z.number().min(0),
    scale: z.number().min(1).max(2).default(1.08),
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
  })
  .refine((zItem) => zItem.end > zItem.start, { message: "Invalid zoom range" });
export type Zoom = z.infer<typeof ZoomSchema>;

export const MusicSchema = z.object({
  trackId: z.string(),
  volume: z.number().min(0).max(1).default(0.15),
  startAt: z.number().min(0).default(0),
  fadeIn: z.number().min(0).max(5).default(0.4),
  fadeOut: z.number().min(0).max(5).default(0.8),
});
export type Music = z.infer<typeof MusicSchema>;

export const EditPlanSchema = z.object({
  sourceDuration: z.number().positive(),
  format: z.enum(["vertical_9_16", "landscape_16_9"]),
  aestheticId: AestheticIdSchema.default("clean_lifestyle"),
  duration: z.number().positive(),
  clips: z.array(ClipSchema).min(1),
  cuts: z
    .array(
      z.object({
        at: z.number().min(0),
        type: z.enum(["hard", "fade"]).default("hard"),
      })
    )
    .default([]),
  captions: z.array(CaptionSchema).default([]),
  textOverlays: z.array(TextOverlaySchema).default([]),
  stickers: z.array(StickerSchema).default([]),
  zooms: z.array(ZoomSchema).default([]),
  music: MusicSchema.nullable().default(null),
  styleNotes: z.string().optional(),
});

export type EditPlan = z.infer<typeof EditPlanSchema>;

export type TranscriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type Transcript = {
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
  duration: number;
  provider: "openai" | "local-whisper" | "silence-fallback";
};

export type SilenceRegion = { start: number; end: number; duration: number };

export type VideoAnalysis = {
  transcript: Transcript;
  silences: SilenceRegion[];
  highlightCandidates: Array<{
    start: number;
    end: number;
    score: number;
    reason: string;
  }>;
};

export type ProjectStatus =
  | "draft"
  | "uploading"
  | "processing"
  | "ready"
  | "rendering"
  | "error";

export type ProjectRecord = {
  id: string;
  name: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  prompt: string;
  assets: VideoAsset[];
  analysis?: VideoAnalysis;
  editPlan?: EditPlan;
  status: ProjectStatus;
  previewPath?: string;
  previewUrl?: string;
  exportPath?: string;
  exportUrl?: string;
  aiProvider?: "nvidia" | "gemini";
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export function validateEditPlan(input: unknown):
  | { success: true; data: EditPlan }
  | { success: false; error: string } {
  const sanitized = sanitizeRawEditPlan(input);
  const parsed = EditPlanSchema.safeParse(sanitized);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  return { success: true, data: parsed.data };
}

/** Soften LLM JSON before Zod so minor shape issues don't reject the whole plan. */
function sanitizeRawEditPlan(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const plan = { ...(input as Record<string, unknown>) };

  if (Array.isArray(plan.captions)) {
    plan.captions = plan.captions.map((c) => {
      if (!c || typeof c !== "object") return c;
      const cap = { ...(c as Record<string, unknown>) };
      if (typeof cap.text === "string") cap.text = cap.text.slice(0, 240);
      return cap;
    });
  }

  if (Array.isArray(plan.textOverlays)) {
    plan.textOverlays = plan.textOverlays.map((t) => {
      if (!t || typeof t !== "object") return t;
      const row = { ...(t as Record<string, unknown>) };
      if (typeof row.text === "string") row.text = row.text.slice(0, 120);
      return row;
    });
  }

  // LLMs often emit cuts as strings, timestamps under wrong keys, or empty objects
  if (Array.isArray(plan.cuts)) {
    plan.cuts = plan.cuts
      .map((cut) => {
        if (typeof cut === "number") {
          return { at: cut, type: "hard" as const };
        }
        if (!cut || typeof cut !== "object") return null;
        const row = cut as Record<string, unknown>;
        const atRaw =
          row.at ?? row.time ?? row.timestamp ?? row.t ?? row.position ?? row.start;
        const at = typeof atRaw === "number" ? atRaw : Number(atRaw);
        if (!Number.isFinite(at) || at < 0) return null;
        const typeRaw = String(row.type ?? "hard").toLowerCase();
        const type = typeRaw === "fade" ? "fade" : "hard";
        return { at, type };
      })
      .filter(Boolean);
  } else {
    plan.cuts = [];
  }

  // Drop null music / coerce empty string
  if (plan.music === "" || plan.music === undefined) {
    plan.music = null;
  }

  return plan;
}

const MIN_CLIP_SEC = 0.2;

export function normalizeEditPlan(plan: EditPlan, sourceDuration: number): EditPlan {
  const safeDuration = Math.max(0.5, sourceDuration || plan.sourceDuration || 1);

  let clips = (plan.clips ?? [])
    .filter((c) => c.action !== "remove")
    .map((c, i) => {
      let sourceStart = Number(c.sourceStart);
      let sourceEnd = Number(c.sourceEnd);
      if (!Number.isFinite(sourceStart)) sourceStart = 0;
      if (!Number.isFinite(sourceEnd)) sourceEnd = sourceStart + 1;

      sourceStart = clamp(sourceStart, 0, Math.max(0, safeDuration - MIN_CLIP_SEC));
      sourceEnd = clamp(sourceEnd, sourceStart + MIN_CLIP_SEC, safeDuration);
      // Re-clamp start if end couldn't grow (near EOF)
      if (sourceEnd - sourceStart < MIN_CLIP_SEC) {
        sourceEnd = safeDuration;
        sourceStart = Math.max(0, sourceEnd - Math.max(MIN_CLIP_SEC, 1));
      }

      const speed = Math.min(4, Math.max(0.25, c.speed || 1));
      return {
        ...c,
        id: c.id || `clip_${i + 1}`,
        sourceStart: Number(sourceStart.toFixed(3)),
        sourceEnd: Number(sourceEnd.toFixed(3)),
        speed,
        action: "keep" as const,
        timelineStart: 0,
        timelineEnd: 0,
      };
    })
    .filter((c) => c.sourceEnd - c.sourceStart >= MIN_CLIP_SEC - 0.001);

  if (clips.length === 0) {
    const take = Math.min(safeDuration, 12);
    clips = [
      {
        id: "clip_1",
        sourceStart: 0,
        sourceEnd: take,
        timelineStart: 0,
        timelineEnd: take,
        speed: 1,
        action: "keep",
        reason: "Fallback full take",
      },
    ];
  }

  let cursor = 0;
  clips = clips.map((c, i) => {
    const len = (c.sourceEnd - c.sourceStart) / (c.speed || 1);
    const next = {
      ...c,
      id: c.id || `clip_${i + 1}`,
      timelineStart: Number(cursor.toFixed(3)),
      timelineEnd: Number((cursor + len).toFixed(3)),
    };
    cursor += len;
    return next;
  });

  const duration = Number(cursor.toFixed(3));

  return {
    ...plan,
    sourceDuration: safeDuration,
    duration,
    clips,
    captions: (plan.captions ?? [])
      .map((c, i) => ({
        ...c,
        id: c.id || `cap_${i + 1}`,
        text: String(c.text ?? "").slice(0, 240),
        start: clamp(c.start, 0, duration),
        end: clamp(c.end, 0, duration),
      }))
      .filter((c) => c.end - c.start >= 0.1 && c.text.trim().length > 0),
    textOverlays: (plan.textOverlays ?? [])
      .map((t, i) => ({
        ...t,
        id: t.id || `text_${i + 1}`,
        text: String(t.text ?? "").slice(0, 120),
        start: clamp(t.start, 0, duration),
        end: clamp(t.end, 0, duration),
      }))
      .filter((t) => t.end - t.start >= 0.1 && t.text.trim().length > 0),
    stickers: (plan.stickers ?? [])
      .map((s, i) => ({
        ...s,
        id: s.id || `stk_${i + 1}`,
        start: clamp(s.start, 0, duration),
        end: clamp(s.end, 0, duration),
      }))
      .filter((s) => s.end - s.start >= 0.1),
    zooms: (plan.zooms ?? [])
      .map((z, i) => ({
        ...z,
        id: z.id || `zoom_${i + 1}`,
        start: clamp(z.start, 0, duration),
        end: clamp(z.end, 0, duration),
      }))
      .filter((z) => z.end - z.start >= 0.1),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export const PROCESSING_STAGES = [
  { id: "uploading", label: "Uploading footage" },
  { id: "probing", label: "Reading video metadata" },
  { id: "proxy", label: "Preparing for analysis" },
  { id: "watching", label: "NVIDIA watching your video" },
  { id: "planning", label: "Building structured edit plan" },
  { id: "rendering", label: "Rendering preview in browser" },
] as const;

export type ProcessingStageId = (typeof PROCESSING_STAGES)[number]["id"];
