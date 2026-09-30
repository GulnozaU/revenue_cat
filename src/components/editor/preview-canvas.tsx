"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import { formatTimecode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";
import {
  activeCaption,
  activeStickers,
  activeTexts,
  activeZoom,
  timelineToSource,
} from "@/lib/renderer/timeline";
import { getFont, getMusicTrack, getSticker } from "@/lib/assets/library";

/**
 * Interactive preview: REAL source footage + EditPlan overlays.
 * FFmpeg.wasm only on Apply preview / Export.
 */
export function PreviewCanvas() {
  const project = useProjectStore((s) => s.project);
  const sourceFile = useProjectStore((s) => s.sourceFile);
  const playhead = useProjectStore((s) => s.playhead);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const setIsPlaying = useProjectStore((s) => s.setIsPlaying);
  const rendering = useProjectStore((s) => s.rendering);
  const renderProgress = useProjectStore((s) => s.renderProgress);
  const selection = useProjectStore((s) => s.selection);
  const setSelection = useProjectStore((s) => s.setSelection);
  const preferRenderedPreview = useProjectStore((s) => s.preferRenderedPreview);

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const playheadRef = useRef(playhead);
  const [ready, setReady] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const plan = project?.editPlan;
  const format = project?.format ?? "instagram_reel";
  const aspect = FORMAT_PRESETS[format].aspect === "9:16" ? "9/16" : "16/9";

  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);

  useEffect(() => {
    if (sourceFile) {
      const url = URL.createObjectURL(sourceFile);
      setSourceUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setSourceUrl(project?.assets[0]?.sourceUrl ?? null);
  }, [sourceFile, project?.assets]);

  const useRendered =
    preferRenderedPreview && Boolean(project?.previewUrl?.startsWith("blob:"));
  const displaySrc = useRendered ? project!.previewUrl! : sourceUrl;

  const caption = plan ? activeCaption(plan, playhead) : null;
  const texts = plan ? activeTexts(plan, playhead) : [];
  const stickers = plan ? activeStickers(plan, playhead) : [];
  const zoom = plan ? activeZoom(plan, playhead) : null;
  const zoomScale = zoom?.scale ?? 1;

  useEffect(() => {
    if (!plan || useRendered) return;

    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      musicRef.current?.pause();
      return;
    }

    let last = performance.now();
    musicRef.current?.play().catch(() => undefined);

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
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
  }, [isPlaying, plan, useRendered, setPlayhead, setIsPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !plan || !ready || useRendered) return;
    const mapped = timelineToSource(plan, playhead);
    if (!mapped) return;
    if (Math.abs(video.currentTime - mapped.sourceTime) > 0.12) {
      try {
        video.currentTime = mapped.sourceTime;
      } catch {
        /* ignore seek errors while loading */
      }
    }
  }, [playhead, plan, ready, useRendered]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (useRendered) {
      video.muted = false;
      if (isPlaying) video.play().catch(() => undefined);
      else video.pause();
    } else {
      video.muted = true;
      video.pause();
    }
  }, [isPlaying, useRendered]);

  useEffect(() => {
    setReady(false);
  }, [displaySrc]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio || !plan?.music) return;
    if (Math.abs(audio.currentTime - playhead) > 0.25) {
      audio.currentTime = Math.max(0, playhead);
    }
    audio.volume = plan.music.volume ?? 0.28;
  }, [playhead, plan?.music]);

  if (!plan || !displaySrc) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0c0e10] text-[var(--editor-muted)]">
        No preview yet
      </div>
    );
  }

  const fontFamily = caption
    ? `"${getFont(caption.fontId).name}", Arial, sans-serif`
    : "Arial, sans-serif";

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
            className="absolute inset-0 origin-center transition-transform duration-500 ease-out"
            style={{ transform: `scale(${zoomScale})` }}
          >
            <video
              key={displaySrc}
              ref={videoRef}
              src={displaySrc}
              className="h-full w-full object-cover bg-black"
              playsInline
              muted={!useRendered}
              onLoadedData={() => setReady(true)}
              onEnded={() => {
                if (useRendered) setIsPlaying(false);
              }}
              onTimeUpdate={() => {
                if (!useRendered || !videoRef.current || !isPlaying) return;
                setPlayhead(videoRef.current.currentTime);
              }}
            />
          </div>

          {!useRendered && (
            <>
              {texts.map((t) => (
                <div
                  key={t.id}
                  className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 text-center font-bold text-white"
                  style={{
                    top: `${t.y * 100}%`,
                    fontSize: `clamp(18px, ${t.fontSize / 18}px, 36px)`,
                    fontFamily: `"${getFont(t.fontId).name}", Arial, sans-serif`,
                    textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                    color: t.color || "#fff",
                  }}
                >
                  {t.text}
                </div>
              ))}

              {caption && (
                <button
                  type="button"
                  className={`absolute left-1/2 z-20 max-w-[88%] -translate-x-1/2 rounded-xl px-3 py-1.5 text-center font-semibold text-white ${
                    selection?.type === "caption" && selection.id === caption.id
                      ? "ring-2 ring-[var(--editor-accent)]"
                      : ""
                  }`}
                  style={{
                    top: `${(caption.y ?? 0.78) * 100}%`,
                    fontSize: `clamp(14px, ${(caption.fontSize || 44) / 20}px, 28px)`,
                    fontFamily,
                    textShadow: "0 2px 10px rgba(0,0,0,0.75)",
                    background:
                      caption.style === "boxed"
                        ? "rgba(0,0,0,0.45)"
                        : "transparent",
                  }}
                  onClick={() =>
                    setSelection({ type: "caption", id: caption.id })
                  }
                >
                  {caption.text}
                </button>
              )}

              {stickers.map((s) => {
                const asset = getSticker(s.assetId);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 ${
                      selection?.type === "sticker" && selection.id === s.id
                        ? "ring-2 ring-[var(--editor-accent)] rounded-lg"
                        : ""
                    }`}
                    style={{
                      left: `${s.x * 100}%`,
                      top: `${s.y * 100}%`,
                      width: `${Math.max(8, s.scale * 28)}%`,
                      transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
                    }}
                    onClick={() =>
                      setSelection({ type: "sticker", id: s.id })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="h-auto w-full drop-shadow-lg"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </>
          )}

          {plan.music?.trackId && !useRendered && (
            <audio
              ref={musicRef}
              src={getMusicTrack(plan.music.trackId).url}
              preload="auto"
              loop
            />
          )}

          {rendering && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/50 px-4 text-center text-sm text-white">
              <span>
                {renderProgress?.message || "Rendering with ffmpeg.wasm…"}
              </span>
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
            if (musicRef.current) musicRef.current.currentTime = 0;
          }}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <span className="min-w-[110px] text-center font-mono text-xs text-[var(--editor-muted)]">
          {formatTimecode(playhead)} / {formatTimecode(plan.duration)}
        </span>
      </div>
    </div>
  );
}
