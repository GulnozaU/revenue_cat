"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import { formatTimecode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";

/**
 * Preview plays the REAL rendered MP4 from the edit plan.
 * Timeline edits that haven't been re-rendered yet still show the last render
 * until the user hits Preview/Apply (re-render).
 */
export function PreviewCanvas() {
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const rendering = useProjectStore((s) => s.rendering);
  const renderProgress = useProjectStore((s) => s.renderProgress);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const plan = project?.editPlan;
  // Prefer real rendered blob; fall back to source only as last resort
  const src = project?.previewUrl || project?.assets[0]?.sourceUrl;
  const format = project?.format ?? "instagram_reel";
  const aspect = FORMAT_PRESETS[format].aspect === "9:16" ? "9/16" : "16/9";

  // Seek video when playhead changes from timeline (and not playing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready || isPlaying) return;
    if (Math.abs(video.currentTime - playhead) > 0.15) {
      video.currentTime = playhead;
    }
  }, [playhead, ready, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    setReady(false);
  }, [src]);

  if (!plan || !src) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0c0e10] text-[var(--editor-muted)]">
        No preview yet
      </div>
    );
  }

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
          <video
            key={src}
            ref={videoRef}
            src={src}
            className="h-full w-full object-contain bg-black"
            playsInline
            onLoadedData={() => setReady(true)}
            onTimeUpdate={() => {
              if (!videoRef.current || !isPlaying) return;
              setPlayhead(videoRef.current.currentTime);
            }}
            onEnded={() => setIsPlaying(false)}
          />
          {rendering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 px-4 text-center text-sm text-white">
              <span>{renderProgress?.message || "Rendering with ffmpeg.wasm…"}</span>
              {renderProgress && (
                <span className="text-xs opacity-80">
                  {Math.round(renderProgress.ratio * 100)}%
                </span>
              )}
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
            if (videoRef.current) videoRef.current.currentTime = 0;
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
