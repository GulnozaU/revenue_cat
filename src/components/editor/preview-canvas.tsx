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
  const planRef = useRef(project?.editPlan);
  const clipIndexRef = useRef(0);
  const seekingRef = useRef(false);
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
  planRef.current = plan;

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

  // Pause from here. Starting play happens in the button click so audio
  // stays tied to the user gesture and we don't seek on every plan edit.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (isPlaying) return;
    video.pause();
    musicRef.current?.pause();
  }, [isPlaying, ready]);

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
    const index = plan.clips.findIndex((c) => c.id === mapped.clipId);
    if (index >= 0) clipIndexRef.current = index;
  }, [playhead, isPlaying, ready, plan, useRendered]);

  useEffect(() => {
    setReady(false);
  }, [displaySrc]);

  const seekVideo = (video: HTMLVideoElement, time: number) => {
    seekingRef.current = true;
    const done = () => {
      seekingRef.current = false;
      video.removeEventListener("seeked", done);
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  };

  const onSourceTime = () => {
    const video = videoRef.current;
    const current = planRef.current;
    if (!video || !current || useRendered || !playingRef.current || seekingRef.current) {
      return;
    }
    const clips = current.clips;
    const index = Math.min(clipIndexRef.current, clips.length - 1);
    const clip = clips[index];
    if (!clip) return;
    const t = video.currentTime;
    const speed = clip.speed || 1;

    if (t < clip.sourceStart - 0.12) {
      seekVideo(video, clip.sourceStart);
      return;
    }

    if (t < clip.sourceEnd - 0.05) {
      const timelineT =
        clip.timelineStart + Math.max(0, t - clip.sourceStart) / speed;
      setPlayhead(Math.min(clip.timelineEnd, timelineT));
      return;
    }

    const next = clips[index + 1];
    if (!next) {
      setPlayhead(current.duration);
      setIsPlaying(false);
      video.pause();
      musicRef.current?.pause();
      return;
    }
    clipIndexRef.current = index + 1;
    seekVideo(video, next.sourceStart + 0.02);
    setPlayhead(next.timelineStart);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    const current = planRef.current;
    if (!video || !current) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) {
      video.pause();
      musicRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    video.muted = false;
    video.volume = 1;

    if (!useRendered) {
      const at =
        current.clips.findIndex(
          (c) =>
            playheadRef.current >= c.timelineStart &&
            playheadRef.current < c.timelineEnd
        ) ?? 0;
      const index = at >= 0 ? at : 0;
      clipIndexRef.current = index;
      const clip = current.clips[index];
      if (clip) {
        const speed = clip.speed || 1;
        const sourceTime =
          clip.sourceStart +
          Math.max(0, playheadRef.current - clip.timelineStart) * speed;
        if (Math.abs(video.currentTime - sourceTime) > 0.18) {
          video.currentTime = Math.min(sourceTime, clip.sourceEnd - 0.05);
        }
      }
    }

    video.play().catch(() => undefined);
    const music = musicRef.current;
    if (music && current.music && !useRendered) {
      music.volume = Math.min(0.6, Math.max(0.18, current.music.volume ?? 0.3));
      const dur = Number.isFinite(music.duration) && music.duration > 0 ? music.duration : 30;
      music.currentTime = playheadRef.current % dur;
      music.play().catch(() => undefined);
    }
    setIsPlaying(true);
  };

  const dragLayer = (
    kind: "sticker" | "caption" | "text",
    id: string,
    event: React.PointerEvent
  ) => {
    event.stopPropagation();
    const frame = frameRef.current;
    const current = useProjectStore.getState().project?.editPlan;
    if (!frame || !current) return;
    setSelection(
      kind === "sticker"
        ? { type: "sticker", id }
        : kind === "text"
          ? { type: "text", id }
          : { type: "caption", id }
    );
    const originX = event.clientX;
    const originY = event.clientY;
    const rect = frame.getBoundingClientRect();
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (
        !dragging &&
        Math.hypot(ev.clientX - originX, ev.clientY - originY) < 4
      ) {
        return;
      }
      dragging = true;
      const latest = useProjectStore.getState().project?.editPlan;
      if (!latest) return;
      const x = clamp((ev.clientX - rect.left) / rect.width, 0.06, 0.94);
      const y = clamp((ev.clientY - rect.top) / rect.height, 0.06, 0.9);
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
      } else if (kind === "text") {
        setEditPlanLocal(
          {
            ...latest,
            textOverlays: (latest.textOverlays ?? []).map((t) =>
              t.id === id ? { ...t, x, y } : t
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

  const resizeFont = (
    kind: "text" | "caption",
    id: string,
    startSize: number,
    event: React.PointerEvent
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const origin = event.clientY;
    const move = (ev: PointerEvent) => {
      const latest = useProjectStore.getState().project?.editPlan;
      if (!latest) return;
      const fontSize = clamp(Math.round(startSize + (origin - ev.clientY) * 0.55), 18, 120);
      if (kind === "text") {
        setEditPlanLocal(
          {
            ...latest,
            textOverlays: (latest.textOverlays ?? []).map((t) =>
              t.id === id ? { ...t, fontSize } : t
            ),
          },
          false
        );
      } else {
        setEditPlanLocal(
          {
            ...latest,
            captions: latest.captions.map((c) =>
              c.id === id ? { ...c, fontSize } : c
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

  const addTitleAt = (clientX: number, clientY: number) => {
    const frame = frameRef.current;
    const current = useProjectStore.getState().project?.editPlan;
    if (!frame || !current) return;
    const rect = frame.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0.12, 0.88);
    const y = clamp((clientY - rect.top) / rect.height, 0.08, 0.82);
    const id = `text_${Date.now()}`;
    const duration = current.duration || 1;
    const ph = useProjectStore.getState().playhead;
    let start = ph;
    let end = Math.min(duration, start + 3);
    if (end - start < 0.5) {
      end = duration;
      start = Math.max(0, end - 3);
    }
    setEditPlanLocal({
      ...current,
      textOverlays: [
        ...(current.textOverlays ?? []),
        {
          id,
          start,
          end,
          text: "Your title",
          fontId: "satoshi",
          fontSize: 56,
          color: "#FFFFFF",
          x,
          y,
        },
      ],
    });
    setSelection({ type: "text", id });
    setPlayhead(Math.min(end - 0.05, start + 0.05));
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
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pt-3">
        <div
          ref={frameRef}
          data-preview-frame
          className="relative h-full max-h-full w-auto max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
          style={{ aspectRatio: aspect, containerType: "size" }}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-overlay]")) return;
            addTitleAt(e.clientX, e.clientY);
          }}
        >
          <div
            className="absolute inset-0 origin-center"
            style={{ transform: `scale(${zoomScale})` }}
          >
            <video
              key={displaySrc}
              ref={videoRef}
              src={displaySrc}
              className="absolute inset-0 h-full w-full object-cover bg-black"
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
                const fontSize = previewFont(t.fontSize);
                return (
                  <div
                    key={t.id}
                    data-overlay
                    className={`absolute z-20 w-[82%] -translate-x-1/2 -translate-y-1/2 ${
                      selected ? "rounded-lg ring-2 ring-[var(--editor-accent)]" : ""
                    }`}
                    style={{
                      left: `${t.x * 100}%`,
                      top: `${t.y * 100}%`,
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest("input") || el.closest("[data-resize]")) return;
                      dragLayer("text", t.id, e);
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
                        className="w-full bg-transparent text-center font-bold text-white outline-none"
                        style={{
                          fontFamily: fontCssFamily(t.fontId),
                          fontSize,
                          color: t.color || "#fff",
                          textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                        }}
                      />
                    ) : (
                      <p
                        className="w-full cursor-grab text-center font-bold leading-tight text-white active:cursor-grabbing"
                        style={{
                          fontFamily: fontCssFamily(t.fontId),
                          fontSize,
                          color: t.color || "#fff",
                          textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {t.text}
                      </p>
                    )}
                    {selected && (
                      <span
                        data-resize
                        title="Drag to resize"
                        className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-ns-resize rounded-full border border-black/30 bg-white"
                        onPointerDown={(e) =>
                          resizeFont("text", t.id, t.fontSize, e)
                        }
                      />
                    )}
                  </div>
                );
              })}

              {captions.map((caption) => {
                const selected =
                  selection?.type === "caption" && selection.id === caption.id;
                const fontSize = previewFont(caption.fontSize ?? 44);
                return (
                  <div
                    key={caption.id}
                    data-overlay
                    className={`absolute z-20 w-[86%] -translate-x-1/2 -translate-y-1/2 ${
                      selected ? "rounded-lg ring-2 ring-[var(--editor-accent)]" : ""
                    }`}
                    style={{
                      left: `${(caption.x ?? 0.5) * 100}%`,
                      top: `${(caption.y ?? 0.78) * 100}%`,
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest("input") || el.closest("[data-resize]")) return;
                      dragLayer("caption", caption.id, e);
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
                        className="w-full bg-black/20 text-center font-semibold text-white outline-none"
                        style={{
                          fontFamily: fontCssFamily(caption.fontId),
                          fontSize,
                          textShadow: "0 2px 10px rgba(0,0,0,0.75)",
                        }}
                      />
                    ) : (
                      <p
                        className="w-full cursor-grab px-1 text-center font-semibold leading-tight text-white active:cursor-grabbing"
                        style={{
                          fontFamily: fontCssFamily(caption.fontId),
                          fontSize,
                          textShadow: "0 2px 10px rgba(0,0,0,0.75)",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {caption.text}
                      </p>
                    )}
                    {selected && (
                      <span
                        data-resize
                        title="Drag to resize"
                        className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-ns-resize rounded-full border border-black/30 bg-white"
                        onPointerDown={(e) =>
                          resizeFont(
                            "caption",
                            caption.id,
                            caption.fontSize ?? 44,
                            e
                          )
                        }
                      />
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
                    data-overlay
                    className={`absolute z-20 cursor-grab bg-transparent active:cursor-grabbing ${
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
                      className="pointer-events-none h-auto w-full object-contain drop-shadow-md"
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

          <button
            type="button"
            className="absolute left-3 top-3 z-30 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow"
            onClick={(e) => {
              const frame = frameRef.current?.getBoundingClientRect();
              addTitleAt(
                (frame?.left ?? 0) + (frame?.width ?? 0) * 0.5,
                (frame?.top ?? 0) + (frame?.height ?? 0) * 0.2
              );
              e.stopPropagation();
            }}
          >
            Add text
          </button>

          {rendering && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/50 px-4 text-center text-sm text-white">
              <span>{renderProgress?.message || "Rendering…"}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-3 px-3 py-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white"
          onClick={() => {
            setIsPlaying(false);
            clipIndexRef.current = 0;
            setPlayhead(0);
            const video = videoRef.current;
            if (video && plan.clips[0]) {
              video.currentTime = plan.clips[0].sourceStart;
            }
            if (musicRef.current) musicRef.current.currentTime = 0;
          }}
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--editor-accent)] text-[#3a1f2a]"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" />
          )}
        </button>
        <span className="min-w-[92px] text-center font-mono text-[11px] text-white/80">
          {formatTimecode(playhead)} / {formatTimecode(plan.duration)}
        </span>
      </div>
    </div>
  );
}

function previewFont(fontSize: number) {
  return `clamp(12px, ${(fontSize / 10.8).toFixed(2)}cqw, 72px)`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
