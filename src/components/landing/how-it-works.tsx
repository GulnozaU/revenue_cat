const STEPS = [
  {
    n: "01",
    title: "See a finished demo",
    body: "Open a sample clip with cuts, captions, and stickers already on the timeline.",
  },
  {
    n: "02",
    title: "Or upload your own",
    body: "Try is not the demo. Your footage and your prompt build the first cut.",
  },
  {
    n: "03",
    title: "Refine & export",
    body: "Edit in a visual timeline, then export a real MP4 with those changes.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-[var(--accent)]">How it works</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          A creative tool, not a chatbot
        </h2>
        <p className="mt-3 text-[var(--fg-muted)]">
          AI builds a structured edit plan from the real video. You stay in control of every cut.
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <span className="font-display text-sm font-semibold text-[var(--accent)]">
              {step.n}
            </span>
            <h3 className="mt-3 font-display text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
