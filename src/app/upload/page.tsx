"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  FORMAT_PRESETS,
  type AestheticId,
  type VideoFormat,
} from "@/lib/types/edit-plan";
import { STYLE_PRESETS } from "@/lib/styles/presets";
import { formatDuration } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

type LocalFile = {
  file: File;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
  thumbnailUrl?: string;
};

async function readMeta(file: File): Promise<Omit<LocalFile, "file">> {
  const previewUrl = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = previewUrl;
    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      video.currentTime = Math.min(1, duration / 4 || 0);
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = Math.round((160 * height) / Math.max(width, 1)) || 90;
          canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve({
            previewUrl,
            duration,
            width,
            height,
            thumbnailUrl: canvas.toDataURL("image/jpeg", 0.7),
          });
        } catch {
          resolve({ previewUrl, duration, width, height });
        }
      };
    };
    video.onerror = () =>
      resolve({ previewUrl, duration: 0, width: 0, height: 0 });
  });
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const setProject = useProjectStore((s) => s.setProject);
  const draftFormat = useProjectStore((s) => s.draftFormat);
  const draftAesthetic = useProjectStore((s) => s.draftAesthetic);
  const draftPrompt = useProjectStore((s) => s.draftPrompt);
  const setDraftFormat = useProjectStore((s) => s.setDraftFormat);
  const setDraftAesthetic = useProjectStore((s) => s.setDraftAesthetic);
  const setDraftPrompt = useProjectStore((s) => s.setDraftPrompt);

  const [local, setLocal] = useState<LocalFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const addFile = useCallback(async (file: File) => {
    const ok =
      file.type.includes("mp4") ||
      file.type.includes("webm") ||
      file.type.includes("quicktime") ||
      /\.(mp4|mov|webm)$/i.test(file.name);
    if (!ok) {
      toast.error("Use MP4, MOV, or WebM");
      return;
    }
    const meta = await readMeta(file);
    setLocal({ file, ...meta });
  }, []);

  const createEdit = async () => {
    if (!local) {
      toast.error("Upload a video first");
      return;
    }
    if (!draftPrompt.trim()) {
      toast.error("Describe how you want it edited");
      return;
    }

    setBusy(true);
    try {
      // 1) Create project on server
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: local.file.name.replace(/\.[^.]+$/, ""),
          format: draftFormat,
          aestheticId: draftAesthetic,
          prompt: draftPrompt.trim(),
        }),
      });
      if (!createRes.ok) throw new Error("Could not create project");
      const { project } = await createRes.json();
      setProject(project);

      // Navigate to processing; kick off upload+pipeline there with file
      sessionStorage.setItem(
        `cutline_pending_upload_${project.id}`,
        "1"
      );
      // Store file in IndexedDB-like memory via temporary global for the processing page
      (window as unknown as { __cutlineUpload?: { id: string; file: File } }).__cutlineUpload =
        { id: project.id, file: local.file };

      router.push(`/processing/${project.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-sm font-bold">
            C
          </span>
          <span className="font-display text-lg font-semibold">Cutline</span>
        </Link>
        <Link href="/signin" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Start your edit
        </h1>
        <p className="mt-2 text-[var(--fg-muted)]">
          Real upload → real transcription → real FFmpeg render.
        </p>

        <section className="mt-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) await addFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 transition-colors ${
              dragging
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Upload className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-lg font-semibold">Drop a video here</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">MP4, MOV, or WebM</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])}
            />
          </div>

          {local && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)]">
                {local.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={local.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Film className="h-5 w-5 text-[var(--fg-subtle)]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{local.file.name}</p>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  {formatDuration(local.duration)} · {local.width}×{local.height} ·{" "}
                  {(local.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocal(null)}
                className="self-start rounded-lg p-1.5 text-[var(--fg-subtle)] hover:bg-[var(--surface-2)] hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Where are you posting?</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(FORMAT_PRESETS) as VideoFormat[]).map((key) => {
              const preset = FORMAT_PRESETS[key];
              const active = draftFormat === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDraftFormat(key)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <p className="font-display font-semibold">{preset.label}</p>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">{preset.aspect}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Creator aesthetic</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(STYLE_PRESETS) as AestheticId[]).map((id) => {
              const style = STYLE_PRESETS[id];
              const active = draftAesthetic === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraftAesthetic(id)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  {style.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">How should we edit it?</h2>
          <Textarea
            className="mt-4 min-h-[140px]"
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="Make this energetic and clean. Remove long pauses, emphasize the funny moments, add modern captions and subtle zooms."
          />
        </section>

        <div className="mt-8 flex justify-end">
          <Button size="lg" disabled={busy} onClick={createEdit}>
            {busy ? "Starting…" : "Create my edit"}
          </Button>
        </div>
      </main>
    </div>
  );
}
