import type {
  SilenceRegion,
  SceneBoundary,
  VideoAnalysis,
  VideoMetadata,
  Transcript,
} from "@/lib/types/edit-plan";

/** Detect silence gaps from transcript timing (proxy for audio analysis). */
export function findSilencesFromTranscript(
  transcript: Transcript,
  minSilence = 0.45
): SilenceRegion[] {
  const silences: SilenceRegion[] = [];
  const segs = [...transcript.segments].sort((a, b) => a.start - b.start);

  if (segs.length === 0) {
    if (transcript.duration > minSilence) {
      silences.push({
        start: 0,
        end: transcript.duration,
        duration: transcript.duration,
      });
    }
    return silences;
  }

  if (segs[0].start > minSilence) {
    silences.push({
      start: 0,
      end: segs[0].start,
      duration: segs[0].start,
    });
  }

  for (let i = 0; i < segs.length - 1; i++) {
    const gapStart = segs[i].end;
    const gapEnd = segs[i + 1].start;
    const duration = gapEnd - gapStart;
    if (duration >= minSilence) {
      silences.push({ start: gapStart, end: gapEnd, duration });
    }
  }

  const last = segs[segs.length - 1];
  if (transcript.duration - last.end >= minSilence) {
    silences.push({
      start: last.end,
      end: transcript.duration,
      duration: transcript.duration - last.end,
    });
  }

  return silences;
}

/** Approximate scene boundaries from silence + segment starts. */
export function estimateScenes(
  transcript: Transcript,
  silences: SilenceRegion[]
): SceneBoundary[] {
  const times = new Set<number>([0]);
  for (const s of transcript.segments) {
    times.add(Number(s.start.toFixed(2)));
  }
  for (const sil of silences) {
    if (sil.duration >= 0.8) times.add(Number(sil.end.toFixed(2)));
  }
  return [...times]
    .sort((a, b) => a - b)
    .map((time) => ({ time, confidence: 0.7 }));
}

export function scoreHighlights(
  transcript: Transcript,
  silences: SilenceRegion[]
): VideoAnalysis["highlightCandidates"] {
  const silenceSet = silences.filter((s) => s.duration >= 0.6);
  return transcript.segments.map((seg) => {
    const words = seg.text.split(/\s+/).length;
    const density = words / Math.max(0.3, seg.end - seg.start);
    const nearSilence = silenceSet.some(
      (s) => Math.abs(s.end - seg.start) < 0.4 || Math.abs(s.start - seg.end) < 0.4
    );
    const punchy =
      /funny|wait|nobody|perfect|real|pro|vibe|ship|cut|keep/i.test(seg.text);
    const score =
      Math.min(1, density / 4) * 0.45 +
      (nearSilence ? 0.2 : 0) +
      (punchy ? 0.35 : 0.1);

    return {
      start: seg.start,
      end: seg.end,
      score,
      reason: punchy
        ? "High-energy / memorable line"
        : nearSilence
          ? "Clean phrasing after a pause"
          : "Steady spoken moment",
    };
  }).sort((a, b) => b.score - a.score);
}

export async function analyzeVideo(input: {
  metadata: VideoMetadata;
  transcript: Transcript;
}): Promise<VideoAnalysis> {
  const silences = findSilencesFromTranscript(input.transcript);
  const scenes = estimateScenes(input.transcript, silences);
  const highlightCandidates = scoreHighlights(input.transcript, silences);

  return {
    metadata: input.metadata,
    transcript: input.transcript,
    silences,
    scenes,
    highlightCandidates,
  };
}
