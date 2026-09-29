import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import { reRenderProject } from "@/lib/pipeline";
import { validateEditPlan, normalizeEditPlan } from "@/lib/types/edit-plan";
import type { EditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

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

    const quality = body.quality ?? "preview";
    const updated = await reRenderProject(id, quality);

    if (quality === "export" && !updated.exportUrl) {
      return NextResponse.json(
        { error: "Export failed. Check the project and try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project: updated,
      url: quality === "export" ? updated.exportUrl : updated.previewUrl,
    });
  } catch (err) {
    console.error("[render]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Export failed. Check the project and try again.",
      },
      { status: 500 }
    );
  }
}
