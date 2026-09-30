import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { loadProject, saveProject } from "@/lib/projects/store";
import { ingestUploadedFile, runProjectPipeline } from "@/lib/pipeline";
import { getAiMode } from "@/lib/ai/provider";
import type {
  AestheticId,
  ProjectRecord,
  VideoAsset,
  VideoFormat,
} from "@/lib/types/edit-plan";

const FORMATS = new Set<VideoFormat>([
  "instagram_reel",
  "tiktok",
  "youtube_short",
  "youtube_landscape",
]);
const AESTHETICS = new Set<AestheticId>([
  "cute",
  "vlog",
  "clean_lifestyle",
  "fast_paced",
  "cinematic",
  "educational",
  "food",
  "travel",
]);

/** Recreate a draft when create and process landed on different servers. */
function draftFromForm(id: string, form: FormData): ProjectRecord {
  const now = new Date().toISOString();
  const filename = String(form.get("filename") || "upload.mp4");
  const formatRaw = String(form.get("format") || "instagram_reel");
  const aestheticRaw = String(form.get("aestheticId") || "cute");
  return {
    id,
    name:
      String(form.get("name") || "").trim() ||
      filename.replace(/\.[^.]+$/, "") ||
      "Untitled",
    format: FORMATS.has(formatRaw as VideoFormat)
      ? (formatRaw as VideoFormat)
      : "instagram_reel",
    aestheticId: AESTHETICS.has(aestheticRaw as AestheticId)
      ? (aestheticRaw as AestheticId)
      : "cute",
    prompt:
      String(form.get("prompt") || "").trim() ||
      "Make this into a cute aesthetic Instagram Reel.",
    assets: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Upload video → NVIDIA/Gemini EditPlan.
 * Does NOT render with system FFmpeg — browser uses ffmpeg.wasm.
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const form = await req.formData();
    let project = await loadProject(id);
    if (!project) {
      project = draftFromForm(id, form);
      await saveProject(project);
    }
    const file = form.get("file");
    const duration = Number(form.get("duration") || 0);
    const width = Number(form.get("width") || 0);
    const height = Number(form.get("height") || 0);
    const filename = String(form.get("filename") || "upload.mp4");
    const thumbnailDataUrl =
      typeof form.get("thumbnailDataUrl") === "string"
        ? (form.get("thumbnailDataUrl") as string)
        : undefined;

    // Demo mode: keep the MP4 in the browser. Don't upload the whole file.
    const mockWithoutFile =
      getAiMode() === "mock" && !(file instanceof File);

    if (!(file instanceof File) && !mockWithoutFile) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (mockWithoutFile && !(duration > 0)) {
      return NextResponse.json(
        { error: "Couldn't read this video. Try another MP4 file." },
        { status: 400 }
      );
    }

    project.status = "uploading";
    await saveProject(project);

    let buffer = Buffer.alloc(0);
    let asset: VideoAsset;

    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
      asset = await ingestUploadedFile({
        projectId: id,
        filename: file.name,
        mimeType: file.type || "video/mp4",
        buffer,
        duration: duration > 0 ? duration : 1,
        width: width > 0 ? width : 1080,
        height: height > 0 ? height : 1920,
        thumbnailDataUrl,
      });
    } else {
      asset = {
        id: randomUUID(),
        filename,
        mimeType: "video/mp4",
        sourcePath: "",
        sourceUrl: "",
        duration,
        width: width > 0 ? width : 1080,
        height: height > 0 ? height : 1920,
        fps: 30,
        sizeBytes: 0,
        hasAudio: true,
        thumbnailUrl: thumbnailDataUrl,
      };
    }

    project.assets = [asset];
    project.name =
      project.name === "Untitled project"
        ? filename.replace(/\.[^.]+$/, "")
        : project.name;
    await saveProject(project);

    const updated = await runProjectPipeline(id, buffer);
    return NextResponse.json({
      project: updated,
      renderInBrowser: true,
    });
  } catch (err) {
    console.error("[POST /api/projects/:id/process]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Processing failed",
      },
      { status: 500 }
    );
  }
}
