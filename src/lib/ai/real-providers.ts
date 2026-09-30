/**
 * Real AI path — NVIDIA primary, Gemini fallback.
 * Only imported when AI_MODE=real.
 */
import type { GenerateEditPlanInput, GenerateEditPlanResult } from "@/lib/ai/provider";
import { generateEditPlanWithNvidia } from "@/lib/ai/nvidia-provider";
import { generateEditPlanWithGemini } from "@/lib/ai/gemini-provider";

export async function generateEditPlanWithRealProviders(
  input: GenerateEditPlanInput
): Promise<GenerateEditPlanResult> {
  if (!input.videoBuffer) {
    throw new Error("videoBuffer required for real AI analysis.");
  }

  const shared = {
    mimeType: input.mimeType || "video/mp4",
    prompt: input.prompt,
    format: input.format,
    aestheticId: input.aestheticId,
    sourceDuration: input.sourceDuration,
    improve: input.improve,
  };

  let nvidiaError: string | null = null;
  const tooLarge = input.videoBuffer.byteLength > 12 * 1024 * 1024;

  if (process.env.NVIDIA_API_KEY && !tooLarge) {
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
  } else {
    nvidiaError = "Video exceeds NVIDIA inline size limit.";
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
      videoPath: input.videoPath || "upload.mp4",
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
