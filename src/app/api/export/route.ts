import { NextResponse } from "next/server";
import { buildFfmpegCommand, renderEdit } from "@/lib/renderer";
import { validateEditPlan, type EditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      plan: EditPlan;
      sourcePath?: string;
      signedIn?: boolean;
    };

    if (!body.signedIn) {
      return NextResponse.json(
        { error: "Sign in required to export" },
        { status: 401 }
      );
    }

    const validated = validateEditPlan(body.plan);
    if (!validated.success) {
      return NextResponse.json(
        { error: `Invalid plan: ${validated.error}` },
        { status: 400 }
      );
    }

    const sourcePath = body.sourcePath ?? "storage/uploads/demo.mp4";
    const outputPath = `storage/renders/export_${Date.now()}.mp4`;

    const result = await renderEdit({
      plan: validated.data,
      sourcePath,
      outputPath,
    });

    return NextResponse.json({
      ...result,
      commandPreview: buildFfmpegCommand({
        plan: validated.data,
        sourcePath,
        outputPath,
      }),
      message:
        result.mode === "preview-only"
          ? "Export prepared in preview mode (set FF_RENDER=1 + ffmpeg for full encode)."
          : "Export complete",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
