import { NextResponse } from "next/server";
import { generateEditPlanViaProvider } from "@/lib/ai/provider";
import type { AestheticId, VideoFormat } from "@/lib/types/edit-plan";
import { VideoFormatSchema, AestheticIdSchema } from "@/lib/types/edit-plan";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Server-only analysis entry.
 * AI_MODE=mock → deterministic EditPlan (no external AI).
 * AI_MODE=real → NVIDIA → Gemini.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    // file optional in mock mode
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const formatRaw = String(form.get("format") || "instagram_reel");
    const aestheticRaw = String(form.get("aestheticId") || "cute");
    const format = VideoFormatSchema.parse(formatRaw) as VideoFormat;
    const aestheticId = AestheticIdSchema.parse(aestheticRaw) as AestheticId;
    const sourceDuration = Number(form.get("duration") || 0);
    if (!(sourceDuration > 0)) {
      return NextResponse.json(
        { error: "duration (seconds) required" },
        { status: 400 }
      );
    }

    const buffer =
      file instanceof File
        ? Buffer.from(await file.arrayBuffer())
        : Buffer.alloc(0);

    const { plan, provider } = await generateEditPlanViaProvider({
      prompt,
      format,
      aestheticId,
      sourceDuration,
      videoPath: file instanceof File ? file.name : "upload.mp4",
      videoBuffer: buffer,
      mimeType: file instanceof File ? file.type || "video/mp4" : "video/mp4",
    });

    return NextResponse.json({ plan, provider });
  } catch (err) {
    console.error("[POST /api/ai/analyze-video]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Analysis failed.",
      },
      { status: 500 }
    );
  }
}
