const EXAMPLES = [
  {
    title: "Lifestyle Reel",
    prompt: "Fast-paced, remove pauses, modern captions, subtle zooms",
    result: "28s · 6 cuts · clean bold captions",
  },
  {
    title: "Founder story",
    prompt: "Calm pacing, keep emotional lines, soft music",
    result: "42s · cinematic zooms · minimal captions",
  },
  {
    title: "Product demo",
    prompt: "Punchy hooks, emphasize features, energetic beat",
    result: "22s · kinetic captions · upbeat track",
  },
];

export function Examples() {
  return (
    <section id="examples" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-[var(--accent)]">Examples</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Edits that feel intentional
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <article
            key={ex.title}
            className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-[#d8ece9] via-[#eef4f3] to-[#f7f8f8] p-6">
              <div className="flex h-full items-end rounded-2xl border border-black/5 bg-[#111315] p-4">
                <div>
                  <p className="font-display text-lg font-semibold text-white">
                    {ex.title}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{ex.result}</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--fg-subtle)]">
                Prompt
              </p>
              <p className="mt-2 text-sm text-[var(--fg-muted)] leading-relaxed">
                “{ex.prompt}”
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
