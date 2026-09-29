"use client";

import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useProjectStore } from "@/store/project-store";
import { getTrack } from "@/lib/music/library";
import { cn } from "@/lib/utils";

const IMPROVE_EXAMPLES = [
  "Make this part faster",
  "Make this caption smaller",
  "Remove the boring part",
  "Make this more energetic",
  "Add a subtle zoom here",
];

export function RightSidebar() {
  const project = useProjectStore((s) => s.project);
  const selection = useProjectStore((s) => s.selection);
  const playhead = useProjectStore((s) => s.playhead);
  const updateClip = useProjectStore((s) => s.updateClip);
  const updateCaption = useProjectStore((s) => s.updateCaption);
  const updateZoom = useProjectStore((s) => s.updateZoom);
  const updateText = useProjectStore((s) => s.updateText);
  const setEditPlan = useProjectStore((s) => s.setEditPlan);
  const removeSelected = useProjectStore((s) => s.removeSelected);

  const [instruction, setInstruction] = useState("");
  const [improving, setImproving] = useState(false);

  const plan = project?.editPlan;
  if (!plan) return null;

  const selectedClip =
    selection?.type === "clip"
      ? plan.clips.find((c) => c.id === selection.id)
      : null;
  const selectedCaption =
    selection?.type === "caption"
      ? plan.captions.find((c) => c.id === selection.id)
      : null;
  const selectedZoom =
    selection?.type === "zoom"
      ? plan.zooms.find((z) => z.id === selection.id)
      : null;
  const selectedText =
    selection?.type === "text"
      ? plan.texts.find((t) => t.id === selection.id)
      : null;

  const runImprove = async () => {
    if (!instruction.trim() || !project?.analysis) {
      toast.error("Enter an improvement instruction");
      return;
    }
    setImproving(true);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: project.prompt,
          format: project.format,
          analysis: project.analysis,
          currentPlan: plan,
          selection: selection
            ? selection.type === "range"
              ? {
                  type: "range",
                  start: selection.start,
                  end: selection.end,
                }
              : selection.type === "music"
                ? { type: "music" }
                : {
                    type: selection.type,
                    id: "id" in selection ? selection.id : undefined,
                    start: playhead,
                    end: playhead + 1.5,
                  }
            : {
                type: "range",
                start: playhead,
                end: Math.min(plan.duration, playhead + 2),
              },
          instruction: instruction.trim(),
        }),
      });
      if (!res.ok) throw new Error("Improve failed");
      const data = await res.json();
      setEditPlan(data.plan);
      setInstruction("");
      toast.success("Edit updated");
    } catch {
      toast.error("Could not apply AI improve");
    } finally {
      setImproving(false);
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
              : selectedZoom
                ? "Zoom"
                : selectedText
                  ? "Text"
                  : selection?.type === "music"
                    ? "Music"
                    : "Nothing selected"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {selectedClip && (
          <div className="space-y-3">
            <Field label="Reason">
              <p className="text-xs text-[var(--editor-muted)]">
                {selectedClip.reason ?? "Selected clip"}
              </p>
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
                  updateClip(selectedClip.id!, {
                    speed,
                    timelineEnd: selectedClip.timelineStart + len,
                  });
                }}
                className="w-full accent-[var(--editor-accent)]"
              />
              <p className="text-[11px] text-[var(--editor-subtle)]">
                {(selectedClip.speed ?? 1).toFixed(2)}×
              </p>
            </Field>
            <Field label="Source in / out">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 bg-[var(--editor-panel-2)] border-[var(--editor-border)] text-[var(--editor-fg)]"
                  value={selectedClip.sourceStart}
                  onChange={(e) =>
                    updateClip(selectedClip.id!, {
                      sourceStart: Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 bg-[var(--editor-panel-2)] border-[var(--editor-border)] text-[var(--editor-fg)]"
                  value={selectedClip.sourceEnd}
                  onChange={(e) =>
                    updateClip(selectedClip.id!, {
                      sourceEnd: Number(e.target.value),
                    })
                  }
                />
              </div>
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
                  updateCaption(selectedCaption.id!, { text: e.target.value })
                }
              />
            </Field>
            <Field label="Font size">
              <input
                type="range"
                min={18}
                max={72}
                value={selectedCaption.fontSize ?? 42}
                onChange={(e) =>
                  updateCaption(selectedCaption.id!, {
                    fontSize: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--editor-accent)]"
              />
            </Field>
          </div>
        )}

        {selectedZoom && (
          <div className="space-y-3">
            <Field label="Scale">
              <input
                type="range"
                min={1}
                max={1.4}
                step={0.01}
                value={selectedZoom.scale}
                onChange={(e) =>
                  updateZoom(selectedZoom.id!, {
                    scale: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--editor-accent)]"
              />
              <p className="text-[11px] text-[var(--editor-subtle)]">
                {selectedZoom.scale.toFixed(2)}×
              </p>
            </Field>
          </div>
        )}

        {selectedText && (
          <div className="space-y-3">
            <Field label="Text">
              <Input
                className="bg-[var(--editor-panel-2)] border-[var(--editor-border)] text-[var(--editor-fg)]"
                value={selectedText.text}
                onChange={(e) =>
                  updateText(selectedText.id!, { text: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        {selection?.type === "music" && plan.music && (
          <div className="space-y-3">
            <Field label="Track">
              <p className="text-sm">{getTrack(plan.music.trackId).name}</p>
            </Field>
            <Field label="Volume">
              <input
                type="range"
                min={0}
                max={0.4}
                step={0.01}
                value={plan.music.volume}
                onChange={(e) =>
                  setEditPlan({
                    ...plan,
                    music: {
                      ...plan.music!,
                      volume: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-[var(--editor-accent)]"
              />
            </Field>
          </div>
        )}

        {!selection && (
          <p className="text-xs leading-relaxed text-[var(--editor-muted)]">
            Select a clip, caption, or effect on the timeline to edit properties.
          </p>
        )}

        {selection && selection.type !== "music" && selection.type !== "range" && (
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={removeSelected}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}

        <div className="rounded-2xl border border-[var(--editor-accent)]/25 bg-[var(--editor-accent)]/5 p-3">
          <div className="flex items-center gap-2 text-[var(--editor-accent)]">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium">AI Improve</p>
          </div>
          <p className="mt-1 text-[11px] text-[var(--editor-subtle)]">
            Applies to the current selection (or playhead range).
          </p>
          <Textarea
            className="mt-3 min-h-[80px] bg-[var(--editor-panel)] border-[var(--editor-border)] text-[var(--editor-fg)]"
            placeholder="Make this part faster…"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IMPROVE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInstruction(ex)}
                className={cn(
                  "rounded-lg px-2 py-1 text-[10px] text-[var(--editor-muted)]",
                  "bg-[var(--editor-panel-2)] hover:text-[var(--editor-fg)]"
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
            {improving ? "Improving…" : "AI Improve"}
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
