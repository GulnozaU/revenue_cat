import { promises as fs } from "fs";
import path from "path";
import type {
  AestheticId,
  EditPlan,
  VideoFormat,
} from "@/lib/types/edit-plan";
import { normalizeEditPlan, validateEditPlan } from "@/lib/types/edit-plan";
import {
  buildEditPlanSystemPrompt,
  buildEditPlanUserText,
  extractJson,
} from "@/lib/ai/prompt";
import { getStorageRoot } from "@/lib/storage/paths";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

export type NvidiaEditInput = {
  videoBuffer: Buffer;
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

function getApiKey() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key?.trim()) {
    throw new Error("NVIDIA_API_KEY is missing.");
  }
  return key.trim();
}

async function saveFixture(name: string, data: unknown) {
  try {
    const dir = path.join(/* turbopackIgnore: true */ getStorageRoot(), "fixtures");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${name}.json`),
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch {
    /* fixtures are best-effort on serverless */
  }
}

/**
 * Primary AI: NVIDIA Nemotron Omni watches the actual video via chat/completions.
 */
export async function generateEditPlanWithNvidia(
  input: NvidiaEditInput
): Promise<{ plan: EditPlan; provider: "nvidia" }> {
  const apiKey = getApiKey();
  const model = process.env.NVIDIA_MODEL ?? DEFAULT_MODEL;
  const mime = input.mimeType || "video/mp4";
  const b64 = input.videoBuffer.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;

  const system = buildEditPlanSystemPrompt(input.aestheticId, input.format);
  const userText = buildEditPlanUserText({
    prompt: input.prompt,
    sourceDuration: input.sourceDuration,
    aestheticId: input.aestheticId,
    improve: input.improve,
  });

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          {
            type: "video_url",
            video_url: { url: dataUrl },
          },
          { type: "text", text: userText },
        ],
      },
    ],
    temperature: 0,
    top_p: 0.95,
    max_tokens: 8192,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
    // Prefer video-only first — audio-in-video fails on some MP4s
    mm_processor_kwargs: { use_audio_in_video: false },
  };

  let res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "NVCF-POLL-SECONDS": "1800",
    },
    body: JSON.stringify(body),
  });

  // Retry once with audio track enabled if the video-only call fails for non-audio reasons
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const audioFail = /Failed to load audio|audio/i.test(errText);
    if (!audioFail) {
      // try with audio
      res = await fetch(NVIDIA_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "NVCF-POLL-SECONDS": "1800",
        },
        body: JSON.stringify({
          ...body,
          mm_processor_kwargs: { use_audio_in_video: true },
        }),
      });
      if (!res.ok) {
        const err2 = await res.text().catch(() => "");
        throw new Error(
          `NVIDIA analysis failed (${res.status}): ${(err2 || errText).slice(0, 400) || res.statusText}`
        );
      }
    } else {
      throw new Error(
        `NVIDIA analysis failed (${res.status}): ${errText.slice(0, 400) || res.statusText}`
      );
    }
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("NVIDIA analysis failed: empty edit plan.");
  }

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new Error("NVIDIA analysis failed: invalid JSON for the edit plan.");
  }

  const validated = validateEditPlan(parsed);
  if (!validated.success) {
    throw new Error(`NVIDIA analysis failed: invalid edit plan — ${validated.error}`);
  }

  const plan = normalizeEditPlan(validated.data, input.sourceDuration);
  if (plan.clips.length === 0) {
    throw new Error("NVIDIA analysis failed: no usable clips.");
  }

  await saveFixture("last-edit-plan", plan);
  await saveFixture(`edit-plan-${Date.now()}`, {
    meta: {
      aestheticId: input.aestheticId,
      format: input.format,
      prompt: input.prompt,
      provider: "nvidia",
      model,
    },
    plan,
  });

  return { plan, provider: "nvidia" };
}
