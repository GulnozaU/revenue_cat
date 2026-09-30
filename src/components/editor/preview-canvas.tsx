"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import { formatTimecode } from "@/lib/utils";
import { FORMAT_PRESETS } from "@/lib/types/edit-plan";
import {
  activeStickers,
  activeTexts,
  activeZoom,
  timelineToSource,
} from "@/lib/renderer/timeline";
import { getMusicTrack, getSticker } from "@/lib/assets/library";
import { fontCssFamily } from "@/data/fonts";

/**
 * Live preview of the real source file.
 * The video element plays natively (with audio). We only seek when the
 * playhead jumps to a new clip or the user scrubs — not every frame.
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
  const setEditPlanLocal = useProjectStore((s) => s.setEditPlanLocal);
  const preferRenderedPreview = useProjectStore((s) => s.preferRenderedPreview);

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef(playhead);
  const playingRef = useRef(isPlaying);
  const [ready, setReady] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const plan = project?.editPlan;
  const format = project?.format ?? "instagram_reel";
  const aspect = FORMAT_PRESETS[format].aspect === "9:16" ? "9/16" : "16/9";

  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

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

  const captions = plan
    ? plan.captions.filter((c) => playhead >= c.start && playhead < c.end)
    : [];
  const texts = plan ? activeTexts(plan, playhead) : [];
  const stickers = plan ? activeStickers(plan, playhead) : [];
  const zoom = plan ? activeZoom(plan, playhead) : null;
  const zoomScale = zoom?.scale ?? 1;

  // Start/stop real playback. Seek once, then let the decoder run.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !plan || !ready) return;

    if (useRendered) {
      video.muted = false;
      if (isPlaying) video.play().catch(() => undefined);
      else video.pause();
      return;
    }

    video.muted = false;
    video.volume = 1;

    if (!isPlaying) {
      video.pause();
      musicRef.current?.pause();
      return;
    }

    const mapped = timelineToSource(plan, playheadRef.current);
    if (mapped && Math.abs(video.currentTime - mapped.sourceTime) > 0.25) {
      video.currentTime = mapped.sourceTime;
    }
    video.play().catch(() => undefined);

    const music = musicRef.current;
    if (music && plan.music) {
      music.volume = Math.min(0.45, plan.music.volume ?? 0.22);
      if (Math.abs(music.currentTime - playheadRef.current) > 0.4) {
        music.currentTime = playheadRef.current;
      }
      music.play().catch(() => undefined);
    }
  }, [isPlaying, ready, plan, useRendered]);

  // Scrub only while paused — seeking during playback is what made it stutter.
  useEffect(() => {
    if (isPlaying || !ready || useRendered) return;
    const video = videoRef.current;
    if (!video || !plan) return;
    const mapped = timelineToSource(plan, playhead);
    if (!mapped) return;
    if (Math.abs(video.currentTime - mapped.sourceTime) > 0.2) {
      video.currentTime = mapped.sourceTime;
    }
  }, [playhead, isPlaying, ready, plan, useRendered]);

  useEffect(() => {
    setReady(false);
  }, [displaySrc]);

  const onSourceTime = () => {
    const video = videoRef.current;
    if (!video || !plan || useRendered || !playingRef.current) return;
    const t = video.currentTime;
    const clip = plan.clips.find(
      (c) => t >= c.sourceStart - 0.04 && t < c.sourceEnd - 0.03
    );
    if (!clip) {
      const idx = plan.clips.findIndex((c) => t >= c.sourceEnd - 0.08);
      const next = idx >= 0 ? plan.clips[idx + 1] : plan.clips[0];
      if (next && t >= (plan.clips[idx]?.sourceEnd ?? 0) - 0.08) {
        video.currentTime = next.sourceStart;
        setPlayhead(next.timelineStart);
        return;
      }
      setPlayhead(plan.duration);
      setIsPlaying(false);
      video.pause();
      return;
    }
    const speed = clip.speed || 1;
    setPlayhead(clip.timelineStart + (t - clip.sourceStart) / speed);
  };

  const dragLayer = (
    kind: "sticker" | "caption",
    id: string,
    event: React.PointerEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const frame = frameRef.current;
    const current = useProjectStore.getState().project?.editPlan;
    if (!frame || !current) return;
    setSelection(kind === "sticker" ? { type: "sticker", id } : { type: "caption", id });
    const rect = frame.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const latest = useProjectStore.getState().project?.editPlan;
      if (!latest) return;
      const x = clamp((ev.clientX - rect.left) / rect.width, 0.06, 0.94);
      const y = clamp((ev.clientY - rect.top) / rect.height, 0.06, 0.94);
      if (kind === "sticker") {
        setEditPlanLocal(
          {
            ...latest,
            stickers: latest.stickers.map((s) =>
              s.id === id ? { ...s, x, y } : s
            ),
          },
          false
        );
      } else {
        setEditPlanLocal(
          {
            ...latest,
            captions: latest.captions.map((c) =>
              c.id === id ? { ...c, x, y } : c
            ),
          },
          false
        );
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!plan || !displaySrc) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0c0e10] text-[var(--editor-muted)]">
        No preview yet
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#0c0e10]">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        <div
          ref={frameRef}
          data-preview-frame
          className="relative h-full max-h-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
          style={{ aspectRatio: aspect, maxWidth: "100%" }}
        >
          <div
            className="absolute inset-0 origin-center"
            style={{ transform: `scale(${zoomScale})` }}
          >
            <video
              key={displaySrc}
              ref={videoRef}
              src={displaySrc}
              className="h-full w-full object-cover bg-black"
              playsInline
              onLoadedData={() => setReady(true)}
              onTimeUpdate={onSourceTime}
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          {!useRendered && (
            <>
              {texts.map((t) => {
                const selected =
                  selection?.type === "text" && selection.id === t.id;
                return (
                  <div
                    key={t.id}
                    className={`absolute z-20 max-w-[88%] -translate-x-1/2 ${
                      selected ? "ring-2 ring-[var(--editor-accent)] rounded-lg" : ""
                    }`}
                    style={{
                      left: `${t.x * 100}%`,
                      top: `${t.y * 100}%`,
                    }}
                  >
                    {selected ? (
                      <input
                        autoFocus
                        value={t.text}
                        onChange={(e) =>
                          setEditPlanLocal(
                            {
                              ...plan,
                              textOverlays: plan.textOverlays.map((row) =>
                                row.id === t.id
                                  ? { ...row, text: e.target.value }
                                  : row
                              ),
                            },
                            false
                          )
                        }
                        className="w-[220px] bg-transparent text-center font-bold text-white outline-none"
                        style={{
                          fontFamily: fontCssFamily(t.fontId),
                          fontSize: "clamp(16px, 4.2cqw, 32px)",
                          textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="cursor-grab font-bold text-white active:cursor-grabbing"
                        style={{
                          fontFamily: fontCssFamily(t.fontId),
                          fontSize: "clamp(16px, 4.2cqw, 32px)",
                          textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                          color: t.color || "#fff",
                        }}
                        onPointerDown={(e) => {
                          setSelection({ type: "text", id: t.id });
                          dragLayer("caption", t.id, e);
                        }}
                      >
                        {t.text}
                      </button>
                    )}
                  </div>
                );
              })}

              {captions.map((caption) => {
                const selected =
                  selection?.type === "caption" && selection.id === caption.id;
                return (
                  <div
                    key={caption.id}
                    className={`absolute z-20 max-w-[88%] -translate-x-1/2 ${
                      selected ? "ring-2 ring-[var(--editor-accent)] rounded-lg" : ""
                    }`}
                    style={{
                      left: `${(caption.x ?? 0.5) * 100}%`,
                      top: `${(caption.y ?? 0.78) * 100}%`,
                    }}
                  >
                    {selected ? (
                      <input
                        autoFocus
                        value={caption.text}
                        onChange={(e) =>
                          setEditPlanLocal(
                            {
                              ...plan,
                              captions: plan.captions.map((row) =>
                                row.id === caption.id
                                  ? { ...row, text: e.target.value }
                                  : row
                              ),
                            },
                            false
                          )
                        }
                        className="w-[240px] bg-black/25 px-2 text-center font-semibold text-white outline-none"
                        style={{
                          fontFamily: fontCssFamily(caption.fontId),
                          fontSize: "clamp(13px, 3.6cqw, 26px)",
                          textShadow: "0 2px 10px rgba(0,0,0,0.75)",
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="cursor-grab px-2 font-semibold text-white active:cursor-grabbing"
                        style={{
                          fontFamily: fontCssFamily(caption.fontId),
                          fontSize: "clamp(13px, 3.6cqw, 26px)",
                          textShadow: "0 2px 10px rgba(0,0,0,0.75)",
                        }}
                        onPointerDown={(e) => dragLayer("caption", caption.id, e)}
                      >
                        {caption.text}
                      </button>
                    )}
                  </div>
                );
              })}

              {stickers.map((s) => {
                const asset = getSticker(s.assetId);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`absolute z-20 cursor-grab active:cursor-grabbing ${
                      selection?.type === "sticker" && selection.id === s.id
                        ? "ring-2 ring-[var(--editor-accent)] rounded-lg"
                        : ""
                    }`}
                    style={{
                      left: `${s.x * 100}%`,
                      top: `${s.y * 100}%`,
                      width: `${Math.max(12, s.scale * 36)}%`,
                      transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
                    }}
                    onPointerDown={(e) => dragLayer("sticker", s.id, e)}
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-6">
            <button
              type="button"
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white"
              onClick={() => {
                setIsPlaying(false);
                setPlayhead(0);
                if (videoRef.current) videoRef.current.currentTime = 0;
                if (musicRef.current) musicRef.current.currentTime = 0;
              }}
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--editor-accent)] text-[#3a1f2a]"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 translate-x-px" />
              )}
            </button>
            <span className="min-w-[92px] text-center font-mono text-[11px] text-white/90">
              {formatTimecode(playhead)} / {formatTimecode(plan.duration)}
            </span>
          </div>

          {rendering && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/50 px-4 text-center text-sm text-white">
              <span>{renderProgress?.message || "Rendering…"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
