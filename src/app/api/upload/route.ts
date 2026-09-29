import { NextResponse } from "next/server";
import { getStorage, makeAssetKey } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "demo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const key = makeAssetKey(projectId, file.name);
    const stored = await getStorage().put(
      key,
      buf,
      file.type || "video/mp4"
    );

    return NextResponse.json({
      asset: {
        id: key,
        filename: file.name,
        mimeType: file.type || "video/mp4",
        url: stored.url,
        sizeBytes: stored.sizeBytes,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
