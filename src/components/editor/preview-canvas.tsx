"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import {
  activeCaption,
  activeTexts,
  activeZoom,
  timelineToSource,
} from "@/lib/renderer/timeline";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";
import { formatTimecode, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PreviewCanvas() {
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);

  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const plan = project?.editPlan;
  const asset = project?.assets[0];
  const format = project?.format ?? "instagram_reel";
  const aspect = FORMAT_PRESETS[format].aspect === "9:16" ? "9/16" : "16/9";

  const mapping = plan ? timelineToSource(plan, playhead) : null;
  const caption = plan ? activeCaption(plan, playhead) : null;
  const zoom = plan ? activeZoom(plan, playhead) : null;
  const texts = plan ? activeTexts(plan, playhead) : [];

  // Sync video element to source time from edit plan
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mapping || !videoReady) return;
    if (Math.abs(video.currentTime - mapping.sourceTime) > 0.12) {
      try {
        video.currentTime = mapping.sourceTime;
      } catch {
        /* ignore seek errors */
      }
    }
  }, [mapping?.sourceTime, videoReady]);

  // Playback loop advances timeline playhead
  useEffect(() => {
    if (!isPlaying || !plan) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTs.current = null;
      videoRef.current?.pause();
      return;
    }

    videoRef.current?.play().catch(() => undefined);

    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      const next = playheadRef.current + dt;
      if (next >= plan.duration) {
        setPlayhead(plan.duration);
        setIsPlaying(false);
        return;
      }
      setPlayhead(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, plan, setIsPlaying, setPlayhead]);

  const playheadRef = useRef(playhead);
  playheadRef.current = playhead;

  if (!plan || !asset) return null;

  const scale = zoom?.scale ?? 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#0c0e10]">
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
          style={{
            aspectRatio: aspect,
            height: "min(58vh, 640px)",
            maxWidth: "100%",
          }}
        >
          <div
            className="absolute inset-0 transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: `${(zoom?.x ?? 0.5) * 100}% ${(zoom?.y ?? 0.45) * 100}%`,
            }}
          >
            <video
              ref={videoRef}
              src={asset.url}
              muted
              playsInline
              className="h-full w-full object-cover"
              onLoadedData={() => setVideoReady(true)}
            />
          </div>

          {texts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-none absolute px-4 text-center"
              style={{
                left: `${t.x * 100}%`,
                top: `${t.y * 100}%`,
                transform: "translate(-50%, -50%)",
                fontFamily: "var(--font-display)",
                fontSize: `clamp(16px, ${t.fontSize * 0.35}px, 42px)`,
                color: t.color,
                fontWeight: 700,
              }}
            >
              {t.text}
            </div>
          ))}

          {caption && (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-4 text-center",
                caption.style === "boxed" &&
                  "rounded-xl bg-black/50 px-3 py-2 backdrop-blur-sm",
                caption.style === "outline" && "drop-shadow-[0_0_2px_#000]"
              )}
              style={{
                top: `${(caption.y ?? 0.78) * 100}%`,
                left: `${(caption.x ?? 0.5) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: "85%",
              }}
            >
              <p
                className={cn(
                  "font-display leading-snug text-white",
                  caption.style === "minimal" && "font-medium",
                  caption.style === "clean_bold" && "font-bold",
                  caption.style === "kinetic" && "font-extrabold tracking-tight"
                )}
                style={{
                  fontSize: `clamp(14px, ${(caption.fontSize ?? 42) * 0.32}px, 28px)`,
                  WebkitTextStroke:
                    caption.style === "outline" ? "1px rgba(0,0,0,0.6)" : undefined,
                }}
              >
                {caption.text}
              </p>
            </div>
          )}

          {!mapping && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white/70">
              End of timeline
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-[var(--editor-border)] bg-[var(--editor-panel)] px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--editor-muted)] hover:text-[var(--editor-fg)] hover:bg-[var(--editor-panel-2)]"
          onClick={() => {
            setIsPlaying(false);
            setPlayhead(0);
          }}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <span className="min-w-[110px] text-center font-mono text-xs text-[var(--editor-muted)]">
          {formatTimecode(playhead)} / {formatTimecode(plan.duration)}
        </span>
      </div>
    </div>
  );
}
