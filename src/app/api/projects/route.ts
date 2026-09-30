import { NextResponse } from "next/server";
import { createProject } from "@/lib/projects/store";
import type { AestheticId, VideoFormat } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      format?: VideoFormat;
      aestheticId?: AestheticId;
      prompt?: string;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    const project = await createProject({
      name: body.name?.trim() || "Untitled project",
      format: body.format ?? "instagram_reel",
      aestheticId: body.aestheticId ?? "clean_lifestyle",
      prompt: body.prompt.trim(),
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[POST /api/projects]", err);
    const message =
      err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
