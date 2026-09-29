import {
  type EditPlan,
  type VideoAnalysis,
  type VideoFormat,
  FORMAT_PRESETS,
  validateEditPlan,
  normalizeEditPlan,
} from "@/lib/types/edit-plan";

export type EditPlanRequest = {
  prompt: string;
  format: VideoFormat;
  analysis: VideoAnalysis;
  improve?: {
    selection?: {
      type: "clip" | "caption" | "zoom" | "music" | "range";
      id?: string;
      start?: number;
      end?: number;
    };
    instruction: string;
    currentPlan: EditPlan;
  };
};

function buildMockPlan(req: EditPlanRequest): EditPlan {
  const { analysis, format, prompt, improve } = req;
  const ratio = FORMAT_PRESETS[format].ratio as EditPlan["format"];
  const duration = analysis.metadata.duration;
  const highlights = analysis.highlightCandidates.slice(0, 5);

  if (improve) {
    return applyMockImprove(improve.currentPlan, improve.instruction, improve.selection);
  }

  const energetic = /fast|energetic|pace|upbeat|reel|lifestyle/i.test(prompt);
  const keepFunny = /funny|humor|laugh/i.test(prompt);
  const addZooms = /zoom|punch|emphas/i.test(prompt) || energetic;
  const addCaptions = /caption|subtitle|text/i.test(prompt) || true;

  const selected =
    highlights.length > 0
      ? highlights
      : analysis.transcript.segments.map((s) => ({
          start: s.start,
          end: s.end,
          score: 0.5,
          reason: "Spoken segment",
        }));

  // Prefer stronger moments; skip long silences by using segment bounds.
  let timelineCursor = 0;
  const clips: EditPlan["clips"] = [];

  const sorted = [...selected].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    let start = Math.max(0, h.start - (energetic ? 0.15 : 0.25));
    let end = Math.min(duration, h.end + (energetic ? 0.1 : 0.2));

    // Merge tiny gaps for smoother cuts when not ultra-fast
    if (!energetic && i > 0) {
      const prev = sorted[i - 1];
      if (h.start - prev.end < 0.35) {
        start = prev.end;
      }
    }

    // Skip awkward silence interiors
    for (const sil of analysis.silences) {
      if (sil.duration < 0.5) continue;
      if (start < sil.start && end > sil.end) {
        // split would be better; trim into silence edge for MVP
        if (sil.start - start > end - sil.end) end = sil.start;
        else start = sil.end;
      }
    }

    if (end - start < 0.4) continue;

    const speed = energetic && keepFunny && /funny|laugh/i.test(h.reason) ? 1 : energetic ? 1.05 : 1;
    const tlLen = (end - start) / speed;
    clips.push({
      id: `clip_${clips.length + 1}`,
      sourceStart: Number(start.toFixed(2)),
      sourceEnd: Number(end.toFixed(2)),
      timelineStart: Number(timelineCursor.toFixed(2)),
      timelineEnd: Number((timelineCursor + tlLen).toFixed(2)),
      speed,
      reason: h.reason,
    });
    timelineCursor += tlLen;
  }

  if (clips.length === 0) {
    const take = Math.min(duration, energetic ? 18 : 28);
    clips.push({
      id: "clip_1",
      sourceStart: 0,
      sourceEnd: take,
      timelineStart: 0,
      timelineEnd: take,
      speed: 1,
      reason: "Full take fallback",
    });
    timelineCursor = take;
  }

  // Deduplicate overlapping source ranges lightly
  const cleaned = mergeNearbyClips(clips);

  const captions: EditPlan["captions"] = [];
  if (addCaptions) {
    for (const seg of analysis.transcript.segments) {
      const mapped = mapSourceToTimeline(cleaned, seg.start, seg.end);
      if (!mapped) continue;
      const short = seg.text.length > 42 ? seg.text.slice(0, 40) + "…" : seg.text;
      captions.push({
        id: `cap_${captions.length + 1}`,
        start: mapped.start,
        end: mapped.end,
        text: short,
        style: energetic ? "clean_bold" : "minimal",
        fontSize: energetic ? 44 : 38,
        x: 0.5,
        y: 0.78,
      });
    }
  }

  const zooms: EditPlan["zooms"] = [];
  if (addZooms) {
    for (let i = 0; i < cleaned.length; i++) {
      if (i % 2 === 1 || /emphas|strong|memorable|energy/i.test(cleaned[i].reason ?? "")) {
        const mid = (cleaned[i].timelineStart + cleaned[i].timelineEnd) / 2;
        zooms.push({
          id: `zoom_${zooms.length + 1}`,
          start: Number((mid - 0.35).toFixed(2)),
          end: Number((mid + 0.55).toFixed(2)),
          scale: energetic ? 1.1 : 1.06,
          x: 0.5,
          y: 0.45,
        });
      }
    }
  }

  const wantsMusic = /music|soundtrack|beat|energetic|upbeat|lifestyle/i.test(prompt);

  return normalizeEditPlan(
    {
      format: ratio,
      duration: cleaned[cleaned.length - 1]?.timelineEnd ?? timelineCursor,
      clips: cleaned,
      captions,
      zooms,
      texts: [],
      music: wantsMusic
        ? { trackId: "upbeat_01", volume: 0.12, fadeIn: 0.4, fadeOut: 0.8 }
        : { trackId: "upbeat_01", volume: 0.1, fadeIn: 0.3, fadeOut: 0.6 },
      styleNotes: `Mock plan from prompt: ${prompt.slice(0, 120)}`,
    },
    duration
  );
}

