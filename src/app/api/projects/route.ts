import { NextResponse } from "next/server";
import { createProject } from "@/lib/pipeline";
import type { AestheticId, VideoFormat } from "@/lib/types/edit-plan";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
}
