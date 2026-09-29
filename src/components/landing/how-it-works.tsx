const STEPS = [
  {
    n: "01",
    title: "Upload footage",
    body: "Drop in MP4, MOV, or WebM. No account needed to start.",
  },
  {
    n: "02",
    title: "Describe the edit",
    body: "Tell Cutline the vibe, pacing, captions, and music you want.",
  },
  {
    n: "03",
    title: "Refine visually",
    body: "Open a CapCut-style editor. Tweak clips, text, zooms — or AI Improve a selection.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-[var(--accent)]">How it works</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          A creative tool, not a chatbot
        </h2>
        <p className="mt-3 text-[var(--fg-muted)]">
          AI builds a structured edit plan. You stay in control of every cut.
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
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
