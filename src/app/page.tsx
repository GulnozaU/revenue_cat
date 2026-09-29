import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/landing/hero-preview";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Examples } from "@/components/landing/examples";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-sm font-bold">
            C
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Cutline
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[var(--fg-muted)] md:flex">
          <a href="#how" className="hover:text-[var(--fg)] transition-colors">
            How it works
          </a>
          <a
            href="#examples"
            className="hover:text-[var(--fg)] transition-colors"
          >
            Examples
          </a>
          <Link href="/signin" className="hover:text-[var(--fg)] transition-colors">
            Sign in
          </Link>
        </nav>
        <Button asChild size="sm" className="md:hidden">
          <Link href="/upload">Start</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-8 pt-10 md:pt-16">
          <div className="mx-auto max-w-3xl text-center float-in">
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.75rem)] font-extrabold leading-[1.02] tracking-tight text-[var(--fg)]">
              Your video.
              <br />
              Your vision.
              <br />
              <span className="text-[var(--accent)]">AI does the editing.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base md:text-lg text-[var(--fg-muted)] leading-relaxed">
              Upload your footage, describe the edit you want, and refine the
              result in a visual editor.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button asChild size="lg" className="min-w-[200px]">
                <Link href="/upload">Start editing</Link>
              </Button>
              <p className="text-sm text-[var(--fg-subtle)]">
                No account required.
              </p>
            </div>
          </div>

          <div className="mt-14 float-in" style={{ animationDelay: "120ms" }}>
            <HeroPreview />
          </div>
        </section>

        <HowItWorks />
        <Examples />
      </main>

      <footer className="mx-auto mt-10 flex w-full max-w-6xl items-center justify-between border-t border-[var(--border)] px-6 py-8 text-sm text-[var(--fg-subtle)]">
        <span className="font-display font-semibold text-[var(--fg-muted)]">
          Cutline
        </span>
        <span>Shipaton 2026 · Built for creators</span>
      </footer>
    </div>
  );
}
