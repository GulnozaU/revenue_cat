"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROCESSING_STAGES } from "@/lib/types/edit-plan";
import { useProjectStore } from "@/store/project-store";
import { toast } from "sonner";

export default function ProcessingPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const setProject = useProjectStore((s) => s.setProject);
  const setSourceFile = useProjectStore((s) => s.setSourceFile);
  const setPreviewBlobUrl = useProjectStore((s) => s.setPreviewBlobUrl);

  const [stageIndex, setStageIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState("Preparing your project…");

  useEffect(() => {
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | null = null;

    async function run() {
      const upload = (
        window as unknown as { __cutlineUpload?: { id: string; file: File } }
      ).__cutlineUpload;

      if (!upload || upload.id !== params.projectId) {
        const res = await fetch(`/api/projects/${params.projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.project?.status === "ready" && data.project.editPlan) {
            setProject(data.project);
            if (data.project.previewUrl) {
              setReady(true);
              setStageIndex(PROCESSING_STAGES.length);
              setDetail(
                `Provider: ${data.project.aiProvider ?? "n/a"} · clips: ${data.project.editPlan?.clips?.length ?? 0}`
              );
              return;
            }
            setError(
              "Edit plan exists but no rendered preview. Re-upload to render in the browser."
            );
            return;
          }
          if (data.project?.status === "error") {
            setError(data.project.error || "We couldn't create the edit.");
            return;
          }
        }
        setError("Couldn't find your upload. Go back and try again.");
        return;
      }

      tick = setInterval(() => {
        setStageIndex((i) => Math.min(i + 1, PROCESSING_STAGES.length - 2));
      }, 4000);

      try {
        setDetail("Uploading video for NVIDIA analysis…");
        const form = new FormData();
        form.append("file", upload.file);

        // Client-probed metadata (no server FFmpeg)
        const meta = await probeClientMeta(upload.file);
        form.append("duration", String(meta.duration));
        form.append("width", String(meta.width));
        form.append("height", String(meta.height));
        if (meta.thumbnailDataUrl) {
          form.append("thumbnailDataUrl", meta.thumbnailDataUrl);
        }

        const res = await fetch(`/api/projects/${params.projectId}/process`, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ||
              `Processing failed (${res.status})`
          );
        }

        const data = await res.json();
        if (cancelled) return;

        if (!data.project?.editPlan) {
          throw new Error("No edit plan returned from analysis.");
        }

        setProject(data.project);
        setSourceFile(upload.file);
        setStageIndex(PROCESSING_STAGES.length - 1);
        setDetail(
          `${data.project.aiProvider ?? "AI"} · ${data.project.editPlan.clips.length} clips — rendering in browser…`
        );

        // Real browser render with ffmpeg.wasm
        const { renderEditPlanInBrowser } = await import(
          "@/lib/video/ffmpeg-browser"
        );
        const blob = await renderEditPlanInBrowser({
          source: upload.file,
          plan: data.project.editPlan,
          format: data.project.format,
          quality: "preview",
          onProgress: (p) => {
            if (!cancelled) setDetail(p.message);
          },
        });

        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
        setProject({
          ...data.project,
          previewUrl: url,
          status: "ready",
        });

        if (tick) clearInterval(tick);
        setStageIndex(PROCESSING_STAGES.length);
        setDetail(
          `Provider: ${data.project.aiProvider ?? "n/a"} · ${data.project.editPlan.clips.length} clips · real MP4 preview ready`
        );
        setReady(true);
        delete (window as unknown as { __cutlineUpload?: unknown }).__cutlineUpload;
      } catch (err) {
        if (tick) clearInterval(tick);
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't create the edit. Try again."
        );
        toast.error("Couldn't create the edit");
      }
    }

    run();
    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
    };
  }, [params.projectId, setProject, setSourceFile, setPreviewBlobUrl]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-lg items-center px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-sm font-semibold">
            C
          </span>
          <span className="font-display text-lg font-semibold">Cutline</span>
        </Link>
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-6 pb-20 pt-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {ready
            ? "Your first cut is ready."
            : error
              ? "Something went wrong"
              : "Creating your first cut"}
        </h1>
        <p className="mt-2 text-[var(--fg-muted)]">{detail}</p>

        <ul className="mt-10 space-y-3">
          {PROCESSING_STAGES.map((stage, i) => {
            const isDone = ready || i < stageIndex;
            const isActive = !ready && !error && i === stageIndex;
            return (
              <li
                key={stage.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] stage-active"
                    : isDone
                      ? "border-[var(--border)] bg-[var(--surface)]"
                      : "border-transparent opacity-40"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "bg-[var(--surface)] text-[var(--accent)]"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className="text-sm font-medium">{stage.label}</span>
              </li>
            );
          })}
        </ul>

        {error && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={() => router.push("/new")}>
              Try again
            </Button>
          </div>
        )}

        {ready && (
          <Button
            size="lg"
            className="mt-10"
            onClick={() => router.push(`/editor/${params.projectId}`)}
          >
            Open editor
          </Button>
        )}
      </main>
    </div>
  );
}

async function probeClientMeta(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnailDataUrl?: string;
}> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = url;
      video.onloadedmetadata = () => {
        const duration = video.duration || 0;
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        video.currentTime = Math.min(1, duration / 4 || 0);
        video.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height =
              Math.round((160 * height) / Math.max(width, 1)) || 90;
            canvas
              .getContext("2d")
              ?.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve({
              duration,
              width,
              height,
              thumbnailDataUrl: canvas.toDataURL("image/jpeg", 0.7),
            });
          } catch {
            resolve({ duration, width, height });
          }
        };
      };
      video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
