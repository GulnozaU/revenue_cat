import type { AestheticId, EditPlan, VideoFormat } from "@/lib/types/edit-plan";
import {
  FORMAT_PRESETS,
  normalizeEditPlan,
  validateEditPlan,
} from "@/lib/types/edit-plan";

export type AiMode = "mock" | "real";

export function getAiMode(): AiMode {
  const mode = (process.env.AI_MODE ?? "mock").toLowerCase();
  return mode === "real" ? "real" : "mock";
}

export type GenerateEditPlanInput = {
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  sourceDuration: number;
  videoPath?: string;
  videoBuffer?: Buffer;
  mimeType?: string;
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: { type: string; id?: string; start?: number; end?: number };
  };
};

export type GenerateEditPlanResult = {
  plan: EditPlan;
  provider: "mock" | "nvidia" | "gemini";
};

/**
 * Route to mock (Shipathon demo) or real NVIDIA→Gemini providers.
 */
export async function generateEditPlanViaProvider(
  input: GenerateEditPlanInput
): Promise<GenerateEditPlanResult> {
  if (getAiMode() === "mock") {
    const { generateEditPlanWithMock } = await import("@/lib/ai/mock-provider");
    return generateEditPlanWithMock(input);
  }

  const { generateEditPlanWithRealProviders } = await import(
    "@/lib/ai/real-providers"
  );
  return generateEditPlanWithRealProviders(input);
}

export function assertValidPlan(
  plan: EditPlan,
  sourceDuration: number
): EditPlan {
  const validated = validateEditPlan(plan);
  if (!validated.success) {
    throw new Error(`Invalid edit plan: ${validated.error}`);
  }
  return normalizeEditPlan(validated.data, sourceDuration);
}

export { FORMAT_PRESETS };
