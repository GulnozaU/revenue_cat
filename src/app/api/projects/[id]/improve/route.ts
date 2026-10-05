import { NextResponse } from "next/server";
import { loadProject, saveProject } from "@/lib/projects/store";
import { generateEditPlan } from "@/lib/ai/edit-plan";
import { validateEditPlan } from "@/lib/types/edit-plan";
import { storagePath } from "@/lib/storage/paths";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/**
 * AI Improve — NVIDIA/Gemini return an updated EditPlan.
 * Browser re-renders with ffmpeg.wasm.
 * Accepts JSON or multipart (with optional `file` for serverless where /tmp uploads are gone).
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const project = await loadProject(id);
    if (!project?.editPlan || !project.assets[0]) {
      return NextResponse.json({ error: "Project not ready" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";
    let instruction = "";
    let selection:
      | { type: string; id?: string; start?: number; end?: number }
      | undefined;
    let videoBuffer: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      instruction = String(form.get("instruction") || "").trim();
      const selRaw = form.get("selection");
      if (typeof selRaw === "string" && selRaw) {
        try {
          selection = JSON.parse(selRaw);
        } catch {
          /* ignore */
        }
      }
      const file = form.get("file");
      if (file instanceof File) {
        videoBuffer = Buffer.from(await file.arrayBuffer());
      }
    } else {
      const body = (await req.json()) as {
        instruction: string;
        selection?: {
          type: string;
          id?: string;
          start?: number;
          end?: number;
        };
      };
      instruction = body.instruction?.trim() || "";
      selection = body.selection;
    }

    if (!instruction) {
      return NextResponse.json({ error: "instruction required" }, { status: 400 });
    }

    const current = validateEditPlan(project.editPlan);
    if (!current.success) {
      return NextResponse.json({ error: current.error }, { status: 400 });
    }

    const asset = project.assets[0];
    const useReal = project.session !== "demo";
    if (!videoBuffer && useReal) {
      try {
        videoBuffer = await fs.readFile(storagePath(asset.sourcePath));
      } catch {
        return NextResponse.json(
          {
            error:
              "Source video is no longer on the server. Keep the tab open after upload, or re-upload before AI Improve.",
          },
          { status: 400 }
        );
      }
    } else if (!videoBuffer) {
      videoBuffer = Buffer.alloc(0);
    }

    const { plan, provider } = await generateEditPlan({
      prompt: project.prompt,
      format: project.format,
      aestheticId: project.aestheticId,
      analysis: project.analysis ?? {
        transcript: {
          language: "und",
          fullText: "",
          duration: asset.duration,
          provider: "silence-fallback",
          segments: [],
        },
        silences: [],
        highlightCandidates: [],
      },
      sourceDuration: asset.duration,
      videoPath: asset.sourcePath,
      videoBuffer,
      mimeType: asset.mimeType,
      mode: project.session === "demo" ? "mock" : "real",
      improve: {
        instruction,
        currentPlan: current.data,
        selection,
      },
    });

    project.editPlan = plan;
    project.aiProvider = provider;
    project.previewUrl = undefined;
    project.previewPath = undefined;
    await saveProject(project);

    return NextResponse.json({
      project,
      provider,
      plan,
      renderInBrowser: true,
    });
  } catch (err) {
    console.error("[improve]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI Improve failed" },
      { status: 500 }
    );
  }
}
