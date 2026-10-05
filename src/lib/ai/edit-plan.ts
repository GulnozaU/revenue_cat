import type {
  AestheticId,
  EditPlan,
  Transcript,
  VideoAnalysis,
  VideoFormat,
} from "@/lib/types/edit-plan";
import { generateEditPlanViaProvider } from "@/lib/ai/provider";

export async function buildAnalysis(input: {
  duration: number;
  transcript?: Transcript;
}): Promise<VideoAnalysis> {
  const transcript: Transcript = input.transcript ?? {
    language: "und",
    fullText: "",
    duration: input.duration,
    provider: "silence-fallback",
    segments: [
      {
        id: "seg_1",
        start: 0,
        end: input.duration,
        text: "[full take]",
      },
    ],
  };

  return {
    transcript,
    silences: [],
    highlightCandidates: transcript.segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      score: 0.5,
      reason: "Segment",
    })),
  };
}

export type AiProvider = "mock" | "nvidia" | "gemini";

/**
 * Entry point used by the pipeline.
 * AI_MODE=mock → deterministic EditPlan (no external AI).
 * AI_MODE=real → NVIDIA → Gemini.
 */
export async function generateEditPlan(input: {
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  analysis: VideoAnalysis;
  sourceDuration: number;
  videoPath: string;
  videoBuffer: Buffer;
  mimeType: string;
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: { type: string; id?: string; start?: number; end?: number };
  };
  /** demo sessions stay on the scripted plan. try sessions call the real providers. */
  mode?: "mock" | "real";
}): Promise<{ plan: EditPlan; provider: AiProvider }> {
  return generateEditPlanViaProvider({
    prompt: input.prompt,
    format: input.format,
    aestheticId: input.aestheticId,
    sourceDuration: input.sourceDuration,
    videoPath: input.videoPath,
    videoBuffer: input.videoBuffer,
    mimeType: input.mimeType,
    improve: input.improve,
    mode: input.mode,
  });
}
