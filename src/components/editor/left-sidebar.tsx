"use client";

import {
  Captions,
  Film,
  Music2,
  Sparkles,
  Type,
  Sticker,
  CaseSensitive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import {
  MUSIC_LIBRARY,
  STICKER_LIBRARY,
} from "@/lib/assets/library";
import { FontPicker } from "@/components/editor/font-picker";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { getEditorFont } from "@/data/fonts";

const TABS = [
  { id: "media" as const, label: "Media", icon: Film },
  { id: "text" as const, label: "Text", icon: Type },
  { id: "captions" as const, label: "Captions", icon: Captions },
  { id: "stickers" as const, label: "Stickers", icon: Sticker },
  { id: "fonts" as const, label: "Fonts", icon: CaseSensitive },
  { id: "music" as const, label: "Music", icon: Music2 },
  { id: "effects" as const, label: "Effects", icon: Sparkles },
];

export function LeftSidebar() {
  const leftTab = useProjectStore((s) => s.leftTab);
  const setLeftTab = useProjectStore((s) => s.setLeftTab);
  const project = useProjectStore((s) => s.project);
  const setEditPlanLocal = useProjectStore((s) => s.setEditPlanLocal);
  const playhead = useProjectStore((s) => s.playhead);
  const selection = useProjectStore((s) => s.selection);
  const setSelection = useProjectStore((s) => s.setSelection);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const plan = project?.editPlan;

  const place = (length: number) => {
    const duration = plan?.duration ?? 1;
    let start = playhead;
    let end = Math.min(duration, start + length);
    if (end - start < 0.5) {
      end = duration;
      start = Math.max(0, end - length);
    }
    setPlayhead(start + 0.05);
    return { start, end };
  };

  return (
    <aside className="flex w-[300px] shrink-0 border-r border-[var(--editor-border)] bg-[var(--editor-panel)]">
      <div className="flex w-16 flex-col items-center gap-1 overflow-y-auto border-r border-[var(--editor-border)] py-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = leftTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLeftTab(tab.id)}
              className={cn(
                "flex w-14 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px]",
                active
                  ? "bg-[var(--editor-panel-2)] text-[var(--editor-accent)]"
                  : "text-[var(--editor-muted)] hover:bg-[var(--editor-panel-2)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3">
        {leftTab === "media" && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
              Source
            </p>
            {project?.assets.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-panel-2)]"
              >
                <div className="aspect-video bg-black/40">
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-2 text-xs">
                  <p className="truncate">{asset.filename}</p>
                  <p className="text-[10px] text-[var(--editor-subtle)]">
                    {formatDuration(asset.duration)} · {asset.width}×{asset.height} ·{" "}
                    {asset.fps.toFixed(1)}fps
                  </p>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-[var(--editor-subtle)]">
              Hit <strong>Apply preview</strong> after timeline edits to re-render.
            </p>
          </div>
        )}

        {leftTab === "text" && plan && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const id = `text_${Date.now()}`;
              const range = place(3);
              setEditPlanLocal({
                ...plan,
                textOverlays: [
                  ...plan.textOverlays,
                  {
                    id,
                    ...range,
                    text: "Your title",
                    fontId: "satoshi",
                    fontSize: 56,
                    color: "#FFFFFF",
                    x: 0.5,
                    y: 0.18,
                  },
                ],
              });
              setSelection({ type: "text", id });
            }}
          >
            Add title at playhead
          </Button>
        )}

        {leftTab === "captions" && plan && (
          <div className="space-y-2">
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                const id = `cap_${Date.now()}`;
                const range = place(2.5);
                setEditPlanLocal({
                  ...plan,
                  captions: [
                    ...plan.captions,
                    {
                      id,
                      ...range,
                      text: "New caption",
                      style: "clean_bold",
                      fontId: "satoshi",
                      fontSize: 44,
                      x: 0.5,
                      y: 0.72,
                      animation: "none",
                    },
                  ],
                });
                setSelection({ type: "caption", id });
              }}
            >
              Add caption
            </Button>
            <p className="text-[11px] text-[var(--editor-subtle)]">
              {plan.captions.length} captions
            </p>
          </div>
        )}

        {leftTab === "stickers" && plan && (
          <div className="grid grid-cols-2 gap-2">
            {STICKER_LIBRARY.filter((s) => s.category !== "Shapes").map((s) => (
              <button
                key={s.id}
                type="button"
                className="rounded-xl border border-[var(--editor-border)] bg-[var(--editor-panel-2)] p-2"
                onClick={() => {
                  const id = `stk_${Date.now()}`;
                  const range = place(2.5);
                  setEditPlanLocal({
                    ...plan,
                    stickers: [
                      ...plan.stickers,
                      {
                        id,
                        assetId: s.id,
                        ...range,
                        x: 0.72,
                        y: 0.28,
                        scale: 0.34,
                        rotation: 0,
                      },
                    ],
                  });
                  setSelection({ type: "sticker", id });
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={s.name} className="mx-auto h-12 w-12 object-contain" />
                <p className="mt-1 text-[10px]">{s.name}</p>
              </button>
            ))}
          </div>
        )}

        {leftTab === "fonts" && plan && (
          <FontPicker
            value={
              (selection?.type === "caption"
                ? plan.captions.find((c) => c.id === selection.id)?.fontId
                : undefined) ||
              plan.captions[0]?.fontId ||
              plan.textOverlays[0]?.fontId ||
              "satoshi"
            }
            previewText={
              (selection?.type === "caption"
                ? plan.captions.find((c) => c.id === selection.id)?.text
                : undefined) ||
              plan.captions[0]?.text ||
              "just a little reset"
            }
            onChange={(fontId) => {
              const font = getEditorFont(fontId);
              if (selection?.type === "caption") {
                setEditPlanLocal({
                  ...plan,
                  captions: plan.captions.map((c) =>
                    c.id === selection.id ? { ...c, fontId: font.id } : c
                  ),
                });
                return;
              }
              setEditPlanLocal({
                ...plan,
                captions: plan.captions.map((c) => ({ ...c, fontId: font.id })),
                textOverlays: plan.textOverlays.map((t) => ({
                  ...t,
                  fontId: font.id,
                })),
              });
            }}
          />
        )}

        {leftTab === "music" && plan && (
          <div className="space-y-2">
            {MUSIC_LIBRARY.map((track) => {
              const active = plan.music?.trackId === track.id;
              return (
                <div
                  key={track.id}
                  className={cn(
                    "rounded-xl border p-2",
                    active
                      ? "border-[var(--editor-accent)] bg-[var(--editor-accent)]/10"
                      : "border-[var(--editor-border)] bg-[var(--editor-panel-2)]"
                  )}
                >
                  <p className="text-xs font-medium">{track.title}</p>
                  <p className="text-[10px] text-[var(--editor-subtle)]">
                    {track.mood} · {track.duration}s
                  </p>
                  <audio controls src={track.url} className="mt-2 w-full h-8" preload="none" />
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    variant={active ? "default" : "secondary"}
                    onClick={() =>
                      setEditPlanLocal({
                        ...plan,
                        music: {
                          trackId: track.id,
                          volume: plan.music?.volume ?? 0.14,
                          startAt: 0,
                          fadeIn: 0.4,
                          fadeOut: 0.8,
                        },
                      })
                    }
                  >
                    {active ? "Selected" : "Use track"}
                  </Button>
                </div>
              );
            })}
            <Button
              size="sm"
              variant="danger"
              className="w-full"
              onClick={() => setEditPlanLocal({ ...plan, music: null })}
            >
              Remove music
            </Button>
          </div>
        )}

        {leftTab === "effects" && plan && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const id = `zoom_${Date.now()}`;
              const range = place(1.4);
              setEditPlanLocal({
                ...plan,
                zooms: [
                  ...plan.zooms,
                  {
                    id,
                    ...range,
                    scale: 1.1,
                    x: 0.5,
                    y: 0.45,
                  },
                ],
              });
              setSelection({ type: "zoom", id });
            }}
          >
            Add zoom at playhead
          </Button>
        )}
      </div>
    </aside>
  );
}
