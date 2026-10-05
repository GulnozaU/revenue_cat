"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROCESSING_STAGES, type ProjectRecord } from "@/lib/types/edit-plan";
import { useProjectStore } from "@/store/project-store";
import { toast } from "sonner";

/** One in-flight analysis per project (React Strict Mode mounts twice in dev). */
const analysisJobs = new Map<string, Promise<{ project: ProjectRecord }>>();

export default function ProcessingPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const setProject = useProjectStore((s) => s.setProject);
  const setSourceFile = useProjectStore((s) => s.setSourceFile);

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
            setReady(true);
            setStageIndex(PROCESSING_STAGES.length);
            setDetail("Your first edit is ready.");
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

      // Fast demo stages (~1.6s total feel)
      tick = setInterval(() => {
        setStageIndex((i) => Math.min(i + 1, PROCESSING_STAGES.length - 1));
      }, 450);

      try {
        setDetail("Analyzing your footage…");
        const stored = useProjectStore.getState().project;
        const form = new FormData();
        form.append("filename", upload.file.name);
        form.append(
          "name",
          stored?.id === params.projectId ? stored.name : upload.file.name
        );
        form.append(
          "format",
          stored?.id === params.projectId ? stored.format : "instagram_reel"
        );
        form.append(
          "aestheticId",
          stored?.id === params.projectId ? stored.aestheticId : "cute"
        );
        form.append(
          "prompt",
          stored?.id === params.projectId ? stored.prompt : ""
        );
        const session =
          stored?.id === params.projectId && stored.session === "demo"
            ? "demo"
            : "try";
        form.append("session", session);

        const meta = await probeClientMeta(upload.file);
        if (!(meta.duration > 0)) {
          throw new Error(
            "Couldn't read this video. Try another MP4 file."
          );
        }
        form.append("duration", String(meta.duration));
        form.append("width", String(meta.width));
        form.append("height", String(meta.height));
        if (meta.thumbnailDataUrl) {
          form.append("thumbnailDataUrl", meta.thumbnailDataUrl);
        }
        // Try uploads the footage for real analysis. Demo keeps the sample in the browser.
        if (session === "try") {
          setDetail("Watching your footage and building the edit from your prompt…");
          form.append("file", upload.file);
        } else {
          setDetail("Opening the sample edit…");
        }

        let job = analysisJobs.get(params.projectId);
        if (!job) {
          job = fetch(`/api/projects/${params.projectId}/process`, {
            method: "POST",
            body: form,
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(
                (err as { error?: string }).error ||
                  `Processing failed (${res.status})`
              );
            }
            return res.json();
          });
          analysisJobs.set(params.projectId, job);
        }

        const data = await job;
        if (cancelled) return;

        if (!data.project?.editPlan) {
          throw new Error("No edit plan returned.");
        }

        // Keep the REAL uploaded File for interactive preview + export
        setSourceFile(upload.file);
        setProject({
          ...data.project,
          // Live preview uses source File; no burn-in yet
          previewUrl: undefined,
          status: "ready",
        });

        if (tick) clearInterval(tick);
        setStageIndex(PROCESSING_STAGES.length);
        setDetail("Your first edit is ready — open the editor to refine it.");
        setReady(true);
        delete (window as unknown as { __cutlineUpload?: unknown })
          .__cutlineUpload;

        // Auto-advance into the editor for a snappy demo
        setTimeout(() => {
          if (!cancelled) router.push(`/editor/${params.projectId}`);
        }, 600);
      } catch (err) {
        if (tick) clearInterval(tick);
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't create the edit. Try again."
        );
        toast.error("Couldn't create the edit");
        analysisJobs.delete(params.projectId);
      }
    }

    run();
    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
    };
  }, [params.projectId, setProject, setSourceFile, router]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-lg items-center px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-[10px] font-semibold">
            S
          </span>
          <span className="font-display text-lg font-semibold">stylebox</span>
        </Link>
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-6 pb-20 pt-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {ready
            ? "Your first cut is ready."
            : error
              ? "Something went wrong"
              : "Creating your first edit"}
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
