"use client";

import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useProjectStore } from "@/store/project-store";
import { getMusicTrack } from "@/lib/assets/library";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Make this part faster",
  "Make this caption smaller",
  "Remove the boring part",
  "Make this more energetic",
  "Add a subtle zoom here",
];

export function RightSidebar() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const selection = useProjectStore((s) => s.selection);
  const playhead = useProjectStore((s) => s.playhead);
  const setEditPlanLocal = useProjectStore((s) => s.setEditPlanLocal);
  const setSelection = useProjectStore((s) => s.setSelection);
  const setRendering = useProjectStore((s) => s.setRendering);

  const [instruction, setInstruction] = useState("");
  const [improving, setImproving] = useState(false);

  const plan = project?.editPlan;
  if (!plan || !project) return null;

  const selectedClip =
    selection?.type === "clip" ? plan.clips.find((c) => c.id === selection.id) : null;
  const selectedCaption =
    selection?.type === "caption"
      ? plan.captions.find((c) => c.id === selection.id)
      : null;
  const selectedSticker =
    selection?.type === "sticker"
      ? plan.stickers.find((s) => s.id === selection.id)
      : null;

  const updateClip = (id: string, patch: Partial<(typeof plan.clips)[0]>) => {
    setEditPlanLocal({
      ...plan,
      clips: plan.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const updateCaption = (id: string, patch: Partial<(typeof plan.captions)[0]>) => {
    setEditPlanLocal({
      ...plan,
      captions: plan.captions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeSelected = () => {
    if (!selection) return;
    if (selection.type === "clip") {
      const clips = plan.clips.filter((c) => c.id !== selection.id);
      if (clips.length === 0) return toast.error("Need at least one clip");
      // repack timeline
      let cursor = 0;
      const packed = clips.map((c) => {
        const len = (c.sourceEnd - c.sourceStart) / (c.speed || 1);
        const next = {
          ...c,
          timelineStart: cursor,
          timelineEnd: cursor + len,
        };
        cursor += len;
        return next;
      });
      setEditPlanLocal({ ...plan, clips: packed, duration: cursor });
    } else if (selection.type === "caption") {
      setEditPlanLocal({
        ...plan,
        captions: plan.captions.filter((c) => c.id !== selection.id),
      });
    } else if (selection.type === "sticker") {
      setEditPlanLocal({
        ...plan,
        stickers: plan.stickers.filter((s) => s.id !== selection.id),
      });
    } else if (selection.type === "zoom") {
      setEditPlanLocal({
        ...plan,
        zooms: plan.zooms.filter((z) => z.id !== selection.id),
      });
    } else if (selection.type === "text") {
      setEditPlanLocal({
        ...plan,
        textOverlays: plan.textOverlays.filter((t) => t.id !== selection.id),
      });
    }
    setSelection(null);
  };

  const runImprove = async () => {
    if (!instruction.trim()) {
      toast.error("Enter an instruction");
      return;
    }
    setImproving(true);
    setRendering(true);
    try {
      // Persist current plan first
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editPlan: plan }),
      });

      const res = await fetch(`/api/projects/${project.id}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: instruction.trim(),
          selection: selection
            ? {
                type: selection.type,
                id: "id" in selection ? selection.id : undefined,
                start: playhead,
                end: playhead + 1.5,
              }
            : { type: "range", start: playhead, end: playhead + 2 },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Improve failed");
      }
      const data = await res.json();
      setProject(data.project);
      setInstruction("");
      toast.success("AI Improve applied + preview re-rendered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Improve failed");
    } finally {
      setImproving(false);
      setRendering(false);
    }
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-[var(--editor-border)] bg-[var(--editor-panel)]">
      <div className="border-b border-[var(--editor-border)] px-4 py-3">
        <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
          Inspector
        </p>
        <p className="mt-1 text-sm font-medium">
          {selectedClip
            ? "Clip"
            : selectedCaption
              ? "Caption"
              : selectedSticker
                ? "Sticker"
                : selection?.type === "music"
                  ? "Music"
                  : selection?.type ?? "Nothing selected"}
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {selectedClip && (
          <div className="space-y-3">
            <Field label="Reason">
              <p className="text-xs text-[var(--editor-muted)]">
                {selectedClip.reason ?? "Clip"}
              </p>
            </Field>
            <Field label="Trim source in">
              <Input
                type="number"
                step="0.1"
                className="h-8 bg-[var(--editor-panel-2)] border-[var(--editor-border)] text-[var(--editor-fg)]"
                value={selectedClip.sourceStart}
                onChange={(e) => {
                  const sourceStart = Number(e.target.value);
                  const len =
                    (selectedClip.sourceEnd - sourceStart) /
                    (selectedClip.speed || 1);
                  updateClip(selectedClip.id, {
                    sourceStart,
                    timelineEnd: selectedClip.timelineStart + len,
                  });
                }}
              />
            </Field>
            <Field label="Trim source out">
              <Input
                type="number"
                step="0.1"
                className="h-8 bg-[var(--editor-panel-2)] border-[var(--editor-border)] text-[var(--editor-fg)]"
                value={selectedClip.sourceEnd}
                onChange={(e) => {
                  const sourceEnd = Number(e.target.value);
                  const len =
                    (sourceEnd - selectedClip.sourceStart) /
                    (selectedClip.speed || 1);
                  updateClip(selectedClip.id, {
                    sourceEnd,
                    timelineEnd: selectedClip.timelineStart + len,
                  });
                }}
              />
            </Field>
            <Field label="Speed">
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={selectedClip.speed ?? 1}
                onChange={(e) => {
                  const speed = Number(e.target.value);
                  const len =
                    (selectedClip.sourceEnd - selectedClip.sourceStart) / speed;
                  updateClip(selectedClip.id, {
                    speed,
                    timelineEnd: selectedClip.timelineStart + len,
                  });
                }}
                className="w-full accent-[var(--editor-accent)]"
              />
            </Field>
          </div>
        )}

        {selectedCaption && (
          <div className="space-y-3">
            <Field label="Text">
              <Textarea
                className="min-h-[72px] bg-[var(--editor-panel-2)] border-[var(--editor-border)] text-[var(--editor-fg)]"
                value={selectedCaption.text}
                onChange={(e) =>
                  updateCaption(selectedCaption.id, { text: e.target.value })
                }
              />
            </Field>
            <Field label="Font size">
              <input
                type="range"
                min={18}
                max={72}
                value={selectedCaption.fontSize ?? 44}
                onChange={(e) =>
                  updateCaption(selectedCaption.id, {
                    fontSize: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--editor-accent)]"
              />
            </Field>
          </div>
        )}

        {selectedSticker && (
          <Field label="Scale">
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={selectedSticker.scale}
              onChange={(e) =>
                setEditPlanLocal({
                  ...plan,
                  stickers: plan.stickers.map((s) =>
                    s.id === selectedSticker.id
                      ? { ...s, scale: Number(e.target.value) }
                      : s
                  ),
                })
              }
              className="w-full accent-[var(--editor-accent)]"
            />
          </Field>
        )}

        {selection?.type === "music" && plan.music && (
          <Field label={`${getMusicTrack(plan.music.trackId).title} volume`}>
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.01}
              value={plan.music.volume}
              onChange={(e) =>
                setEditPlanLocal({
                  ...plan,
                  music: { ...plan.music!, volume: Number(e.target.value) },
                })
              }
              className="w-full accent-[var(--editor-accent)]"
            />
          </Field>
        )}

        {selection && (
          <Button variant="danger" size="sm" className="w-full" onClick={removeSelected}>
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}

        <div className="rounded-2xl border border-[var(--editor-accent)]/25 bg-[var(--editor-accent)]/5 p-3">
          <div className="flex items-center gap-2 text-[var(--editor-accent)]">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium">AI Improve</p>
          </div>
          <Textarea
            className="mt-3 min-h-[80px] bg-[var(--editor-panel)] border-[var(--editor-border)] text-[var(--editor-fg)]"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Make this section more energetic…"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInstruction(ex)}
                className={cn(
                  "rounded-lg bg-[var(--editor-panel-2)] px-2 py-1 text-[10px] text-[var(--editor-muted)]"
                )}
              >
                {ex}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-3 w-full"
            disabled={improving}
            onClick={runImprove}
          >
            {improving ? "Improving + rendering…" : "AI Improve"}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[var(--editor-subtle)]">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
