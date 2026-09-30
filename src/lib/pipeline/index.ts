import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ProjectRecord, VideoAsset } from "@/lib/types/edit-plan";
import { storagePath, toPublicApiUrl } from "@/lib/storage/paths";
import { buildAnalysis, generateEditPlan } from "@/lib/ai/edit-plan";
import { loadProject, saveProject, createProject } from "@/lib/projects/store";

export { createProject };

export type PipelineProgress = {
  stage:
    | "uploading"
    | "probing"
    | "proxy"
    | "watching"
    | "planning"
    | "rendering"
    | "done"
    | "error";
  message: string;
};

/**
 * Persist the uploaded MP4 for AI analysis.
 * Does NOT call system FFmpeg — metadata comes from the browser.
 */
export async function ingestUploadedFile(opts: {
  projectId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  duration: number;
  width: number;
  height: number;
  thumbnailDataUrl?: string;
}): Promise<VideoAsset> {
  const assetId = randomUUID();
  const ext = path.extname(opts.filename) || ".mp4";
  const dir = storagePath("uploads", opts.projectId);
  await fs.mkdir(dir, { recursive: true });

  const sourcePath = path.join(
    /* turbopackIgnore: true */ dir,
    `${assetId}${ext}`
  );
  await fs.writeFile(sourcePath, opts.buffer);

  let thumbnailUrl: string | undefined;
  let thumbnailPath: string | undefined;
  if (opts.thumbnailDataUrl?.startsWith("data:image")) {
    const thumbPath = path.join(dir, `${assetId}_thumb.jpg`);
    const b64 = opts.thumbnailDataUrl.split(",")[1];
    if (b64) {
      await fs.writeFile(thumbPath, Buffer.from(b64, "base64"));
      thumbnailPath = path
        .relative(storagePath(), thumbPath)
        .replace(/\\/g, "/");
      thumbnailUrl = toPublicApiUrl(`storage/${thumbnailPath}`);
    }
  }

  const rel = (abs: string) =>
    path.relative(storagePath(), abs).replace(/\\/g, "/");
  const sourceRel = rel(sourcePath);
  const sourceUrl = toPublicApiUrl(`storage/${sourceRel}`);

  return {
    id: assetId,
    filename: opts.filename,
    mimeType: opts.mimeType || "video/mp4",
    sourcePath: sourceRel,
    sourceUrl,
    duration: opts.duration || 1,
    width: opts.width || 1080,
    height: opts.height || 1920,
    fps: 30,
    sizeBytes: opts.buffer.byteLength,
    hasAudio: true,
    thumbnailPath,
    thumbnailUrl,
    // Browser uses the original File for rendering; these point at source
    proxyPath: sourceRel,
    proxyUrl: sourceUrl,
  };
}

/**
 * AI-only pipeline: NVIDIA (primary) → Gemini (fallback) → EditPlan.
 * Preview/export rendering happens in the browser via ffmpeg.wasm.
 */
export async function runProjectPipeline(
  projectId: string,
  videoBuffer: Buffer,
  onProgress?: (p: PipelineProgress) => void
): Promise<ProjectRecord> {
  const project = await loadProject(projectId);
  if (!project) throw new Error("Project not found");
  if (!project.assets[0]) throw new Error("No video asset");

  const asset = project.assets[0];
  const sourceAbs = storagePath(asset.sourcePath);

  try {
    project.status = "processing";
    await saveProject(project);

    onProgress?.({ stage: "proxy", message: "Preparing media metadata" });
    const analysis = await buildAnalysis({ duration: asset.duration });
    project.analysis = analysis;

    onProgress?.({
      stage: "watching",
      message: "Analyzing your footage…",
    });
    onProgress?.({
      stage: "planning",
      message: "Creating your first edit…",
    });

    const { plan, provider } = await generateEditPlan({
      prompt: project.prompt,
      format: project.format,
      aestheticId: project.aestheticId,
      analysis,
      sourceDuration: asset.duration,
      videoPath: sourceAbs,
      videoBuffer,
      mimeType: asset.mimeType,
    });

    project.editPlan = plan;
    project.aiProvider = provider;
    // Rendering is client-side — mark ready once plan validates
    project.status = "ready";
    project.error = undefined;
    // Clear stale server render URLs; browser will set blob preview
    project.previewPath = undefined;
    project.previewUrl = undefined;
    project.exportPath = undefined;
    project.exportUrl = undefined;
    await saveProject(project);
    onProgress?.({ stage: "done", message: "Edit plan ready" });
    return project;
  } catch (err) {
    project.status = "error";
    project.error = err instanceof Error ? err.message : "Pipeline failed";
    await saveProject(project);
    onProgress?.({ stage: "error", message: project.error });
    throw err;
  }
}
