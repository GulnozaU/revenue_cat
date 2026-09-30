"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { AESTHETIC_ORDER, STYLE_PRESETS } from "@/lib/styles/presets";
import { formatDuration } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { Suspense } from "react";

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
    video.onerror = () => resolve({ previewUrl, duration: 0, width: 0, height: 0 });
  });
}

function NewProjectInner() {
  const router = useRouter();
  const search = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const setProject = useProjectStore((s) => s.setProject);
  const setDraftFormat = useProjectStore((s) => s.setDraftFormat);
  const setDraftAesthetic = useProjectStore((s) => s.setDraftAesthetic);
  const setDraftPrompt = useProjectStore((s) => s.setDraftPrompt);

  const initialAesthetic = (search.get("aesthetic") as AestheticId) || "cute";

  const [step, setStep] = useState(1);
  const [local, setLocal] = useState<LocalFile | null>(null);
  const [format, setFormat] = useState<VideoFormat>("instagram_reel");
  const [aesthetic, setAesthetic] = useState<AestheticId>(
    AESTHETIC_ORDER.includes(initialAesthetic) ? initialAesthetic : "cute"
  );
  const [prompt, setPrompt] = useState("");
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
    setStep(2);
  }, []);

  const placeholder = useMemo(() => {
    const s = STYLE_PRESETS[aesthetic];
    return `Make this feel ${s.name.toLowerCase()}. Remove awkward pauses, keep the best moments, add captions that fit the vibe.`;
  }, [aesthetic]);

  const createEdit = async () => {
    if (!local) {
      toast.error("Upload a video first");
      return;
    }
    const finalPrompt = prompt.trim() || placeholder;
    setBusy(true);
    try {
      setDraftFormat(format);
      setDraftAesthetic(aesthetic);
      setDraftPrompt(finalPrompt);

      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: local.file.name.replace(/\.[^.]+$/, ""),
          format,
          aestheticId: aesthetic,
          prompt: finalPrompt,
        }),
      });
      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(
          (errBody as { error?: string }).error ||
            `Could not create project (${createRes.status})`
        );
      }
      const { project } = await createRes.json();
      setProject(project);
      (
        window as unknown as { __cutlineUpload?: { id: string; file: File } }
      ).__cutlineUpload = { id: project.id, file: local.file };
      router.push(`/processing/${project.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Couldn't start project");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-[10px] font-semibold">
            S
          </span>
          <span className="font-display text-lg font-semibold">stylebox</span>
        </Link>
        <p className="text-sm text-[var(--fg-subtle)]">Step {step} of 4</p>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {step === 1 && "Upload your video"}
          {step === 2 && "Where are you posting?"}
          {step === 3 && "Choose an aesthetic"}
          {step === 4 && "Describe the vibe"}
        </h1>
        <p className="mt-2 text-[var(--fg-muted)]">
          {step === 1 && "Drop an MP4 — Gemini will watch the actual file."}
          {step === 2 && "We'll crop and frame for the destination."}
          {step === 3 && "Presets control pacing, captions, stickers, and music."}
          {step === 4 && "Optional. Helps Gemini prioritize moments."}
        </p>

        {step === 1 && (
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
              className={`flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 py-16 transition-colors ${
                dragging
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/45"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold">
                Drop video here
              </p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                MP4, MOV, or WebM
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])}
              />
            </div>
            {local && (
              <MediaCard local={local} onRemove={() => setLocal(null)} />
            )}
          </section>
        )}

        {step === 2 && (
          <section className="mt-8 space-y-6">
            {local && <MediaCard local={local} onRemove={() => setLocal(null)} />}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["instagram_reel", "9:16", "Reels / TikTok / Shorts"],
                  ["youtube_landscape", "16:9", "YouTube landscape"],
                  ["tiktok", "1:1*", "Square-ish vertical"],
                ] as const
              ).map(([key, ratio, label]) => {
                const active = format === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className={`rounded-2xl border px-4 py-5 text-left ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <p className="font-display text-lg font-semibold">{ratio}</p>
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">{label}</p>
                    <p className="mt-2 text-[10px] text-[var(--fg-subtle)]">
                      {FORMAT_PRESETS[key].width}×{FORMAT_PRESETS[key].height}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--fg-subtle)]">
              * Square option still exports 9:16 vertical for social; true 1:1 coming soon.
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {AESTHETIC_ORDER.map((id) => {
                const s = STYLE_PRESETS[id];
                const active = aesthetic === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAesthetic(id)}
                    className={`rounded-3xl border p-4 text-left ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div
                      className="mb-3 h-14 rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]})`,
                      }}
                    />
                    <p className="font-display font-semibold">{s.name}</p>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.tagline}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Continue</Button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="mt-8">
            <Textarea
              className="min-h-[140px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
            />
            <div className="mt-6 flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button size="lg" disabled={busy || !local} onClick={createEdit}>
                {busy ? "Starting…" : "Create first edit"}
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MediaCard({
  local,
  onRemove,
}: {
  local: LocalFile;
  onRemove: () => void;
}) {
  return (
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
        onClick={onRemove}
        className="self-start rounded-lg p-1.5 text-[var(--fg-subtle)] hover:bg-[var(--surface-2)] hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--fg-muted)]">
          Loading…
        </div>
      }
    >
      <NewProjectInner />
    </Suspense>
  );
}
