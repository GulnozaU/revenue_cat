import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import { validateEditPlan, normalizeEditPlan } from "@/lib/types/edit-plan";
import type { EditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Persist EditPlan only. Actual video rendering is client-side (ffmpeg.wasm).
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const project = await loadProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      quality?: "preview" | "export";
      editPlan?: EditPlan;
    };

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

    return NextResponse.json({
      project,
      renderInBrowser: true,
      message:
        "Edit plan saved. Render the video in the browser with ffmpeg.wasm.",
    });
  } catch (err) {
    console.error("[render]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to save edit plan",
      },
      { status: 500 }
    );
  }
}
