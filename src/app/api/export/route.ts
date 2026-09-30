import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * @deprecated Export is performed in the browser with ffmpeg.wasm.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Export runs in the browser with ffmpeg.wasm. Use the Export MP4 button in the editor.",
      renderInBrowser: true,
    },
    { status: 410 }
  );
}
