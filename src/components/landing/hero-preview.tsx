"use client";

import { Play, Pause, Type, Music2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function HeroPreview() {
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((v) => (v + 0.05) % 12), 50);
    return () => clearInterval(id);
  }, [playing]);

  const caption =
    t < 3
      ? "Cut the awkward pauses"
      : t < 6
        ? "Keep what feels real"
        : t < 9
          ? "Add soft modern captions"
          : "Export a real MP4";

  const zoom = t > 4 && t < 5.5 ? 1.08 : t > 8 && t < 9.5 ? 1.06 : 1;

  return (
    <div className="mx-auto max-w-5xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_24px_60px_-40px_rgba(28,25,23,0.35)]">
      <div className="overflow-hidden rounded-[22px] editor-shell">
        <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-[var(--editor-muted)]">
              morning-vlog · first cut
            </span>
          </div>
          <span className="rounded-md bg-[var(--editor-accent)]/15 px-2 py-1 text-xs text-[var(--editor-accent)]">
            Ready
          </span>
        </div>

        <div className="grid md:grid-cols-[72px_1fr_200px]">
          <aside className="hidden flex-col gap-3 border-r border-[var(--editor-border)] p-3 md:flex">
            {[
              { icon: Play, label: "Media" },
              { icon: Type, label: "Text" },
              { icon: Music2, label: "Music" },
              { icon: Sparkles, label: "AI" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] text-[var(--editor-muted)]"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            ))}
          </aside>

          <div className="relative flex min-h-[320px] items-center justify-center bg-[#0f0d0c] p-6 md:min-h-[420px]">
            <div
              className="relative aspect-[9/16] w-[min(220px,42vw)] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#3a2430] via-[#241820] to-[#120f0e] shadow-2xl transition-transform duration-300"
              style={{ transform: `scale(${zoom})` }}
            >
              <div className="absolute inset-x-0 top-10 px-4 text-center">
                <p className="font-display text-lg font-semibold text-white/90">
                  Matcha morning
                </p>
              </div>
              <div className="absolute inset-x-4 bottom-10 rounded-xl bg-black/35 px-3 py-2 text-center backdrop-blur-sm">
                <p className="font-display text-[13px] font-semibold leading-snug text-white">
                  {caption}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur-md"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pause" : "Play"}
            </button>
          </div>

          <aside className="hidden border-l border-[var(--editor-border)] p-4 md:block">
            <p className="text-[11px] uppercase tracking-wider text-[var(--editor-subtle)]">
              Inspector
            </p>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-[var(--editor-panel-2)] p-3">
                <p className="text-xs text-[var(--editor-muted)]">Caption</p>
                <p className="mt-1 text-sm">Soft Bold</p>
              </div>
              <div className="rounded-xl border border-[var(--editor-accent)]/30 bg-[var(--editor-accent)]/10 p-3">
                <p className="text-xs text-[var(--editor-accent)]">AI Improve</p>
                <p className="mt-1 text-sm">Make this cuter</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="border-t border-[var(--editor-border)] px-4 py-3">
          <div className="relative h-7 overflow-hidden rounded-md bg-[var(--editor-track)]">
            <div className="absolute inset-y-1 left-[8%] w-[22%] rounded bg-[var(--editor-clip)]" />
            <div className="absolute inset-y-1 left-[34%] w-[18%] rounded bg-[var(--editor-clip)]" />
            <div className="absolute inset-y-1 left-[56%] w-[28%] rounded bg-[var(--editor-clip)]" />
            <div
              className="absolute inset-y-0 w-0.5 bg-[var(--editor-accent)]"
              style={{ left: `${(t / 12) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
