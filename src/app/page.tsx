import Terminal from "@/components/Terminal";

const FEATURES = [
  {
    glyph: "❯_",
    tint: "text-primary",
    label: "Instant CLI translation",
    desc: "Sentences stream back in milliseconds via Google Translate, with an automatic fallback provider if it is unreachable.",
  },
  {
    glyph: "拼",
    tint: "text-secondary",
    label: "Every word explained",
    desc: "Sentences are broken down word by word — each Chinese word shown with its own pinyin and English meanings.",
  },
  {
    glyph: "✓",
    tint: "text-success",
    label: "Zero setup",
    desc: "No accounts, no API keys, no installs. Open the page, click the terminal, and start typing sentences.",
  },
];

export default function Home() {
  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="border-b border-hairline">
        <nav className="mx-auto flex h-14 max-w-content items-center justify-between px-4">
          <a href="#" className="flex items-center gap-2 font-mono text-sm text-ink">
            <span className="text-primary">❯</span>
            fardin<span className="text-muted">App</span>
          </a>
          <div className="flex items-center gap-5">
            <a href="#how" className="hidden nav-link sm:block">
              How it works
            </a>
            <span className="btn-pill font-mono text-xs" aria-hidden="true">
              en → 中文
            </span>
          </div>
        </nav>
      </header>

      <main className="pb-2">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-4 pb-14 pt-[72px] text-center">
          <p className="eyebrow mb-4">english → 简体中文 · instant cli translation</p>
          <h1 className="hero-title text-ink">
            Get fluent in Chinese,
            <br />
            one sentence{" "}
            <span className="text-primary">at a time.</span>
          </h1>
          <p className="lead mx-auto mt-5 max-w-xl">
            Type any English sentence into the terminal below and press Enter —
            you&apos;ll get Simplified Chinese instantly, with pinyin and a
            word-by-word breakdown so you actually learn as you go.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#terminal" className="btn-filled">
              Try the terminal ↓
            </a>
            <a href="#how" className="btn-outline">
              How it works
            </a>
          </div>
        </section>

        {/* ── Terminal ──────────────────────────────────────── */}
        <section id="terminal" className="scroll-mt-6 px-4">
          <Terminal />
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section id="how" className="mx-auto mt-[72px] max-w-content scroll-mt-6 px-4">
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
            {FEATURES.map((f) => (
              <div key={f.label}>
                <div className={`font-mono text-xl ${f.tint}`} aria-hidden="true">
                  {f.glyph}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">{f.label}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="mt-[72px] border-t border-hairline">
        <div
          className="mx-auto flex max-w-content flex-col items-center justify-between gap-2 px-4 py-6 text-[13px] text-muted sm:flex-row"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          <p className="font-mono">
            © 2026 fardinApp — <span className="text-primary">❯</span>_
          </p>
          <p>Translations via Google Translate · fallback MyMemory</p>
        </div>
      </footer>
    </>
  );
}
