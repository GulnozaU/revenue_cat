import { NextResponse } from "next/server";
import { generateEditPlan } from "@/lib/ai/edit-plan";
import type { VideoAnalysis, VideoFormat } from "@/lib/types/edit-plan";
import { validateEditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt: string;
      format: VideoFormat;
      analysis: VideoAnalysis;
    };

    if (!body.prompt?.trim() || !body.analysis || !body.format) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { plan, provider } = await generateEditPlan({
      prompt: body.prompt,
      format: body.format,
      analysis: body.analysis,
    });

    const validated = validateEditPlan(plan);
    if (!validated.success) {
      return NextResponse.json(
        { error: `Invalid edit plan: ${validated.error}` },
        { status: 422 }
      );
    }

    return NextResponse.json({ plan: validated.data, provider });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate edit plan" },
      { status: 500 }
    );
  }
}
