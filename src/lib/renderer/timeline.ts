import type { EditPlan } from "@/lib/types/edit-plan";

export function timelineToSource(
  plan: EditPlan,
  timelineTime: number
): { sourceTime: number; clipId: string } | null {
  for (const clip of plan.clips) {
    if (timelineTime >= clip.timelineStart && timelineTime < clip.timelineEnd) {
      const speed = clip.speed ?? 1;
      const offset = (timelineTime - clip.timelineStart) * speed;
      return {
        sourceTime: clip.sourceStart + offset,
        clipId: clip.id ?? "",
      };
    }
  }
  const last = plan.clips[plan.clips.length - 1];
  if (!last) return null;
  if (Math.abs(timelineTime - last.timelineEnd) < 0.05) {
    return { sourceTime: last.sourceEnd, clipId: last.id ?? "" };
  }
  return null;
}

export function activeCaption(plan: EditPlan, t: number) {
  return plan.captions.find((c) => t >= c.start && t < c.end) ?? null;
}

export function activeZoom(plan: EditPlan, t: number) {
  return plan.zooms.find((z) => t >= z.start && z.end > t) ?? null;
}

export function activeTexts(plan: EditPlan, t: number) {
  return (plan.textOverlays ?? []).filter((x) => t >= x.start && t < x.end);
}

export function activeStickers(plan: EditPlan, t: number) {
  return (plan.stickers ?? []).filter((x) => t >= x.start && t < x.end);
}
