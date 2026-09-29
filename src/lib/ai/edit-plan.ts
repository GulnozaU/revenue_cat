import type {
  AestheticId,
  EditPlan,
  Transcript,
  VideoAnalysis,
  VideoFormat,
} from "@/lib/types/edit-plan";
import { generateEditPlanWithGemini } from "@/lib/ai/gemini";
import { detectSilences } from "@/lib/ffmpeg/media";

export async function buildAnalysis(input: {
  audioPath: string;
  duration: number;
  transcript: Transcript;
}): Promise<VideoAnalysis> {
  const silences =
    input.transcript.provider === "silence-fallback"
      ? await detectSilences(input.audioPath)
      : findSilencesFromTranscript(input.transcript);

  const highlightCandidates = input.transcript.segments
    .map((seg) => {
      const words = seg.text.split(/\s+/).filter(Boolean).length;
      const density = words / Math.max(0.25, seg.end - seg.start);
      const punchy =
        /you|how|why|secret|best|never|always|watch|look|today|wait/i.test(
          seg.text
        );
      const score = Math.min(1, density / 3.5) * 0.5 + (punchy ? 0.4 : 0.15);
      return {
        start: seg.start,
        end: seg.end,
        score,
        reason: punchy ? "Hook / emphasis line" : "Spoken segment",
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    transcript: input.transcript,
    silences,
    highlightCandidates,
  };
}

function findSilencesFromTranscript(transcript: Transcript) {
  const silences: VideoAnalysis["silences"] = [];
  const segs = [...transcript.segments].sort((a, b) => a.start - b.start);
  if (!segs.length) return silences;
  if (segs[0].start > 0.4) {
    silences.push({
      start: 0,
      end: segs[0].start,
      duration: segs[0].start,
    });
  }
  for (let i = 0; i < segs.length - 1; i++) {
    const gap = segs[i + 1].start - segs[i].end;
    if (gap >= 0.35) {
      silences.push({
        start: segs[i].end,
        end: segs[i + 1].start,
        duration: gap,
      });
    }
  }
  const last = segs[segs.length - 1];
  if (transcript.duration - last.end >= 0.4) {
    silences.push({
      start: last.end,
      end: transcript.duration,
      duration: transcript.duration - last.end,
    });
  }
  return silences;
}

/**
 * Primary AI path: Gemini watches the actual MP4.
 * No OpenAI dependency.
 */
export async function generateEditPlan(input: {
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  analysis: VideoAnalysis;
  sourceDuration: number;
  videoPath: string;
  mimeType: string;
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: { type: string; id?: string; start?: number; end?: number };
  };
}): Promise<{ plan: EditPlan; provider: "gemini" | "mock" }> {
  return generateEditPlanWithGemini({
    videoPath: input.videoPath,
    mimeType: input.mimeType,
    prompt: input.prompt,
    format: input.format,
    aestheticId: input.aestheticId,
    sourceDuration: input.sourceDuration,
    improve: input.improve,
  });
}
