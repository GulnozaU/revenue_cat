import { NextResponse } from "next/server";
import path from "path";
import { loadProject, saveProject } from "@/lib/projects/store";
import { generateEditPlan } from "@/lib/ai/edit-plan";
import { reRenderProject } from "@/lib/pipeline";
import { validateEditPlan } from "@/lib/types/edit-plan";
import { storagePath } from "@/lib/ffmpeg/media";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const project = await loadProject(id);
    if (!project?.editPlan || !project.analysis || !project.assets[0]) {
      return NextResponse.json({ error: "Project not ready" }, { status: 400 });
    }

    const body = (await req.json()) as {
      instruction: string;
      selection?: {
        type: string;
        id?: string;
        start?: number;
        end?: number;
      };
    };

    if (!body.instruction?.trim()) {
      return NextResponse.json({ error: "instruction required" }, { status: 400 });
    }

    const current = validateEditPlan(project.editPlan);
    if (!current.success) {
      return NextResponse.json({ error: current.error }, { status: 400 });
    }

    const asset = project.assets[0];
    const sourceAbs = path.isAbsolute(asset.sourcePath)
      ? asset.sourcePath
      : storagePath(asset.sourcePath);

    const { plan, provider } = await generateEditPlan({
      prompt: project.prompt,
      format: project.format,
      aestheticId: project.aestheticId,
      analysis: project.analysis,
      sourceDuration: asset.duration,
      videoPath: sourceAbs,
      mimeType: asset.mimeType,
      improve: {
        instruction: body.instruction.trim(),
        currentPlan: current.data,
        selection: body.selection,
      },
    });

    project.editPlan = plan;
    project.aiProvider = provider;
    await saveProject(project);

    const rendered = await reRenderProject(id, "preview");

    return NextResponse.json({
      project: rendered,
      provider,
      plan,
    });
  } catch (err) {
    console.error("[improve]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI Improve failed" },
      { status: 500 }
    );
  }
}
