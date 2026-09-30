import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";
import type {
  AestheticId,
  EditPlan,
  VideoFormat,
} from "@/lib/types/edit-plan";
import {
  normalizeEditPlan,
  validateEditPlan,
} from "@/lib/types/edit-plan";
import {
  buildEditPlanSystemPrompt,
  buildEditPlanUserText,
  extractJson,
} from "@/lib/ai/prompt";
import { getStorageRoot } from "@/lib/storage/paths";

export type GeminiEditInput = {
  /** Absolute path OR relative storage path to the video file */
  videoPath: string;
  /** Optional in-memory bytes (preferred when path may be ephemeral) */
  videoBuffer?: Buffer;
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

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveVideoFile(
  input: GeminiEditInput
): Promise<{ path: string; cleanup?: string }> {
  if (input.videoBuffer) {
    const dir = path.join(/* turbopackIgnore: true */ getStorageRoot(), "tmp");
    await fs.mkdir(dir, { recursive: true });
    const tmp = path.join(dir, `gemini_${Date.now()}.mp4`);
    await fs.writeFile(tmp, input.videoBuffer);
    return { path: tmp, cleanup: tmp };
  }

  const abs = path.isAbsolute(input.videoPath)
    ? input.videoPath
    : path.join(
        /* turbopackIgnore: true */ getStorageRoot(),
        input.videoPath.replace(/^storage\//, "")
      );
  await fs.access(abs);
  return { path: abs };
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
    /* best-effort */
  }
}

/**
 * Secondary AI: Gemini Files API watches the actual MP4.
 * No mock mode — real analysis only.
 */
export async function generateEditPlanWithGemini(
  input: GeminiEditInput
): Promise<{ plan: EditPlan; provider: "gemini" }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini fallback failed: GEMINI_API_KEY missing.");
  }

  const resolved = await resolveVideoFile(input);
  try {
    const uploaded = await uploadAndWait(
      resolved.path,
      input.mimeType || "video/mp4"
    );
    const ai = getClient();
    const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

    const userText = buildEditPlanUserText({
      prompt: input.prompt,
      sourceDuration: input.sourceDuration,
      aestheticId: input.aestheticId,
      improve: input.improve,
    });

    const response = await generateContentWithRetry(ai, {
      model,
      contents: createUserContent([
        createPartFromUri(uploaded.uri, uploaded.mimeType),
        userText,
      ]),
      config: {
        systemInstruction: buildEditPlanSystemPrompt(
          input.aestheticId,
          input.format
        ),
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text?.trim()) {
      throw new Error("Gemini fallback failed: empty edit plan.");
    }

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      throw new Error("Gemini fallback failed: invalid JSON for the edit plan.");
    }

    const validated = validateEditPlan(parsed);
    if (!validated.success) {
      throw new Error(
        `Gemini fallback failed: invalid edit plan — ${validated.error}`
      );
    }

    const plan = normalizeEditPlan(validated.data, input.sourceDuration);
    if (plan.clips.length === 0) {
      throw new Error("Gemini fallback failed: no usable clips.");
    }

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
  } finally {
    if (resolved.cleanup) {
      await fs.unlink(resolved.cleanup).catch(() => undefined);
    }
  }
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  args: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  attempts = 4
) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContent(args);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /503|UNAVAILABLE|high demand|temporar|rate limit|429/i.test(msg);
      if (!retryable || i === attempts - 1) break;
      const waitMs = 2000 * Math.pow(2, i);
      console.warn(
        `[gemini] transient error, retry ${i + 1}/${attempts - 1} in ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (/503|UNAVAILABLE|high demand/i.test(msg)) {
    throw new Error(
      "Gemini fallback failed: model is busy (high demand). Try again shortly."
    );
  }
  throw new Error(
    `Gemini fallback failed. ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}
