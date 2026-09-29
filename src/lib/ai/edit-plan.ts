import type {
  AestheticId,
  EditPlan,
  Transcript,
  VideoAnalysis,
  VideoFormat,
} from "@/lib/types/edit-plan";
import { FORMAT_PRESETS, normalizeEditPlan, validateEditPlan } from "@/lib/types/edit-plan";
import { getStyle } from "@/lib/styles/presets";
import { detectSilences } from "@/lib/ffmpeg/media";
import OpenAI from "openai";

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

export async function generateEditPlan(input: {
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  analysis: VideoAnalysis;
  sourceDuration: number;
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: {
      type: string;
      id?: string;
      start?: number;
      end?: number;
    };
  };
}): Promise<{ plan: EditPlan; provider: "openai" | "deterministic" }> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const plan = await generateWithOpenAI(input);
      if (plan) return { plan, provider: "openai" };
    } catch (err) {
      console.warn("LLM edit plan failed", err);
    }
  }

  const plan = input.improve
    ? applyDeterministicImprove(input)
    : buildDeterministicPlan(input);
  const validated = validateEditPlan(plan);
  if (!validated.success) throw new Error(validated.error);
  return {
    plan: normalizeEditPlan(validated.data, input.sourceDuration),
    provider: "deterministic",
  };
}

