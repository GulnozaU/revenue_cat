"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FORMAT_PRESETS, type MediaAsset, type VideoFormat } from "@/lib/types/edit-plan";
import { formatDuration } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

async function readVideoMeta(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnailUrl?: string;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = video.duration || 30;
      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1920;
      video.currentTime = Math.min(1, duration / 4);
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = Math.round((320 * height) / width) || 180;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve({
            duration,
            width,
            height,
            thumbnailUrl: canvas.toDataURL("image/jpeg", 0.7),
          });
        } catch {
          resolve({ duration, width, height });
        }
      };
    };
    video.onerror = () => resolve({ duration: 30, width: 1080, height: 1920 });
  });
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const createDraft = useProjectStore((s) => s.createDraft);
  const setAssets = useProjectStore((s) => s.setAssets);
  const setFormat = useProjectStore((s) => s.setFormat);
  const setPrompt = useProjectStore((s) => s.setPrompt);
  const project = useProjectStore((s) => s.project);

  const [assets, setLocalAssets] = useState<MediaAsset[]>(project?.assets ?? []);
  const [format, setLocalFormat] = useState<VideoFormat>(
    project?.format ?? "instagram_reel"
  );
  const [prompt, setLocalPrompt] = useState(
    project?.prompt ?? ""
  );
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const useDemoFootage = async () => {
    const url =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    setLocalAssets([
      {
        id: `asset_demo`,
        filename: "demo-lifestyle.mp4",
        mimeType: "video/mp4",
        url,
        thumbnailUrl: undefined,
        duration: 15,
        width: 1280,
        height: 720,
        sizeBytes: 2_500_000,
      },
    ]);
    if (!prompt.trim()) {
      setLocalPrompt(
        "Make this feel like a fast-paced lifestyle Reel. Remove awkward pauses, keep the funny moments, add clean modern captions, use subtle zooms, and add energetic background music."
      );
    }
    toast.success("Demo footage loaded");
  };

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const next: MediaAsset[] = [];
    for (const file of list) {
      const ok =
        file.type.includes("mp4") ||
        file.type.includes("webm") ||
        file.type.includes("quicktime") ||
        /\.(mp4|mov|webm)$/i.test(file.name);
      if (!ok) {
        toast.error(`${file.name} is not a supported video format`);
        continue;
      }
      const meta = await readVideoMeta(file);
      const url = URL.createObjectURL(file);
      next.push({
        id: `asset_${Math.random().toString(36).slice(2, 9)}`,
        filename: file.name,
        mimeType: file.type || "video/mp4",
        url,
        thumbnailUrl: meta.thumbnailUrl,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
      });
      // stash raw file on window map for later upload
      if (typeof window !== "undefined") {
        const map = (window as unknown as { __cutlineFiles?: Map<string, File> })
          .__cutlineFiles ?? new Map();
        map.set(next[next.length - 1].id, file);
        (window as unknown as { __cutlineFiles: Map<string, File> }).__cutlineFiles =
          map;
      }
    }
    setLocalAssets((prev) => [...prev, ...next]);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) await addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeAsset = (id: string) => {
    setLocalAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const createEdit = async () => {
    if (assets.length === 0) {
      toast.error("Upload at least one video");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Describe how you want it edited");
      return;
    }
    setBusy(true);
    const id = createDraft({
      format,
      prompt: prompt.trim(),
      assets,
      name: assets[0]?.filename.replace(/\.[^.]+$/, "") ?? "Untitled",
    });
    setAssets(assets);
    setFormat(format);
    setPrompt(prompt.trim());
    router.push(`/processing/${id}`);
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
        <Link
          href="/signin"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Start your edit
        </h1>
        <p className="mt-2 text-[var(--fg-muted)]">
          Upload footage, pick a format, describe the vibe.
        </p>

        <section className="mt-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
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
            <p className="mt-4 font-display text-lg font-semibold">
              Drop videos here
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              MP4, MOV, or WebM · click to browse
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={(e) => {
                e.stopPropagation();
                void useDemoFootage();
              }}
            >
              Use demo footage
            </Button>
          </div>

          {assets.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)]">
                    {asset.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--fg-subtle)]">
                        <Film className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{asset.filename}</p>
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      {formatDuration(asset.duration)} ·{" "}
                      {(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    className="self-start rounded-lg p-1.5 text-[var(--fg-subtle)] hover:bg-[var(--surface-2)] hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">
            Where are you posting?
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(FORMAT_PRESETS) as VideoFormat[]).map((key) => {
              const preset = FORMAT_PRESETS[key];
              const active = format === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocalFormat(key)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <p className="font-display font-semibold">{preset.label}</p>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">
                    {preset.aspect}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">
            How should we edit it?
          </h2>
          <Textarea
            className="mt-4 min-h-[140px]"
            value={prompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            placeholder="Make this energetic and clean. Remove long pauses, emphasize the funny moments, add modern captions and subtle zooms."
          />
        </section>

        <div className="mt-8 flex justify-end">
          <Button size="lg" disabled={busy} onClick={createEdit}>
            Create my edit
          </Button>
        </div>
      </main>
    </div>
  );
}
