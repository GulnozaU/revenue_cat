"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useProjectStore } from "@/store/project-store";

const DEMO_PROMPT =
  "Make this into a cute aesthetic Instagram Reel. Use soft captions, a pretty font, little sparkle and flower stickers, gentle background music, remove boring sections, add a few subtle zooms, and make the pacing feel smooth and cozy.";

let demoStart: Promise<string> | null = null;

export default function DemoPage() {
  const router = useRouter();
  const setProject = useProjectStore((s) => s.setProject);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!demoStart) {
        demoStart = (async () => {
          const videoRes = await fetch("/demo/sample.mp4");
          if (!videoRes.ok) throw new Error("Sample clip is missing.");
          const blob = await videoRes.blob();
          const file = new File([blob], "sample.mp4", { type: "video/mp4" });

          const createRes = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Demo edit",
              format: "instagram_reel",
              aestheticId: "cute",
              prompt: DEMO_PROMPT,
              session: "demo",
            }),
          });
          if (!createRes.ok) {
            const errBody = await createRes.json().catch(() => ({}));
            throw new Error(
              (errBody as { error?: string }).error || "Couldn't open the demo."
            );
          }
          const { project } = await createRes.json();
          (
            window as unknown as { __cutlineUpload?: { id: string; file: File } }
          ).__cutlineUpload = { id: project.id, file };
          useProjectStore.getState().setProject(project);
          useProjectStore.getState().setSourceFile(file);
          return project.id as string;
        })().catch((err) => {
          demoStart = null;
          throw err;
        });
      }

      const id = await demoStart;
      if (!cancelled) router.replace(`/processing/${id}`);
    }

    start().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Couldn't open the demo.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, setProject]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-[10px] font-semibold">
          S
        </span>
        <span className="font-display text-lg font-semibold">stylebox</span>
      </Link>
      {error ? (
        <p className="max-w-sm text-sm text-red-500">{error}</p>
      ) : (
        <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening the demo with a clip already placed…
        </div>
      )}
    </div>
  );
}