function buildDeterministicPlan(input: {
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  analysis: VideoAnalysis;
  sourceDuration: number;
}): EditPlan {
  const style = getStyle(input.aestheticId);
  const ratio = FORMAT_PRESETS[input.format].ratio;
  const duration = input.sourceDuration;
  const segs = input.analysis.transcript.segments;

  // Keep speech regions; drop long silences per style
  const keepRegions: Array<{ start: number; end: number; reason: string }> = [];
  if (segs.length === 0) {
    keepRegions.push({ start: 0, end: Math.min(duration, 20), reason: "Full take" });
  } else {
    for (const seg of segs) {
      const pad = style.targetClipPadding;
      keepRegions.push({
        start: Math.max(0, seg.start - pad),
        end: Math.min(duration, seg.end + pad * 0.5),
        reason: seg.text.slice(0, 60),
      });
    }
  }

  // Merge overlapping / near regions
  keepRegions.sort((a, b) => a.start - b.start);
  const merged: typeof keepRegions = [];
  for (const r of keepRegions) {
    const last = merged[merged.length - 1];
    if (last && r.start - last.end <= style.maxSilenceKeep) {
      last.end = Math.max(last.end, r.end);
      last.reason = `${last.reason} · ${r.reason}`.slice(0, 80);
    } else {
      merged.push({ ...r });
    }
  }

  // Fast pacing: prefer top highlights if many
  let selected = merged;
  if (style.pacing === "fast" && merged.length > 6) {
    const scored = merged
      .map((m) => {
        const hit = input.analysis.highlightCandidates.find(
          (h) => h.start >= m.start - 0.2 && h.end <= m.end + 0.2
        );
        return { ...m, score: hit?.score ?? 0.3 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .sort((a, b) => a.start - b.start);
    selected = scored;
  }

  let cursor = 0;
  const speed = style.pacing === "fast" ? 1.05 : 1;
  const clips = selected.map((r, i) => {
    const len = (r.end - r.start) / speed;
    const clip = {
      id: `clip_${i + 1}`,
      sourceStart: Number(r.start.toFixed(3)),
      sourceEnd: Number(r.end.toFixed(3)),
      timelineStart: Number(cursor.toFixed(3)),
      timelineEnd: Number((cursor + len).toFixed(3)),
      speed,
      action: "keep" as const,
      reason: r.reason,
    };
    cursor += len;
    return clip;
  });

  const captionY =
    style.captionPosition === "center"
      ? 0.5
      : style.captionPosition === "upper_center"
        ? 0.22
        : 0.78;

  const captions = input.analysis.transcript.segments
    .map((seg, i) => {
      const mapped = mapSourceToTimeline(clips, seg.start, seg.end);
      if (!mapped) return null;
      const text =
        seg.text.startsWith("[speech")
          ? seg.text
          : seg.text.length > 48
            ? `${seg.text.slice(0, 46)}…`
            : seg.text;
      return {
        id: `cap_${i + 1}`,
        start: mapped.start,
        end: mapped.end,
        text,
        style: style.captionStyle,
        fontId: style.fontId,
        fontSize: style.pacing === "fast" ? 52 : 44,
        x: 0.5,
        y: captionY,
        animation: style.pacing === "fast" ? ("pop" as const) : ("none" as const),
      };
    })
    .filter(Boolean) as EditPlan["captions"];

  const zooms: EditPlan["zooms"] = [];
  const zoomEvery =
    style.zoomFrequency === "high"
      ? 1
      : style.zoomFrequency === "medium"
        ? 2
        : style.zoomFrequency === "low"
          ? 3
          : 99;
  clips.forEach((c, i) => {
    if (i % zoomEvery !== 0) return;
    const mid = (c.timelineStart + c.timelineEnd) / 2;
    zooms.push({
      id: `zoom_${zooms.length + 1}`,
      start: Number((mid - 0.4).toFixed(3)),
      end: Number((mid + 0.55).toFixed(3)),
      scale: style.zoomFrequency === "high" ? 1.12 : 1.07,
      x: 0.5,
      y: 0.45,
    });
  });

  const stickers: EditPlan["stickers"] = [];
  if (style.stickerUsage !== "none" && clips.length > 0) {
    const count =
      style.stickerUsage === "high" ? 3 : style.stickerUsage === "medium" ? 2 : 1;
    const ids = ["star", "heart", "sparkle", "fire"];
    for (let i = 0; i < Math.min(count, clips.length); i++) {
      const c = clips[i];
      stickers.push({
        id: `stk_${i + 1}`,
        assetId: ids[i % ids.length],
        start: c.timelineStart + 0.2,
        end: Math.min(c.timelineEnd, c.timelineStart + 1.8),
        x: 0.82,
        y: 0.18 + i * 0.08,
        scale: 0.28,
        rotation: i % 2 === 0 ? -8 : 10,
      });
    }
  }

  const wantsMusic =
    style.musicTrackId &&
    (/music|beat|energetic|soundtrack/i.test(input.prompt) ||
      style.musicMood !== "none");

  return normalizeEditPlan(
    {
      sourceDuration: duration,
      format: ratio,
      aestheticId: input.aestheticId,
      duration: cursor,
      clips,
      cuts: [],
      captions,
      textOverlays: [],
      stickers,
      zooms,
      music: wantsMusic && style.musicTrackId
        ? {
            trackId: style.musicTrackId,
            volume: style.musicVolume,
            startAt: 0,
            fadeIn: 0.4,
            fadeOut: 0.8,
          }
        : null,
      styleNotes: `Deterministic plan · style=${style.name} · prompt=${input.prompt.slice(0, 80)}`,
    },
    duration
  );
}

function applyDeterministicImprove(input: {
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: { type: string; id?: string; start?: number; end?: number };
  };
  sourceDuration: number;
  aestheticId: AestheticId;
  analysis: VideoAnalysis;
  prompt: string;
  format: VideoFormat;
}): EditPlan {
  const plan = structuredClone(input.improve!.currentPlan);
  const text = input.improve!.instruction.toLowerCase();
  const sel = input.improve!.selection;

  if (sel?.type === "clip" && sel.id) {
    const clip = plan.clips.find((c) => c.id === sel.id);
    if (clip) {
      if (/faster|energetic|pace/.test(text)) {
        clip.speed = Math.min(2, (clip.speed || 1) * 1.25);
      }
      if (/slower|calm/.test(text)) {
        clip.speed = Math.max(0.7, (clip.speed || 1) * 0.85);
      }
      if (/boring|remove|trim|cut/.test(text)) {
        const mid = (clip.sourceStart + clip.sourceEnd) / 2;
        const keep = Math.max(0.6, (clip.sourceEnd - clip.sourceStart) * 0.55);
        clip.sourceStart = mid - keep / 2;
        clip.sourceEnd = mid + keep / 2;
      }
    }
  }

  if (/zoom/.test(text)) {
    const start = sel?.start ?? plan.duration * 0.3;
    plan.zooms.push({
      id: `zoom_${Date.now()}`,
      start,
      end: start + 1.1,
      scale: /subtle/.test(text) ? 1.06 : 1.12,
      x: 0.5,
      y: 0.45,
    });
  }

  if (/caption.*small|smaller/.test(text)) {
    plan.captions = plan.captions.map((c) => ({
      ...c,
      fontSize: Math.max(18, (c.fontSize ?? 44) - 8),
    }));
  }

  if (/energetic|music/.test(text)) {
    plan.music = {
      trackId: "upbeat_01",
      volume: 0.18,
      startAt: 0,
      fadeIn: 0.3,
      fadeOut: 0.6,
    };
  }

  return normalizeEditPlan(plan, input.sourceDuration);
}

function mapSourceToTimeline(
  clips: EditPlan["clips"],
  sourceStart: number,
  sourceEnd: number
) {
  for (const clip of clips) {
    const overlapStart = Math.max(sourceStart, clip.sourceStart);
    const overlapEnd = Math.min(sourceEnd, clip.sourceEnd);
    if (overlapEnd <= overlapStart) continue;
    const speed = clip.speed || 1;
    const start = clip.timelineStart + (overlapStart - clip.sourceStart) / speed;
    const end = clip.timelineStart + (overlapEnd - clip.sourceStart) / speed;
    return {
      start: Number(start.toFixed(3)),
      end: Number(Math.max(start + 0.15, end).toFixed(3)),
    };
  }
  return null;
}

async function generateWithOpenAI(input: {
  prompt: string;
  format: VideoFormat;
  aestheticId: AestheticId;
  analysis: VideoAnalysis;
  sourceDuration: number;
  improve?: {
    instruction: string;
    currentPlan: EditPlan;
    selection?: { type: string; id?: string; start?: number; end?: number };
  };
}): Promise<EditPlan | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const style = getStyle(input.aestheticId);
  const schemaHint = {
    sourceDuration: "number",
    format: "vertical_9_16|landscape_16_9",
    aestheticId: input.aestheticId,
    duration: "number",
    clips: [
      {
        id: "clip_1",
        sourceStart: 0,
        sourceEnd: 1,
        timelineStart: 0,
        timelineEnd: 1,
        speed: 1,
        action: "keep",
        reason: "string",
      },
    ],
    cuts: [],
    captions: [
      {
        id: "cap_1",
        start: 0,
        end: 1,
        text: "string",
        style: style.captionStyle,
        fontId: style.fontId,
        fontSize: 44,
        x: 0.5,
        y: 0.78,
        animation: "none",
      },
    ],
    textOverlays: [],
    stickers: [],
    zooms: [],
    music: style.musicTrackId
      ? { trackId: style.musicTrackId, volume: style.musicVolume, startAt: 0, fadeIn: 0.4, fadeOut: 0.8 }
      : null,
  };

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a professional short-form video editor. Return ONLY JSON matching this shape: ${JSON.stringify(schemaHint)}.
Rules: continuous timeline from 0; never invent source times beyond sourceDuration; cut awkward pauses; captions from transcript; respect aesthetic style ${style.name} (${JSON.stringify(style)}).`,
      },
      {
        role: "user",
        content: JSON.stringify({
          prompt: input.prompt,
          format: input.format,
          sourceDuration: input.sourceDuration,
          transcript: input.analysis.transcript.segments,
          silences: input.analysis.silences,
          highlights: input.analysis.highlightCandidates.slice(0, 12),
          improve: input.improve ?? null,
        }),
      },
    ],
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  const validated = validateEditPlan(raw);
  if (!validated.success) {
    console.warn("LLM plan invalid", validated.error);
    return null;
  }
  return normalizeEditPlan(validated.data, input.sourceDuration);
}
