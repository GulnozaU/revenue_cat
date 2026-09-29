import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ProjectRecord, VideoAsset } from "@/lib/types/edit-plan";
import {
  assertFfmpeg,
  extractAudioWav,
  generateProxy,
  generateThumbnail,
  probeVideo,
  storagePath,
  toPublicApiUrl,
} from "@/lib/ffmpeg/media";
import { buildAnalysis, generateEditPlan } from "@/lib/ai/edit-plan";
import { renderEditPlan } from "@/lib/ffmpeg/render";
import { loadProject, saveProject, createProject } from "@/lib/projects/store";
import { detectSilences } from "@/lib/ffmpeg/media";

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

/** Lightweight local analysis (silences) — Gemini watches the video for the edit plan. */
async function buildLocalAnalysis(audioPath: string, duration: number) {
  const silences = await detectSilences(audioPath).catch(() => []);
  const transcript = {
    language: "und",
    fullText: "",
    duration,
    provider: "silence-fallback" as const,
    segments: [] as Array<{ id: string; text: string; start: number; end: number }>,
  };

  // Invert silences into speech-ish regions for highlight hints
  let cursor = 0;
  let i = 0;
  for (const sil of silences) {
    if (sil.start - cursor >= 0.4) {
      transcript.segments.push({
        id: `seg_${++i}`,
        start: cursor,
        end: sil.start,
        text: `[moment ${i}]`,
      });
    }
    cursor = sil.end;
  }
  if (duration - cursor >= 0.4) {
    transcript.segments.push({
      id: `seg_${++i}`,
      start: cursor,
      end: duration,
      text: `[moment ${i}]`,
    });
  }
  if (transcript.segments.length === 0) {
    transcript.segments.push({
      id: "seg_1",
      start: 0,
      end: duration,
      text: "[full take]",
    });
  }
  transcript.fullText = transcript.segments.map((s) => s.text).join(" ");

  return buildAnalysis({ audioPath, duration, transcript });
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

    onProgress?.({ stage: "proxy", message: "Preparing media" });
    const analysis = await buildLocalAnalysis(audioAbs, asset.duration);
    project.analysis = analysis;

    onProgress?.({
      stage: "watching",
      message: "Gemini is watching your video…",
    });
    onProgress?.({ stage: "planning", message: "Building structured edit plan" });

    const { plan, provider } = await generateEditPlan({
      prompt: project.prompt,
      format: project.format,
      aestheticId: project.aestheticId,
      analysis,
      sourceDuration: asset.duration,
      videoPath: sourceAbs,
      mimeType: asset.mimeType,
    });
    project.editPlan = plan;
    project.aiProvider = provider;
    await saveProject(project);

    onProgress?.({ stage: "rendering", message: "Rendering preview with FFmpeg" });
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
