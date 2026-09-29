import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  AestheticId,
  ProjectRecord,
  VideoAsset,
  VideoFormat,
} from "@/lib/types/edit-plan";
import {
  assertFfmpeg,
  extractAudioWav,
  generateProxy,
  generateThumbnail,
  probeVideo,
  storagePath,
  toPublicApiUrl,
} from "@/lib/ffmpeg/media";
import { transcribeAudio } from "@/lib/transcription";
import { buildAnalysis, generateEditPlan } from "@/lib/ai/edit-plan";
import { renderEditPlan } from "@/lib/ffmpeg/render";
import { loadProject, saveProject } from "@/lib/projects/store";

export type PipelineProgress = {
  stage:
    | "uploading"
    | "probing"
    | "proxy"
    | "transcribing"
    | "analyzing"
    | "planning"
    | "rendering"
    | "done"
    | "error";
  message: string;
};

export async function ingestUploadedFile(opts: {
  projectId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<VideoAsset> {
  await assertFfmpeg();
  const assetId = randomUUID();
  const ext = path.extname(opts.filename) || ".mp4";
  const dir = storagePath("uploads", opts.projectId);
  await fs.mkdir(dir, { recursive: true });

  const sourcePath = path.join(/* turbopackIgnore: true */ dir, `${assetId}${ext}`);
  await fs.writeFile(sourcePath, opts.buffer);

  const meta = await probeVideo(sourcePath);
  const thumbPath = path.join(dir, `${assetId}_thumb.jpg`);
  const proxyPath = path.join(dir, `${assetId}_proxy.mp4`);
  const audioPath = path.join(dir, `${assetId}_audio.wav`);

  await generateThumbnail(sourcePath, thumbPath, Math.min(1, meta.duration / 4));
  await generateProxy(sourcePath, proxyPath);
  if (meta.hasAudio) {
    await extractAudioWav(sourcePath, audioPath);
  } else {
    // Create silent wav matching duration for pipeline continuity
    const { runFfmpeg } = await import("@/lib/ffmpeg/media");
    await runFfmpeg([
      "-y",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=16000:cl=mono`,
      "-t",
      String(meta.duration || 1),
      audioPath,
    ]);
  }

  const rel = (abs: string) => path.relative(storagePath(), abs).replace(/\\/g, "/");

  return {
    id: assetId,
    filename: opts.filename,
    mimeType: opts.mimeType || "video/mp4",
    sourcePath: rel(sourcePath),
    sourceUrl: toPublicApiUrl(`storage/${rel(sourcePath)}`),
    duration: meta.duration,
    width: meta.width,
    height: meta.height,
    fps: meta.fps,
    sizeBytes: meta.sizeBytes || opts.buffer.byteLength,
    hasAudio: meta.hasAudio,
    thumbnailPath: rel(thumbPath),
    thumbnailUrl: toPublicApiUrl(`storage/${rel(thumbPath)}`),
    proxyPath: rel(proxyPath),
    proxyUrl: toPublicApiUrl(`storage/${rel(proxyPath)}`),
    audioPath: rel(audioPath),
  };
}

export async function runProjectPipeline(
  projectId: string,
  onProgress?: (p: PipelineProgress) => void
): Promise<ProjectRecord> {
  const project = await loadProject(projectId);
  if (!project) throw new Error("Project not found");
  if (!project.assets[0]) throw new Error("No video asset");

  const asset = project.assets[0];
  const sourceAbs = storagePath(asset.sourcePath);
  const audioAbs = storagePath(asset.audioPath!);

  try {
    project.status = "processing";
    await saveProject(project);

    onProgress?.({ stage: "transcribing", message: "Transcribing speech" });
    const transcript = await transcribeAudio({
      wavPath: audioAbs,
      duration: asset.duration,
    });

    onProgress?.({ stage: "analyzing", message: "Finding best moments" });
    const analysis = await buildAnalysis({
      audioPath: audioAbs,
      duration: asset.duration,
      transcript,
    });
    project.analysis = analysis;

    onProgress?.({ stage: "planning", message: "Building edit plan" });
    const { plan } = await generateEditPlan({
      prompt: project.prompt,
      format: project.format,
      aestheticId: project.aestheticId,
      analysis,
      sourceDuration: asset.duration,
    });
    project.editPlan = plan;

    onProgress?.({ stage: "rendering", message: "Rendering preview" });
    const previewRel = path.join("renders", projectId, "preview.mp4");
    const previewAbs = storagePath(previewRel);
    await renderEditPlan({
      plan,
      sourcePath: sourceAbs,
      outputPath: previewAbs,
      format: project.format,
      quality: "preview",
    });

    project.previewPath = previewRel;
    project.previewUrl = toPublicApiUrl(`storage/${previewRel}`);
    project.status = "ready";
    project.error = undefined;
    await saveProject(project);
    onProgress?.({ stage: "done", message: "Ready" });
    return project;
  } catch (err) {
    project.status = "error";
    project.error = err instanceof Error ? err.message : "Pipeline failed";
    await saveProject(project);
    onProgress?.({ stage: "error", message: project.error });
    throw err;
  }
}

export async function reRenderProject(
  projectId: string,
  quality: "preview" | "export" = "preview"
): Promise<ProjectRecord> {
  const project = await loadProject(projectId);
  if (!project?.editPlan || !project.assets[0]) {
    throw new Error("Project missing plan or asset");
  }

  const sourceAbs = storagePath(project.assets[0].sourcePath);
  const rel =
    quality === "export"
      ? path.join("renders", projectId, "export.mp4")
      : path.join("renders", projectId, "preview.mp4");
  const abs = storagePath(rel);

  project.status = "rendering";
  await saveProject(project);

  await renderEditPlan({
    plan: project.editPlan,
    sourcePath: sourceAbs,
    outputPath: abs,
    format: project.format,
    quality,
  });

  if (quality === "export") {
    project.exportPath = rel;
    project.exportUrl = toPublicApiUrl(`storage/${rel}`);
  } else {
    project.previewPath = rel;
    project.previewUrl = toPublicApiUrl(`storage/${rel}`);
  }
  project.status = "ready";
  await saveProject(project);
  return project;
}

export async function createProject(input: {
  name: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  prompt: string;
}): Promise<ProjectRecord> {
  const { newProjectId } = await import("@/lib/projects/store");
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: newProjectId(),
    name: input.name,
    format: input.format,
    aestheticId: input.aestheticId,
    prompt: input.prompt,
    assets: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(project);
  return project;
}
