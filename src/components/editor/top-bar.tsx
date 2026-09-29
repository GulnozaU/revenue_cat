"use client";

import Link from "next/link";
import { Redo2, Undo2, Download, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/project-store";

export function EditorTopBar() {
  const project = useProjectStore((s) => s.project);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const history = useProjectStore((s) => s.history);
  const future = useProjectStore((s) => s.future);
  const auth = useProjectStore((s) => s.auth);
  const setShowAuthModal = useProjectStore((s) => s.setShowAuthModal);
  const updateProject = useProjectStore((s) => s.updateProject);

  const onExport = () => {
    if (!auth.signedIn) {
      setShowAuthModal(true, "export");
      return;
    }
    toast.success("Export queued", {
      description: "Your edit is ready to download (demo export).",
    });
    updateProject({ status: "ready", exportUrl: project?.assets[0]?.url });
  };

  const onPreview = () => {
    toast.message("Preview mode", {
      description: "Playing the current edit plan on the canvas.",
    });
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--editor-panel)] px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--editor-accent)] text-[#042f2c] font-display text-xs font-bold">
            C
          </span>
        </Link>
        <input
          className="min-w-0 max-w-[220px] truncate bg-transparent text-sm font-medium text-[var(--editor-fg)] outline-none focus:underline"
          value={project?.name ?? "Untitled"}
          onChange={(e) => updateProject({ name: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={history.length === 0}
          onClick={undo}
          className="text-[var(--editor-muted)] hover:text-[var(--editor-fg)] hover:bg-[var(--editor-panel-2)]"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={future.length === 0}
          onClick={redo}
          className="text-[var(--editor-muted)] hover:text-[var(--editor-fg)] hover:bg-[var(--editor-panel-2)]"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPreview}
          className="bg-[var(--editor-panel-2)] text-[var(--editor-fg)] hover:bg-[var(--editor-border)]"
        >
          <Play className="h-3.5 w-3.5" />
          Preview
        </Button>
        <Button size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </header>
  );
}
