"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROCESSING_STAGES,
  type ProcessingStage,
} from "@/lib/types/edit-plan";
import { useProjectStore } from "@/store/project-store";
import { toast } from "sonner";

const STAGE_MS: Record<ProcessingStage, number> = {
  uploading: 900,
  understanding: 1400,
  moments: 1100,
  building: 1500,
  captions: 900,
  rendering: 1200,
};

export default function ProcessingPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const setEditPlan = useProjectStore((s) => s.setEditPlan);
  const setAnalysis = useProjectStore((s) => s.setAnalysis);
  const setStatus = useProjectStore((s) => s.setStatus);
  const updateProject = useProjectStore((s) => s.updateProject);

  const [done, setDone] = useState<ProcessingStage[]>([]);
  const [active, setActive] = useState<ProcessingStage | null>("uploading");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectOk = project?.id === params.projectId;

  const stages = useMemo(() => PROCESSING_STAGES, []);

  useEffect(() => {
    if (!projectOk || !project) {
      router.replace("/upload");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setStatus("analyzing");

        // Stage: uploading (persist meta; files may stay local blob URLs for MVP)
        setActive("uploading");
        await wait(STAGE_MS.uploading);
        if (cancelled) return;
        setDone(["uploading"]);

        // Understanding — call analyze API (mock-capable)
        setActive("understanding");
        const primary = project!.assets[0];
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project!.id,
            duration: primary?.duration ?? 30,
            width: primary?.width,
            height: primary?.height,
            filename: primary?.filename,
          }),
        });
        if (!analyzeRes.ok) throw new Error("Analysis failed");
        const analysisJson = await analyzeRes.json();
        if (cancelled) return;
        setAnalysis(analysisJson.analysis);
        setDone(["uploading", "understanding"]);

        setActive("moments");
        await wait(STAGE_MS.moments);
        if (cancelled) return;
        setDone(["uploading", "understanding", "moments"]);

        setActive("building");
        setStatus("planning");
        const planRes = await fetch("/api/edit-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: project!.prompt,
            format: project!.format,
            analysis: analysisJson.analysis,
          }),
        });
        if (!planRes.ok) throw new Error("Edit plan failed");
        const planJson = await planRes.json();
        if (cancelled) return;
        setEditPlan(planJson.plan, false);
        setDone(["uploading", "understanding", "moments", "building"]);

        setActive("captions");
        await wait(STAGE_MS.captions);
        if (cancelled) return;
        setDone([
          "uploading",
          "understanding",
          "moments",
          "building",
          "captions",
        ]);

        setActive("rendering");
        setStatus("rendering");
        await wait(STAGE_MS.rendering);
        if (cancelled) return;

        updateProject({
          previewUrl: primary?.url,
          status: "ready",
        });
        setDone([
          "uploading",
          "understanding",
          "moments",
          "building",
          "captions",
          "rendering",
        ]);
        setActive(null);
        setReady(true);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
        toast.error("Could not build your edit");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectOk, params.projectId]);

  if (!projectOk) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-lg items-center px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-sm font-bold">
            C
          </span>
          <span className="font-display text-lg font-semibold">Cutline</span>
        </Link>
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-6 pb-20 pt-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {ready ? "Your first cut is ready." : "Building your edit"}
        </h1>
        <p className="mt-2 text-[var(--fg-muted)]">
          {ready
            ? "Open the editor to refine clips, captions, music, and timing."
            : "We're analyzing footage and assembling a structured edit plan."}
        </p>

        <ul className="mt-10 space-y-3">
          {stages.map((stage) => {
            const isDone = done.includes(stage.id);
            const isActive = active === stage.id;
            return (
              <li
                key={stage.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] stage-active"
                    : isDone
                      ? "border-[var(--border)] bg-[var(--surface)]"
                      : "border-transparent bg-transparent opacity-45"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : isActive
                        ? "bg-[var(--surface)] text-[var(--accent)]"
                        : "bg-[var(--surface-2)] text-[var(--fg-subtle)]"
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
                <span
                  className={`text-sm font-medium ${
                    isDone || isActive ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"
                  }`}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ul>

        {error && (
          <p className="mt-6 text-sm text-red-500">{error}</p>
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

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
