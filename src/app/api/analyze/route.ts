import { NextResponse } from "next/server";
import {
  estimateMetadata,
  getTranscriptionProvider,
} from "@/lib/transcription";
import { analyzeVideo } from "@/lib/analysis";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      projectId: string;
      duration?: number;
      width?: number;
      height?: number;
      filename?: string;
    };

    const metadata = estimateMetadata(body.duration);
    if (body.width) metadata.width = body.width;
    if (body.height) metadata.height = body.height;

    const transcription = getTranscriptionProvider();
    const transcript = await transcription.transcribe({
      filePathOrUrl: body.filename ?? "demo.mp4",
      duration: metadata.duration,
    });

    const analysis = await analyzeVideo({ metadata, transcript });

    return NextResponse.json({
      analysis,
      provider: transcript.provider,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to analyze video" },
      { status: 500 }
    );
  }
}
