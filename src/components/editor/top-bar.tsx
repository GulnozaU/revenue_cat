"use client";

import Link from "next/link";
import { Redo2, Undo2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store/project-store";
import type { EditPlan } from "@/lib/types/edit-plan";

function editPlanKey(plan: EditPlan) {
  return JSON.stringify(plan);
}

function downloadMp4(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "stylebox"}.mp4`;
  a.click();
}

export function EditorTopBar() {
  const project = useProjectStore((s) => s.project);
  const sourceFile = useProjectStore((s) => s.sourceFile);
  const setSourceFile = useProjectStore((s) => s.setSourceFile);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const history = useProjectStore((s) => s.history);
  const future = useProjectStore((s) => s.future);
  const setRendering = useProjectStore((s) => s.setRendering);
  const setRenderProgress = useProjectStore((s) => s.setRenderProgress);
  const rendering = useProjectStore((s) => s.rendering);
  const renderProgress = useProjectStore((s) => s.renderProgress);
  const renderedPlanKey = useProjectStore((s) => s.renderedPlanKey);
  const rememberRender = useProjectStore((s) => s.rememberRender);

  const readyUrl =
    project?.editPlan &&
    renderedPlanKey === editPlanKey(project.editPlan) &&
    (project.exportUrl?.startsWith("blob:")
      ? project.exportUrl
      : project.previewUrl?.startsWith("blob:")
        ? project.previewUrl
        : null);

  const resolveSource = async (): Promise<File | Blob> => {
    if (sourceFile) return sourceFile;
    const url = project?.assets[0]?.sourceUrl;
    if (!url) {
      throw new Error(
        "Source video is not available in this session. Re-upload the video to export."
      );
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Could not load source video for rendering.");
    }
    const blob = await res.blob();
    const file = new File([blob], project?.assets[0]?.filename || "source.mp4", {
      type: blob.type || "video/mp4",
    });
    setSourceFile(file);
    return file;
  };

  const persistAndRender = async (quality: "preview" | "export") => {
    if (!project?.editPlan) return;
    const planKey = editPlanKey(project.editPlan);
    const cached =
      useProjectStore.getState().renderedPlanKey === planKey
        ? useProjectStore.getState().project?.exportUrl ||
          useProjectStore.getState().project?.previewUrl
        : null;

    if (cached?.startsWith("blob:")) {
      if (quality === "export") {
        downloadMp4(cached, project.name);
        toast.success("Downloaded");
      } else {
        useProjectStore.getState().setPreferRenderedPreview(true);
        toast.success("Already rendered — Export downloads this file");
      }
      return;
    }

    setRendering(true);
    setRenderProgress({
      ratio: 0,
      message: "Encoding your edit in the browser…",
    });
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editPlan: project.editPlan, name: project.name }),
      });

      // Persist plan only (no server FFmpeg)
      await fetch(`/api/projects/${project.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editPlan: project.editPlan, quality }),
      });

      const source = await resolveSource();
      const { renderEditPlanInBrowser } = await import(
        "@/lib/video/ffmpeg-browser"
      );
      const blob = await renderEditPlanInBrowser({
        source,
        plan: project.editPlan,
        format: project.format,
        quality,
        onProgress: (p) => setRenderProgress(p),
      });

      const url = URL.createObjectURL(blob);
      rememberRender(url, planKey);

      if (quality === "export") {
        downloadMp4(url, project.name);
        toast.success("Downloaded");
      } else {
        toast.success("Preview ready — Export will download this file");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video rendering failed.");
    } finally {
      setRendering(false);
      setRenderProgress(null);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--editor-border)] bg-[var(--editor-panel)] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--editor-accent)] text-[#3a1f2a] font-display text-[9px] font-bold">
            S
          </span>
        </Link>
        <span className="truncate text-sm font-medium">
          {project?.name ?? "Untitled"}
        </span>
        {project?.aiProvider === "mock" && (
          <span className="rounded-md border border-[var(--editor-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--editor-muted)]">
            Demo
          </span>
        )}
        {rendering && renderProgress && (
          <span className="hidden truncate text-xs text-[var(--editor-muted)] sm:inline">
            {Math.round(renderProgress.ratio * 100)}% · {renderProgress.message}
          </span>
        )}
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
          {rendering ? "Rendering…" : "Apply preview"}
        </Button>
        <Button
          size="sm"
          disabled={rendering}
          onClick={() => persistAndRender("export")}
        >
          <Download className="h-3.5 w-3.5" />
          {readyUrl ? "Download MP4" : "Export MP4"}
        </Button>
      </div>
    </header>
  );
}
