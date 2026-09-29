import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import { reRenderProject } from "@/lib/pipeline";
import { validateEditPlan, normalizeEditPlan } from "@/lib/types/edit-plan";
import type { EditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    quality?: "preview" | "export";
    editPlan?: EditPlan;
    signedIn?: boolean;
  };

  if (body.quality === "export" && !body.signedIn) {
    return NextResponse.json({ error: "Sign in required to export" }, { status: 401 });
  }

  if (body.editPlan) {
    const validated = validateEditPlan(body.editPlan);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    project.editPlan = normalizeEditPlan(
      validated.data,
      project.assets[0]?.duration ?? validated.data.sourceDuration
    );
    await saveProject(project);
  }

  const updated = await reRenderProject(id, body.quality ?? "preview");
  return NextResponse.json({
    project: updated,
    url:
      body.quality === "export" ? updated.exportUrl : updated.previewUrl,
  });
}
