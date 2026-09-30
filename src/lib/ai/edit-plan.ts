import type {
  AestheticId,
  EditPlan,
  Transcript,
  VideoAnalysis,
  VideoFormat,
} from "@/lib/types/edit-plan";
import { generateEditPlanWithNvidia } from "@/lib/ai/nvidia";
import { generateEditPlanWithGemini } from "@/lib/ai/gemini";

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

export type AiProvider = "nvidia" | "gemini";

/**
 * NVIDIA primary → Gemini fallback.
 * Never returns a mock/fake EditPlan.
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
}): Promise<{ plan: EditPlan; provider: AiProvider }> {
  const shared = {
    mimeType: input.mimeType,
    prompt: input.prompt,
    format: input.format,
    aestheticId: input.aestheticId,
    sourceDuration: input.sourceDuration,
    improve: input.improve,
  };

  let nvidiaError: string | null = null;

  // Large base64 payloads are unreliable on serverless; prefer Gemini Files for big videos
  const tooLargeForNvidiaInline = input.videoBuffer.byteLength > 12 * 1024 * 1024;

  if (process.env.NVIDIA_API_KEY && !tooLargeForNvidiaInline) {
    try {
      return await generateEditPlanWithNvidia({
        ...shared,
        videoBuffer: input.videoBuffer,
      });
    } catch (err) {
      nvidiaError = err instanceof Error ? err.message : String(err);
      console.warn("[ai] NVIDIA failed, trying Gemini fallback:", nvidiaError);
    }
  } else if (!process.env.NVIDIA_API_KEY) {
    nvidiaError = "NVIDIA_API_KEY is missing.";
    console.warn("[ai] Skipping NVIDIA —", nvidiaError);
  } else {
    nvidiaError =
      "Video exceeds NVIDIA inline size limit; using Gemini Files API.";
    console.warn("[ai]", nvidiaError);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      [
        nvidiaError
          ? `NVIDIA analysis failed: ${nvidiaError}`
          : "NVIDIA analysis failed.",
        "Gemini fallback failed: GEMINI_API_KEY is missing.",
      ].join(" ")
    );
  }

  try {
    return await generateEditPlanWithGemini({
      ...shared,
      videoPath: input.videoPath,
      videoBuffer: input.videoBuffer,
    });
  } catch (err) {
    const geminiMsg = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        nvidiaError
          ? `NVIDIA analysis failed: ${nvidiaError}`
          : "NVIDIA analysis failed.",
        geminiMsg.startsWith("Gemini")
          ? geminiMsg
          : `Gemini fallback failed: ${geminiMsg}`,
      ].join(" ")
    );
  }
}
