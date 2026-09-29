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
  { label: string; aspect: string; width: number; height: number; ratio: string }
> = {
  instagram_reel: {
    label: "Reels",
    aspect: "9:16",
    width: 1080,
    height: 1920,
    ratio: "vertical_9_16",
  },
  tiktok: {
    label: "TikTok",
    aspect: "9:16",
    width: 1080,
    height: 1920,
    ratio: "vertical_9_16",
  },
  youtube_short: {
    label: "Shorts",
    aspect: "9:16",
    width: 1080,
    height: 1920,
    ratio: "vertical_9_16",
  },
  youtube_landscape: {
    label: "YouTube",
    aspect: "16:9",
    width: 1920,
    height: 1080,
    ratio: "landscape_16_9",
  },
};

export const CaptionStyleSchema = z.enum([
  "clean_bold",
  "minimal",
  "kinetic",
  "boxed",
  "outline",
]);

export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

export const ClipSchema = z
  .object({
    id: z.string().optional(),
    sourceId: z.string().optional(),
    sourceStart: z.number().min(0),
    sourceEnd: z.number().min(0),
    timelineStart: z.number().min(0),
    timelineEnd: z.number().min(0),
    speed: z.number().min(0.25).max(4).default(1),
    reason: z.string().optional(),
  })
  .refine((c) => c.sourceEnd > c.sourceStart, {
    message: "sourceEnd must be greater than sourceStart",
  })
  .refine((c) => c.timelineEnd > c.timelineStart, {
    message: "timelineEnd must be greater than timelineStart",
  });

export type Clip = z.infer<typeof ClipSchema>;

export const CaptionSchema = z
  .object({
    id: z.string().optional(),
    start: z.number().min(0),
    end: z.number().min(0),
    text: z.string().min(1).max(200),
    style: CaptionStyleSchema.default("clean_bold"),
    fontSize: z.number().min(12).max(96).optional(),
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
  })
  .refine((c) => c.end > c.start, {
    message: "caption end must be greater than start",
  });

export type Caption = z.infer<typeof CaptionSchema>;

export const ZoomSchema = z
  .object({
    id: z.string().optional(),
    start: z.number().min(0),
    end: z.number().min(0),
    scale: z.number().min(1).max(2).default(1.08),
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
  })
  .refine((zItem) => zItem.end > zItem.start, {
    message: "zoom end must be greater than start",
  });

export type Zoom = z.infer<typeof ZoomSchema>;

export const TextOverlaySchema = z.object({
  id: z.string().optional(),
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string().min(1).max(120),
  fontFamily: z.string().default("Syne"),
  fontSize: z.number().min(16).max(120).default(48),
  color: z.string().default("#FFFFFF"),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.2),
});

export type TextOverlay = z.infer<typeof TextOverlaySchema>;

export const MusicSchema = z.object({
  trackId: z.string(),
  volume: z.number().min(0).max(1).default(0.12),
  fadeIn: z.number().min(0).max(5).optional(),
  fadeOut: z.number().min(0).max(5).optional(),
});

export type Music = z.infer<typeof MusicSchema>;

export const EditPlanSchema = z.object({
  format: z.enum(["vertical_9_16", "landscape_16_9"]),
  duration: z.number().positive(),
  clips: z.array(ClipSchema).min(1),
  captions: z.array(CaptionSchema).default([]),
  zooms: z.array(ZoomSchema).default([]),
  texts: z.array(TextOverlaySchema).default([]),
  music: MusicSchema.nullable().optional(),
  styleNotes: z.string().optional(),
});

export type EditPlan = z.infer<typeof EditPlanSchema>;

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
  words?: TranscriptWord[];
};

export type Transcript = {
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
  duration: number;
  provider: "mock" | "openai" | "deepgram";
};

export type SilenceRegion = {
  start: number;
  end: number;
  duration: number;
};

export type SceneBoundary = {
  time: number;
  confidence: number;
};

export type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec?: string;
  sizeBytes?: number;
};

export type VideoAnalysis = {
  metadata: VideoMetadata;
  transcript: Transcript;
  silences: SilenceRegion[];
  scenes: SceneBoundary[];
  highlightCandidates: Array<{
    start: number;
    end: number;
    score: number;
    reason: string;
  }>;
};

export type MediaAsset = {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  width?: number;
  height?: number;
  sizeBytes: number;
};

export type ProjectStatus =
  | "draft"
  | "uploading"
  | "analyzing"
  | "planning"
  | "rendering"
  | "ready"
  | "exporting"
  | "error";

export type Project = {
  id: string;
  name: string;
  format: VideoFormat;
  prompt: string;
  assets: MediaAsset[];
  analysis?: VideoAnalysis;
  editPlan?: EditPlan;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  previewUrl?: string;
  exportUrl?: string;
};

export type ProcessingStage =
  | "uploading"
  | "understanding"
  | "moments"
  | "building"
  | "captions"
  | "rendering";

export const PROCESSING_STAGES: Array<{
  id: ProcessingStage;
  label: string;
}> = [
  { id: "uploading", label: "Uploading footage" },
  { id: "understanding", label: "Understanding your video" },
  { id: "moments", label: "Finding the best moments" },
  { id: "building", label: "Building your edit" },
  { id: "captions", label: "Styling captions" },
  { id: "rendering", label: "Rendering preview" },
];

/** Ensure clips have ids and are sorted; clamp to source duration. */
export function normalizeEditPlan(
  plan: EditPlan,
  sourceDuration: number
): EditPlan {
  const clips = plan.clips
    .map((clip, i) => ({
      ...clip,
      id: clip.id ?? `clip_${i + 1}`,
      sourceStart: clampNum(clip.sourceStart, 0, sourceDuration),
      sourceEnd: clampNum(clip.sourceEnd, 0, sourceDuration),
      speed: clip.speed ?? 1,
    }))
    .filter((c) => c.sourceEnd - c.sourceStart > 0.05)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  const captions = plan.captions.map((c, i) => ({
    ...c,
    id: c.id ?? `cap_${i + 1}`,
    fontSize: c.fontSize ?? 42,
    x: c.x ?? 0.5,
    y: c.y ?? 0.78,
  }));

  const zooms = plan.zooms.map((zItem, i) => ({
    ...zItem,
    id: zItem.id ?? `zoom_${i + 1}`,
  }));

  const texts = (plan.texts ?? []).map((t, i) => ({
    ...t,
    id: t.id ?? `text_${i + 1}`,
  }));

  const duration =
    clips.length > 0
      ? Math.max(...clips.map((c) => c.timelineEnd))
      : plan.duration;

  return {
    ...plan,
    duration,
    clips,
    captions,
    zooms,
    texts,
  };
}

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function validateEditPlan(input: unknown): {
  success: true;
  data: EditPlan;
} | {
  success: false;
  error: string;
} {
  const parsed = EditPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { success: true, data: parsed.data };
}
