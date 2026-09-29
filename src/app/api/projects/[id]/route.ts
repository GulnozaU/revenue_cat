import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import type { EditPlan } from "@/lib/types/edit-plan";
import { validateEditPlan, normalizeEditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    name?: string;
    editPlan?: EditPlan;
    prompt?: string;
  };

  if (body.name) project.name = body.name;
  if (body.prompt) project.prompt = body.prompt;
  if (body.editPlan) {
    const validated = validateEditPlan(body.editPlan);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const sourceDuration = project.assets[0]?.duration ?? validated.data.sourceDuration;
    project.editPlan = normalizeEditPlan(validated.data, sourceDuration);
  }

  await saveProject(project);
  return NextResponse.json({ project });
}
