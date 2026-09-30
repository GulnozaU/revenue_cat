import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import { ingestUploadedFile, runProjectPipeline } from "@/lib/pipeline";

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
    const project = await loadProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const duration = Number(form.get("duration") || 0);
    const width = Number(form.get("width") || 0);
    const height = Number(form.get("height") || 0);
    const thumbnailDataUrl =
      typeof form.get("thumbnailDataUrl") === "string"
        ? (form.get("thumbnailDataUrl") as string)
        : undefined;

    project.status = "uploading";
    await saveProject(project);

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await ingestUploadedFile({
      projectId: id,
      filename: file.name,
      mimeType: file.type || "video/mp4",
      buffer,
      duration: duration > 0 ? duration : 1,
      width: width > 0 ? width : 1080,
      height: height > 0 ? height : 1920,
      thumbnailDataUrl,
    });

    project.assets = [asset];
    project.name =
      project.name === "Untitled project"
        ? file.name.replace(/\.[^.]+$/, "")
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