function mergeNearbyClips(clips: EditPlan["clips"]): EditPlan["clips"] {
  if (clips.length <= 1) return clips;
  const out: EditPlan["clips"] = [];
  let cur = { ...clips[0] };
  for (let i = 1; i < clips.length; i++) {
    const next = clips[i];
    const sourceGap = next.sourceStart - cur.sourceEnd;
    if (sourceGap >= 0 && sourceGap < 0.25 && cur.speed === next.speed) {
      const extra = next.timelineEnd - next.timelineStart;
      cur = {
        ...cur,
        sourceEnd: next.sourceEnd,
        timelineEnd: cur.timelineEnd + extra,
        reason: cur.reason,
      };
    } else {
      out.push(cur);
      // retime timeline continuity
      const len = next.timelineEnd - next.timelineStart;
      const start = out[out.length - 1]?.timelineEnd ?? 0;
      cur = {
        ...next,
        timelineStart: start,
        timelineEnd: start + len,
      };
    }
  }
  out.push(cur);
  return out.map((c, i) => ({ ...c, id: `clip_${i + 1}` }));
}

function mapSourceToTimeline(
  clips: EditPlan["clips"],
  sourceStart: number,
  sourceEnd: number
): { start: number; end: number } | null {
  for (const clip of clips) {
    const overlapStart = Math.max(sourceStart, clip.sourceStart);
    const overlapEnd = Math.min(sourceEnd, clip.sourceEnd);
    if (overlapEnd <= overlapStart) continue;
    const speed = clip.speed ?? 1;
    const start =
      clip.timelineStart + (overlapStart - clip.sourceStart) / speed;
    const end = clip.timelineStart + (overlapEnd - clip.sourceStart) / speed;
    return {
      start: Number(start.toFixed(2)),
      end: Number(Math.max(start + 0.2, end).toFixed(2)),
    };
  }
  return null;
}

