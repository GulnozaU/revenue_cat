import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AESTHETIC_ORDER, STYLE_PRESETS } from "@/lib/styles/presets";
import { listRecentProjects } from "@/lib/projects/list";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const recent = await listRecentProjects(8);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-base font-semibold">
            C
          </span>
          <span className="font-display text-xl font-semibold">Cutline</span>
        </Link>
        <Button asChild>
          <Link href="/new">+ New video</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <div className="float-in">
          <p className="text-[var(--fg-muted)]">{greeting()}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            What are you creating today?
          </h1>
        </div>

        <div className="mt-8">
          <Link
            href="/new"
            className="flex min-h-[140px] flex-col items-start justify-end rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]"
          >
            <span className="font-display text-2xl font-semibold">+ New video</span>
            <span className="mt-2 text-sm text-[var(--fg-muted)]">
              Upload footage · pick an aesthetic · get a real first cut
            </span>
          </Link>
        </div>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Recent projects</h2>
            {recent.length === 0 && (
              <p className="text-sm text-[var(--fg-subtle)]">No projects yet</p>
            )}
          </div>
          {recent.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  href={
                    p.status === "ready" && p.editPlan
                      ? `/editor/${p.id}`
                      : `/processing/${p.id}`
                  }
                  className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]/35"
                >
                  <div className="aspect-[4/5] bg-[var(--surface-2)]">
                    {p.assets[0]?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.assets[0].thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--fg-subtle)]">
                        {p.status}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-[var(--fg-subtle)]">
                      {STYLE_PRESETS[p.aestheticId]?.name ?? p.aestheticId} ·{" "}
                      {p.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--fg-muted)]">
              Your drafts will show up here after you create an edit.
            </p>
          )}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold">Explore aesthetics</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {AESTHETIC_ORDER.map((id) => {
              const s = STYLE_PRESETS[id];
              return (
                <Link
                  key={id}
                  href={`/new?aesthetic=${id}`}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent)]/40"
                  style={{ boxShadow: `inset 0 -2px 0 ${s.accent}` }}
                >
                  {s.name}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold">Your Style</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--fg-muted)] leading-relaxed">
            Coming next: upload 2–3 example videos so Cutline can learn your pacing,
            captions, and sticker habits. The StyleProfile data model is ready —
            full learning ships after the core editor.
          </p>
          <Button variant="outline" className="mt-4" disabled>
            Teach it your style (soon)
          </Button>
        </section>
      </main>
    </div>
  );
}
