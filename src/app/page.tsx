import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/landing/hero-preview";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Examples } from "@/components/landing/examples";
import { AESTHETIC_ORDER, STYLE_PRESETS } from "@/lib/styles/presets";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-xs font-semibold">
            S
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            stylebox
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[var(--fg-muted)] md:flex">
          <a href="#how" className="hover:text-[var(--fg)] transition-colors">
            How it works
          </a>
          <a href="#aesthetics" className="hover:text-[var(--fg)] transition-colors">
            Aesthetics
          </a>
          <Link href="/dashboard" className="hover:text-[var(--fg)] transition-colors">
            Workspace
          </Link>
        </nav>
        <Button asChild size="sm">
          <Link href="/new">Start editing</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-8 pt-12 md:pt-16">
          <div className="mx-auto max-w-3xl text-center float-in">
            <p className="text-sm font-medium text-[var(--accent)]">
              AI-powered first cut · full visual control
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,5.5vw,4.4rem)] font-semibold leading-[1.05] tracking-tight text-[var(--fg)]">
              Your style.
              <br />
              Your video.
              <br />
              AI does the first cut.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base md:text-lg text-[var(--fg-muted)] leading-relaxed">
              Upload footage, pick an aesthetic, and get a real edited draft.
              Then refine clips, captions, stickers, and music in a CapCut-style
              editor — Gemini watches your actual video; FFmpeg renders the MP4.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="min-w-[180px]">
                <Link href="/new">Start editing</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-[var(--fg-subtle)]">
              No account required to try.
            </p>
          </div>

          <div className="mt-14 float-in" style={{ animationDelay: "100ms" }}>
            <HeroPreview />
          </div>
        </section>

        <HowItWorks />

        <section id="aesthetics" className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[var(--accent)]">Aesthetics</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Edits that match your vibe
            </h2>
            <p className="mt-3 text-[var(--fg-muted)]">
              Each preset tunes pacing, captions, stickers, and music — not one generic AI look.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AESTHETIC_ORDER.map((id) => {
              const s = STYLE_PRESETS[id];
              return (
                <Link
                  key={id}
                  href={`/new?aesthetic=${id}`}
                  className="group rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]/40"
                >
                  <div
                    className="mb-4 flex h-16 overflow-hidden rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${s.swatch[0]}, ${s.swatch[1]})`,
                    }}
                  />
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.tagline}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <Examples />
      </main>

      <footer className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-2 border-t border-[var(--border)] px-6 py-8 text-sm text-[var(--fg-subtle)] sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display font-semibold text-[var(--fg-muted)]">
          stylebox
        </span>
        <span>Shipaton 2026 · Real Gemini analysis · Real FFmpeg export</span>
      </footer>
    </div>
  );
}
