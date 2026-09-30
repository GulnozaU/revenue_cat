import type { AestheticId, EditPlan, VideoFormat } from "@/lib/types/edit-plan";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";
import { assertValidPlan, type GenerateEditPlanInput } from "@/lib/ai/provider";
import { stylePackForAesthetic } from "@/lib/assets/stylePacks";

/**
 * Deterministic Shipathon demo analyzer — no network calls.
 * Builds a cute ~20–30s Reel EditPlan from the real source duration.
 */
export async function generateEditPlanWithMock(
  input: GenerateEditPlanInput
): Promise<{ plan: EditPlan; provider: "mock" }> {
  // Short beat so the stage list can animate; the video stays in the browser.
  await sleep(700);

  if (input.improve) {
    const plan = applyMockImprove(
      input.improve.currentPlan,
      input.improve.instruction,
      input.improve.selection,
      input.sourceDuration
    );
    return { plan, provider: "mock" };
  }

  const plan = buildOceanReelEditPlan(
    input.sourceDuration,
    input.format,
    input.aestheticId || "cute"
  );
  return { plan: assertValidPlan(plan, input.sourceDuration), provider: "mock" };
}

function packStickers(aestheticId: AestheticId, outDuration: number) {
  const pack = stylePackForAesthetic(aestheticId);
  const ids = pack.assets.length ? pack.assets : ["sparkle", "flower", "heart", "star"];
  const slots = [
    { start: 2, end: Math.min(5, outDuration), x: 0.82, y: 0.18, scale: 0.32, rotation: -8 },
    { start: Math.min(8, outDuration * 0.4), end: Math.min(12, outDuration), x: 0.16, y: 0.24, scale: 0.3, rotation: 10 },
    { start: Math.min(15, outDuration * 0.7), end: Math.min(19, outDuration), x: 0.78, y: 0.7, scale: 0.26, rotation: 6 },
    { start: Math.min(6, outDuration * 0.3), end: Math.min(9, outDuration), x: 0.2, y: 0.68, scale: 0.22, rotation: -6 },
  ];
  return slots
    .map((slot, i) => ({
      id: `stk_${i + 1}`,
      assetId: ids[i % ids.length],
      ...slot,
      opacity: 1,
      animation: pack.animations[i % pack.animations.length] ?? "pop",
    }))
    .filter((s) => s.end > s.start + 0.2);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Percentage-based cut of the ocean (or any) footage into a cozy Reel.
 * sourceStart/sourceEnd are fractions of total duration, then clamped.
 */
export function buildOceanReelEditPlan(
  sourceDuration: number,
  format: VideoFormat,
  aestheticId: AestheticId
): EditPlan {
  const dur = Math.max(1, sourceDuration);

  const windows: Array<{
    a: number;
    b: number;
    transition: "fade" | "hard";
  }> = [
    { a: 0.05, b: 0.12, transition: "fade" },
    { a: 0.27, b: 0.34, transition: "hard" },
    { a: 0.48, b: 0.56, transition: "fade" },
    { a: 0.68, b: 0.76, transition: "hard" },
    { a: 0.86, b: 0.95, transition: "fade" },
  ];

  // If the video is short, pack denser windows so we still get ~5 beats
  const scaled =
    dur < 25
      ? [
          { a: 0.0, b: 0.22, transition: "fade" as const },
          { a: 0.22, b: 0.42, transition: "hard" as const },
          { a: 0.42, b: 0.62, transition: "fade" as const },
          { a: 0.62, b: 0.82, transition: "hard" as const },
          { a: 0.82, b: 1.0, transition: "fade" as const },
        ]
      : windows;

  let cursor = 0;
  const clips = scaled.map((w, i) => {
    let sourceStart = Number((w.a * dur).toFixed(3));
    let sourceEnd = Number((w.b * dur).toFixed(3));
    // Ensure minimum clip length
    if (sourceEnd - sourceStart < 0.4) {
      sourceEnd = Math.min(dur, sourceStart + 0.8);
    }
    sourceStart = clamp(sourceStart, 0, Math.max(0, dur - 0.25));
    sourceEnd = clamp(sourceEnd, sourceStart + 0.25, dur);
    const len = sourceEnd - sourceStart;
    const clip = {
      id: `clip_${i + 1}`,
      sourceStart,
      sourceEnd,
      timelineStart: Number(cursor.toFixed(3)),
      timelineEnd: Number((cursor + len).toFixed(3)),
      speed: 1,
      action: "keep" as const,
      reason: "Highlight moment",
    };
    cursor += len;
    return clip;
  });

  const outDuration = Number(cursor.toFixed(3));
  const cuts = clips.slice(1).map((c, i) => ({
    at: c.timelineStart,
    type: (scaled[i + 1]?.transition === "fade" ? "fade" : "hard") as
      | "fade"
      | "hard",
  }));

  const plan: EditPlan = {
    sourceDuration: dur,
    format: FORMAT_PRESETS[format]?.ratio ?? "vertical_9_16",
    aestheticId: aestheticId === "cute" ? "cute" : aestheticId,
    duration: outDuration,
    clips,
    cuts,
    captions: [
      {
        id: "cap_1",
        start: 0.5,
        end: Math.min(3.5, outDuration),
        text: "just a little reset 🌊",
        style: "soft_bold" as const,
        fontId: "chillax",
        fontSize: 44,
        x: 0.5,
        y: 0.78,
        animation: "fade" as const,
      },
      {
        id: "cap_2",
        start: Math.min(5.0, Math.max(0, outDuration - 4)),
        end: Math.min(8.5, outDuration),
        text: "slow down for a second",
        style: "soft_bold" as const,
        fontId: "chillax",
        fontSize: 42,
        x: 0.5,
        y: 0.78,
        animation: "fade" as const,
      },
      {
        id: "cap_3",
        start: Math.min(10.0, Math.max(0, outDuration - 6)),
        end: Math.min(14.5, outDuration),
        text: "you don't have to rush everything ✨",
        style: "soft_bold" as const,
        fontId: "chillax",
        fontSize: 40,
        x: 0.5,
        y: 0.78,
        animation: "fade" as const,
      },
      {
        id: "cap_4",
        start: Math.min(16.0, Math.max(0, outDuration - 5)),
        end: Math.min(21.0, outDuration),
        text: "a little moment for yourself",
        style: "soft_bold" as const,
        fontId: "chillax",
        fontSize: 42,
        x: 0.5,
        y: 0.78,
        animation: "fade" as const,
      },
    ].filter((c) => c.end > c.start + 0.2),
    textOverlays: [
      {
        id: "text_1",
        start: 0,
        end: Math.min(3, outDuration),
        text: "ocean reset",
        fontId: "chillax",
        fontSize: 56,
        color: "#FFFFFF",
        x: 0.5,
        y: 0.18,
      },
    ],
    stickers: packStickers(aestheticId, outDuration),
    zooms: [
      {
        id: "zoom_1",
        start: 1,
        end: Math.min(4, outDuration),
        scale: 1.08,
        x: 0.5,
        y: 0.45,
      },
      {
        id: "zoom_2",
        start: Math.min(10, outDuration * 0.45),
        end: Math.min(13, outDuration),
        scale: 1.06,
        x: 0.5,
        y: 0.5,
      },
      {
        id: "zoom_3",
        start: Math.min(17, outDuration * 0.75),
        end: Math.min(21, outDuration),
        scale: 1.1,
        x: 0.5,
        y: 0.48,
      },
    ].filter((z) => z.end > z.start + 0.2),
    music: {
      trackId: "ocean_dreams",
      volume: 0.28,
      startAt: 0,
      fadeIn: 0.6,
      fadeOut: 1.2,
    },
    styleNotes:
      "Cute cozy Instagram Reel — soft captions, sparkles, gentle pacing.",
  };

  return plan;
}

function applyMockImprove(
  current: EditPlan,
  instruction: string,
  selection: { type: string; id?: string } | undefined,
  sourceDuration: number
): EditPlan {
  const instr = instruction.trim();
  let plan: EditPlan = { ...current, captions: [...current.captions] };

  // Quoted text → set selected/first caption
  const quoted = instr.match(/[“"]([^”"]+)[”"]/);
  if (quoted?.[1]) {
    const id =
      selection?.type === "caption" && selection.id
        ? selection.id
        : plan.captions[0]?.id;
    if (id) {
      plan = {
        ...plan,
        captions: plan.captions.map((c) =>
          c.id === id ? { ...c, text: quoted[1].slice(0, 240) } : c
        ),
      };
    }
  } else if (/faster|speed/i.test(instr) && selection?.type === "clip") {
    plan = {
      ...plan,
      clips: plan.clips.map((c) =>
        c.id === selection.id ? { ...c, speed: 1.25 } : c
      ),
    };
  } else {
    plan = {
      ...plan,
      styleNotes: `${plan.styleNotes ?? ""} · ${instr}`.slice(0, 400),
    };
  }

  return assertValidPlan(plan, sourceDuration);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
