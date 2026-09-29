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
  aiProvider?: "gemini" | "mock";
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export function validateEditPlan(input: unknown):
  | { success: true; data: EditPlan }
  | { success: false; error: string } {
  const parsed = EditPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  return { success: true, data: parsed.data };
}

export function normalizeEditPlan(plan: EditPlan, sourceDuration: number): EditPlan {
  let cursor = 0;
  const clips = plan.clips
    .filter((c) => c.action !== "remove")
    .map((c, i) => {
      const sourceStart = clamp(c.sourceStart, 0, sourceDuration);
      const sourceEnd = clamp(c.sourceEnd, sourceStart + 0.05, sourceDuration);
      const speed = c.speed || 1;
      const len = (sourceEnd - sourceStart) / speed;
      const next = {
        ...c,
        id: c.id || `clip_${i + 1}`,
        sourceStart,
        sourceEnd,
        speed,
        action: "keep" as const,
        timelineStart: Number(cursor.toFixed(3)),
        timelineEnd: Number((cursor + len).toFixed(3)),
      };
      cursor += len;
      return next;
    });

  return {
    ...plan,
    sourceDuration,
    duration: Number(cursor.toFixed(3)) || plan.duration,
    clips,
    captions: plan.captions.map((c, i) => ({ ...c, id: c.id || `cap_${i + 1}` })),
    textOverlays: plan.textOverlays.map((t, i) => ({ ...t, id: t.id || `text_${i + 1}` })),
    stickers: plan.stickers.map((s, i) => ({ ...s, id: s.id || `stk_${i + 1}` })),
    zooms: plan.zooms.map((z, i) => ({ ...z, id: z.id || `zoom_${i + 1}` })),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export const PROCESSING_STAGES = [
  { id: "uploading", label: "Uploading footage" },
  { id: "probing", label: "Reading video metadata" },
  { id: "proxy", label: "Building edit proxy" },
  { id: "watching", label: "Gemini watching your video" },
  { id: "planning", label: "Building structured edit plan" },
  { id: "rendering", label: "Rendering preview with FFmpeg" },
] as const;

export type ProcessingStageId = (typeof PROCESSING_STAGES)[number]["id"];
