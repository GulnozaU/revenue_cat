import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import { ingestUploadedFile, runProjectPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
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

  project.status = "uploading";
  await saveProject(project);

  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await ingestUploadedFile({
    projectId: id,
    filename: file.name,
    mimeType: file.type || "video/mp4",
    buffer,
  });

  project.assets = [asset];
  project.name = project.name === "Untitled project"
    ? file.name.replace(/\.[^.]+$/, "")
    : project.name;
  await saveProject(project);

  // Run full pipeline (transcribe → plan → render)
  const updated = await runProjectPipeline(id);
  return NextResponse.json({ project: updated });
}