function applyMockImprove(
  plan: EditPlan,
  instruction: string,
  selection?: EditPlanRequest["improve"] extends infer I
    ? I extends { selection?: infer S }
      ? S
      : never
    : never
): EditPlan {
  const next: EditPlan = structuredClone(plan);
  const text = instruction.toLowerCase();

  if (selection?.type === "clip" && selection.id) {
    const clip = next.clips.find((c) => c.id === selection.id);
    if (clip) {
      if (/faster|speed|pace|energetic/.test(text)) {
        clip.speed = Math.min(2, (clip.speed ?? 1) * 1.25);
        const len = (clip.sourceEnd - clip.sourceStart) / clip.speed;
        clip.timelineEnd = clip.timelineStart + len;
      }
      if (/slower|calm/.test(text)) {
        clip.speed = Math.max(0.75, (clip.speed ?? 1) * 0.85);
        const len = (clip.sourceEnd - clip.sourceStart) / clip.speed;
        clip.timelineEnd = clip.timelineStart + len;
      }
      if (/boring|remove|cut|trim/.test(text)) {
        const mid = (clip.sourceStart + clip.sourceEnd) / 2;
        const keep = Math.max(0.6, (clip.sourceEnd - clip.sourceStart) * 0.55);
        clip.sourceStart = mid - keep / 2;
        clip.sourceEnd = mid + keep / 2;
        const len = (clip.sourceEnd - clip.sourceStart) / (clip.speed ?? 1);
        clip.timelineEnd = clip.timelineStart + len;
      }
    }
  }

  if (selection?.type === "caption" && selection.id) {
    const cap = next.captions.find((c) => c.id === selection.id);
    if (cap) {
      if (/smaller|tiny/.test(text)) cap.fontSize = Math.max(18, (cap.fontSize ?? 42) - 8);
      if (/bigger|larger|emphas/.test(text))
        cap.fontSize = Math.min(72, (cap.fontSize ?? 42) + 8);
      if (/bold|punch/.test(text)) cap.style = "clean_bold";
    }
  }

  if (/zoom/.test(text)) {
    const start = selection?.start ?? next.duration * 0.3;
    const end = selection?.end ?? start + 1.2;
    next.zooms.push({
      id: `zoom_${next.zooms.length + 1}`,
      start,
      end,
      scale: /subtle/.test(text) ? 1.06 : 1.12,
      x: 0.5,
      y: 0.45,
    });
  }

  if (/music|energetic|upbeat/.test(text) && next.music) {
    next.music.volume = Math.min(0.28, next.music.volume + 0.04);
    next.music.trackId = "upbeat_01";
  }

  if (/caption.*small|smaller caption/.test(text)) {
    next.captions = next.captions.map((c) => ({
      ...c,
      fontSize: Math.max(18, (c.fontSize ?? 42) - 6),
    }));
  }

  // Re-pack timeline after speed/trim changes
  let cursor = 0;
  next.clips = next.clips.map((c, i) => {
    const len = (c.sourceEnd - c.sourceStart) / (c.speed ?? 1);
    const updated = {
      ...c,
      id: c.id ?? `clip_${i + 1}`,
      timelineStart: Number(cursor.toFixed(2)),
      timelineEnd: Number((cursor + len).toFixed(2)),
    };
    cursor += len;
    return updated;
  });
  next.duration = cursor;

  return next;
}

async function generateWithLLM(req: EditPlanRequest): Promise<EditPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const system = `You are an expert video editor. Output ONLY valid JSON matching this schema:
{
  "format": "vertical_9_16" | "landscape_16_9",
  "duration": number,
  "clips": [{ "sourceStart", "sourceEnd", "timelineStart", "timelineEnd", "speed?", "reason?" }],
  "captions": [{ "start", "end", "text", "style": "clean_bold"|"minimal"|"kinetic"|"boxed"|"outline", "fontSize?" }],
  "zooms": [{ "start", "end", "scale", "x?", "y?" }],
  "texts": [],
  "music": { "trackId": "upbeat_01"|"chill_01"|"cinematic_01", "volume": 0-1 } | null,
  "styleNotes": string
}
Rules:
- Prefer human pacing: cut silences, keep strong lines, avoid machine-gun cuts unless asked.
- timeline must be continuous from 0 without gaps.
- Never invent source times beyond video duration.
- Captions should be short punchy phrases from the transcript.`;

  const userPayload = {
    prompt: req.prompt,
    format: req.format,
    duration: req.analysis.metadata.duration,
    transcript: req.analysis.transcript.segments,
    highlights: req.analysis.highlightCandidates.slice(0, 12),
    silences: req.analysis.silences,
    improve: req.improve ?? null,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("LLM edit plan failed", await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = JSON.parse(data.choices[0]?.message?.content ?? "{}");
    const validated = validateEditPlan(raw);
    if (!validated.success) {
      console.warn("Invalid LLM edit plan", validated.error);
      return null;
    }
    return normalizeEditPlan(validated.data, req.analysis.metadata.duration);
  } catch (err) {
    console.warn("LLM error", err);
    return null;
  }
}

export async function generateEditPlan(req: EditPlanRequest): Promise<{
  plan: EditPlan;
  provider: "openai" | "mock";
}> {
  const llm = await generateWithLLM(req);
  if (llm) return { plan: llm, provider: "openai" };

  const mock = buildMockPlan(req);
  const validated = validateEditPlan(mock);
  if (!validated.success) {
    throw new Error(`Mock plan invalid: ${validated.error}`);
  }
  return {
    plan: normalizeEditPlan(validated.data, req.analysis.metadata.duration),
    provider: "mock",
  };
}
