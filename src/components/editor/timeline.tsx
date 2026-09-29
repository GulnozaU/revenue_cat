"use client";

import { useMemo, useRef } from "react";
import { useProjectStore } from "@/store/project-store";
import { cn, formatTimecode } from "@/lib/utils";
import { getTrack } from "@/lib/music/library";

const PX_PER_SEC = 48;

export function Timeline() {
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const selection = useProjectStore((s) => s.selection);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const setSelection = useProjectStore((s) => s.setSelection);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const scrollRef = useRef<HTMLDivElement>(null);

  const plan = project?.editPlan;
  const duration = plan?.duration ?? 1;
  const width = Math.max(600, duration * PX_PER_SEC + 80);

  const ticks = useMemo(() => {
    const step = duration > 40 ? 5 : duration > 20 ? 2 : 1;
    const out: number[] = [];
    for (let t = 0; t <= duration; t += step) out.push(t);
    return out;
  }, [duration]);

  if (!plan) return null;

  const onRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
    const t = Math.max(0, Math.min(duration, x / PX_PER_SEC));
    setIsPlaying(false);
    setPlayhead(t);
  };

  return (
    <div className="flex h-[220px] shrink-0 flex-col border-t border-[var(--editor-border)] bg-[var(--editor-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-4 py-1.5">
        <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
          Timeline
        </p>
        <p className="font-mono text-[11px] text-[var(--editor-muted)]">
          {formatTimecode(playhead)}
        </p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="relative min-w-full p-3" style={{ width }}>
          {/* Ruler */}
          <div
            className="relative mb-2 h-6 cursor-pointer"
            style={{ width }}
            onClick={onRulerClick}
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 text-[10px] text-[var(--editor-subtle)]"
                style={{ left: t * PX_PER_SEC }}
              >
                <div className="h-2 w-px bg-[var(--editor-border)]" />
                {formatTimecode(t)}
              </div>
            ))}
          </div>

          <TrackLabel label="Video">
            <div
              className="relative h-10 rounded-lg bg-[var(--editor-track)]"
              style={{ width }}
              onClick={onRulerClick}
            >
              {plan.clips.map((clip) => (
                <button
                  key={clip.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelection({ type: "clip", id: clip.id! });
                    setPlayhead(clip.timelineStart);
                  }}
                  className={cn(
                    "absolute top-1 bottom-1 overflow-hidden rounded-md px-2 text-left text-[10px] text-white/90",
                    "bg-[var(--editor-clip)] hover:brightness-110",
                    selection?.type === "clip" &&
                      selection.id === clip.id &&
                      "ring-2 ring-[var(--editor-accent)]"
                  )}
                  style={{
                    left: clip.timelineStart * PX_PER_SEC,
                    width: Math.max(
                      8,
                      (clip.timelineEnd - clip.timelineStart) * PX_PER_SEC
                    ),
                  }}
                  title={clip.reason}
                >
                  <span className="block truncate">
                    {(clip.speed ?? 1) !== 1
                      ? `${(clip.speed ?? 1).toFixed(2)}× `
                      : ""}
                    {clip.reason ?? "Clip"}
                  </span>
                </button>
              ))}
            </div>
          </TrackLabel>

          <TrackLabel label="Captions">
            <div
              className="relative h-8 rounded-lg bg-[var(--editor-track)]"
              style={{ width }}
            >
              {plan.captions.map((cap) => (
                <button
                  key={cap.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelection({ type: "caption", id: cap.id! });
                    setPlayhead(cap.start);
                  }}
                  className={cn(
                    "absolute top-1 bottom-1 overflow-hidden rounded px-1.5 text-left text-[9px] text-white/85",
                    "bg-[var(--editor-caption)]",
                    selection?.type === "caption" &&
                      selection.id === cap.id &&
                      "ring-2 ring-[var(--editor-accent)]"
                  )}
                  style={{
                    left: cap.start * PX_PER_SEC,
                    width: Math.max(6, (cap.end - cap.start) * PX_PER_SEC),
                  }}
                >
                  <span className="block truncate">{cap.text}</span>
                </button>
              ))}
            </div>
          </TrackLabel>

          <TrackLabel label="Zooms">
            <div
              className="relative h-6 rounded-lg bg-[var(--editor-track)]"
              style={{ width }}
            >
              {plan.zooms.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelection({ type: "zoom", id: z.id! });
                    setPlayhead(z.start);
                  }}
                  className={cn(
                    "absolute top-0.5 bottom-0.5 rounded bg-[var(--editor-zoom)] text-[9px] text-white/80",
                    selection?.type === "zoom" &&
                      selection.id === z.id &&
                      "ring-2 ring-[var(--editor-accent)]"
                  )}
                  style={{
                    left: z.start * PX_PER_SEC,
                    width: Math.max(6, (z.end - z.start) * PX_PER_SEC),
                  }}
                />
              ))}
            </div>
          </TrackLabel>

          <TrackLabel label="Music">
            <div
              className="relative h-7 rounded-lg bg-[var(--editor-track)]"
              style={{ width }}
            >
              {plan.music && (
                <button
                  type="button"
                  onClick={() => setSelection({ type: "music" })}
                  className={cn(
                    "absolute inset-y-1 left-0 rounded-md bg-[var(--editor-music)] px-2 text-left text-[10px] text-white/85",
                    selection?.type === "music" &&
                      "ring-2 ring-[var(--editor-accent)]"
                  )}
                  style={{ width: duration * PX_PER_SEC }}
                >
                  {getTrack(plan.music.trackId).name} · vol{" "}
                  {Math.round(plan.music.volume * 100)}%
                </button>
              )}
            </div>
          </TrackLabel>

          {/* Playhead */}
          <div
            className="pointer-events-none absolute bottom-3 top-3 w-px bg-[var(--editor-accent)]"
            style={{ left: 12 + playhead * PX_PER_SEC }}
          >
            <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--editor-accent)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex gap-2">
      <div className="w-16 shrink-0 pt-2 text-[10px] text-[var(--editor-subtle)]">
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
