"use client";

import {
  Captions,
  Film,
  Music2,
  Sparkles,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { MUSIC_LIBRARY } from "@/lib/music/library";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

const TABS = [
  { id: "media" as const, label: "Media", icon: Film },
  { id: "text" as const, label: "Text", icon: Type },
  { id: "captions" as const, label: "Captions", icon: Captions },
  { id: "music" as const, label: "Music", icon: Music2 },
  { id: "effects" as const, label: "Effects", icon: Sparkles },
];

export function LeftSidebar() {
  const leftTab = useProjectStore((s) => s.leftTab);
  const setLeftTab = useProjectStore((s) => s.setLeftTab);
  const project = useProjectStore((s) => s.project);
  const setEditPlan = useProjectStore((s) => s.setEditPlan);
  const addText = useProjectStore((s) => s.addText);
  const playhead = useProjectStore((s) => s.playhead);

  const plan = project?.editPlan;

  return (
    <aside className="flex w-[280px] shrink-0 border-r border-[var(--editor-border)] bg-[var(--editor-panel)]">
      <div className="flex w-16 flex-col items-center gap-1 border-r border-[var(--editor-border)] py-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = leftTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLeftTab(tab.id)}
              className={cn(
                "flex w-14 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-colors",
                active
                  ? "bg-[var(--editor-panel-2)] text-[var(--editor-accent)]"
                  : "text-[var(--editor-muted)] hover:bg-[var(--editor-panel-2)] hover:text-[var(--editor-fg)]"
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
              Project media
            </p>
            {project?.assets.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-panel-2)]"
              >
                <div className="aspect-video bg-black/40">
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-90"
                    />
                  ) : null}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs">{asset.filename}</p>
                  <p className="text-[10px] text-[var(--editor-subtle)]">
                    {formatDuration(asset.duration)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {leftTab === "text" && (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
              Add text
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="w-full bg-[var(--editor-panel-2)] text-[var(--editor-fg)]"
              onClick={() => {
                if (!plan) return;
                addText({
                  id: `text_${Date.now()}`,
                  start: playhead,
                  end: Math.min(plan.duration, playhead + 2.5),
                  text: "Your title",
                  fontFamily: "Syne",
                  fontSize: 48,
                  color: "#FFFFFF",
                  x: 0.5,
                  y: 0.22,
                });
              }}
            >
              Add title
            </Button>
            <div className="space-y-2">
              {plan?.texts.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl bg-[var(--editor-panel-2)] px-3 py-2 text-xs"
                >
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {leftTab === "captions" && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
              Caption styles
            </p>
            {(["clean_bold", "minimal", "outline", "boxed", "kinetic"] as const).map(
              (style) => (
                <button
                  key={style}
                  type="button"
                  className="w-full rounded-xl border border-[var(--editor-border)] bg-[var(--editor-panel-2)] px-3 py-2 text-left text-xs capitalize hover:border-[var(--editor-accent)]/40"
                  onClick={() => {
                    if (!plan) return;
                    setEditPlan({
                      ...plan,
                      captions: plan.captions.map((c) => ({ ...c, style })),
                    });
                  }}
                >
                  {style.replace("_", " ")}
                </button>
              )
            )}
            <p className="pt-2 text-[11px] text-[var(--editor-subtle)]">
              {plan?.captions.length ?? 0} captions on timeline
            </p>
          </div>
        )}

        {leftTab === "music" && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
              Soundtrack
            </p>
            {MUSIC_LIBRARY.map((track) => {
              const active = plan?.music?.trackId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    if (!plan) return;
                    setEditPlan({
                      ...plan,
                      music: {
                        trackId: track.id,
                        volume: plan.music?.volume ?? 0.12,
                        fadeIn: 0.3,
                        fadeOut: 0.6,
                      },
                    });
                  }}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left",
                    active
                      ? "border-[var(--editor-accent)] bg-[var(--editor-accent)]/10"
                      : "border-[var(--editor-border)] bg-[var(--editor-panel-2)]"
                  )}
                >
                  <p className="text-xs font-medium">{track.name}</p>
                  <p className="text-[10px] text-[var(--editor-subtle)]">
                    {track.mood} · {track.bpm} BPM
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {leftTab === "effects" && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
              Motion
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="w-full bg-[var(--editor-panel-2)] text-[var(--editor-fg)]"
              onClick={() => {
                if (!plan) return;
                setEditPlan({
                  ...plan,
                  zooms: [
                    ...plan.zooms,
                    {
                      id: `zoom_${Date.now()}`,
                      start: playhead,
                      end: Math.min(plan.duration, playhead + 1.2),
                      scale: 1.08,
                      x: 0.5,
                      y: 0.45,
                    },
                  ],
                });
              }}
            >
              Add subtle zoom
            </Button>
            <p className="text-[11px] text-[var(--editor-subtle)]">
              {plan?.zooms.length ?? 0} zoom keyframes
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
