import { NextResponse } from "next/server";
import { generateEditPlan, buildAnalysis } from "@/lib/ai/edit-plan";
import type { AestheticId, VideoFormat } from "@/lib/types/edit-plan";
import { VideoFormatSchema, AestheticIdSchema } from "@/lib/types/edit-plan";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Server-only AI analysis: NVIDIA primary → Gemini fallback.
 * Returns a validated EditPlan — never exposes API keys to the browser.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const formatRaw = String(form.get("format") || "instagram_reel");
    const aestheticRaw = String(form.get("aestheticId") || "clean_lifestyle");
    const format = VideoFormatSchema.parse(formatRaw) as VideoFormat;
    const aestheticId = AestheticIdSchema.parse(aestheticRaw) as AestheticId;
    const sourceDuration = Number(form.get("duration") || 0);
    if (!(sourceDuration > 0)) {
      return NextResponse.json(
        { error: "duration (seconds) required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await buildAnalysis({ duration: sourceDuration });

    const { plan, provider } = await generateEditPlan({
      prompt,
      format,
      aestheticId,
      analysis,
      sourceDuration,
      videoPath: file.name,
      videoBuffer: buffer,
      mimeType: file.type || "video/mp4",
    });

    return NextResponse.json({ plan, provider });
  } catch (err) {
    console.error("[POST /api/ai/analyze-video]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "NVIDIA analysis failed.",
      },
      { status: 500 }
    );
  }
}
