import { NextResponse } from "next/server";
import { generateEditPlan } from "@/lib/ai/edit-plan";
import type {
  EditPlan,
  VideoAnalysis,
  VideoFormat,
} from "@/lib/types/edit-plan";
import { validateEditPlan } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt: string;
      format: VideoFormat;
      analysis: VideoAnalysis;
      currentPlan: EditPlan;
      instruction: string;
      selection?: {
        type: "clip" | "caption" | "zoom" | "music" | "range";
        id?: string;
        start?: number;
        end?: number;
      };
    };

    if (!body.instruction?.trim() || !body.currentPlan || !body.analysis) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Validate incoming plan before trusting it
    const current = validateEditPlan(body.currentPlan);
    if (!current.success) {
      return NextResponse.json(
        { error: `Current plan invalid: ${current.error}` },
        { status: 400 }
      );
    }

    const { plan, provider } = await generateEditPlan({
      prompt: body.prompt ?? "",
      format: body.format,
      analysis: body.analysis,
      improve: {
        currentPlan: current.data,
        instruction: body.instruction,
        selection: body.selection,
      },
    });

    const validated = validateEditPlan(plan);
    if (!validated.success) {
      return NextResponse.json(
        { error: `Improved plan invalid: ${validated.error}` },
        { status: 422 }
      );
    }

    return NextResponse.json({ plan: validated.data, provider });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to improve edit" },
      { status: 500 }
    );
  }
}
