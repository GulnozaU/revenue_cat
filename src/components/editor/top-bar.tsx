"use client";

import Link from "next/link";
import { Redo2, Undo2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/project-store";

export function EditorTopBar() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const history = useProjectStore((s) => s.history);
  const future = useProjectStore((s) => s.future);
  const auth = useProjectStore((s) => s.auth);
  const setShowAuthModal = useProjectStore((s) => s.setShowAuthModal);
  const setRendering = useProjectStore((s) => s.setRendering);
  const rendering = useProjectStore((s) => s.rendering);

  const persistAndRender = async (quality: "preview" | "export") => {
    if (!project?.editPlan) return;
    if (quality === "export" && !auth.signedIn) {
      setShowAuthModal(true, "export");
      return;
    }

    setRendering(true);
    try {
      // Persist plan
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editPlan: project.editPlan, name: project.name }),
      });

      const res = await fetch(`/api/projects/${project.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quality,
          editPlan: project.editPlan,
          signedIn: auth.signedIn,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Render failed");
      }
      const data = await res.json();
      setProject(data.project);

      if (quality === "export" && data.project.exportUrl) {
        toast.success("Export ready");
        const a = document.createElement("a");
        a.href = data.project.exportUrl;
        a.download = `${project.name || "cutline"}.mp4`;
        a.click();
      } else {
        toast.success("Preview re-rendered");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--editor-panel)] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--editor-accent)] text-[#042f2c] font-display text-xs font-bold">
            C
          </span>
        </Link>
        <span className="truncate text-sm font-medium">{project?.name ?? "Untitled"}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={history.length === 0}
          onClick={undo}
          className="text-[var(--editor-muted)] hover:text-[var(--editor-fg)] hover:bg-[var(--editor-panel-2)]"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={future.length === 0}
          onClick={redo}
          className="text-[var(--editor-muted)] hover:text-[var(--editor-fg)] hover:bg-[var(--editor-panel-2)]"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={rendering}
          onClick={() => persistAndRender("preview")}
          className="bg-[var(--editor-panel-2)] text-[var(--editor-fg)] hover:bg-[var(--editor-border)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${rendering ? "animate-spin" : ""}`} />
          Apply preview
        </Button>
        <Button size="sm" disabled={rendering} onClick={() => persistAndRender("export")}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </header>
  );
}
