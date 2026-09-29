import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;
  const objectKey = key.map(decodeURIComponent).join("/");

  // Prefer direct filesystem under storage/
  const abs = path.join(process.cwd(), "storage", objectKey);
  try {
    const data = await fs.readFile(abs);
    const ext = objectKey.split(".").pop()?.toLowerCase();
    const type =
      ext === "mp4"
        ? "video/mp4"
        : ext === "webm"
          ? "video/webm"
          : ext === "mov"
            ? "video/quicktime"
            : ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "png"
                ? "image/png"
                : ext === "wav"
                  ? "audio/wav"
                  : ext === "json"
                    ? "application/json"
                    : "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=60",
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    const storage = getStorage();
    const data = await storage.get(objectKey);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": "application/octet-stream" },
    });
  }
}
