import { NextResponse } from "next/server";
import { loadProject } from "@/lib/projects/store";
import { reRenderProject } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/** @deprecated Prefer POST /api/projects/[id]/render?quality=export */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    projectId?: string;
    signedIn?: boolean;
  };
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  if (!body.signedIn) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const project = await loadProject(body.projectId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await reRenderProject(body.projectId, "export");
  return NextResponse.json({
    project: updated,
    url: updated.exportUrl,
  });
}
