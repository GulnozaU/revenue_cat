const EXAMPLES = [
  {
    title: "Before → After",
    prompt: "Raw phone footage with pauses",
    result: "Trimmed · captions · soft zooms · music bed",
  },
  {
    title: "Cute / Coquette",
    prompt: "Playful stickers, soft bubble captions",
    result: "Heart overlays · warm pacing · light track",
  },
  {
    title: "Clean Lifestyle",
    prompt: "Minimal text, intentional cuts",
    result: "Bold captions · subtle zoom · upbeat bed",
  },
];

export function Examples() {
  return (
    <section id="examples" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-[var(--accent)]">Examples</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          First cuts that feel intentional
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <article
            key={ex.title}
            className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-[#f7ebe8] via-[#f5f0ea] to-[#ebe8f5] p-6">
              <div className="flex h-full items-end rounded-2xl border border-black/5 bg-[#161412] p-4">
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
                Direction
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
