import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;
  const objectKey = key.map(decodeURIComponent).join("/");
  const storage = getStorage();
  const data = await storage.get(objectKey);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = objectKey.split(".").pop()?.toLowerCase();
  const type =
    ext === "mp4"
      ? "video/mp4"
      : ext === "webm"
        ? "video/webm"
        : ext === "mov"
          ? "video/quicktime"
          : ext === "json"
            ? "application/json"
            : "application/octet-stream";

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
