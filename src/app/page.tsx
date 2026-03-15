import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-brand-dark text-white">
      <section className="relative isolate">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,200,150,0.2),_transparent_28%),linear-gradient(180deg,_#0f172a,_#111827)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-6 sm:px-8 sm:py-8">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-brand-green/80">Fix-It-Flow</p>
              <p className="mt-2 text-sm text-slate-300">Simple help for everyday items.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">Start here</div>
          </header>

          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-2xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
                <span className="h-2 w-2 rounded-full bg-brand-green" />
                One photo to begin
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Make a better choice before you throw something away.
              </h1>

              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Take a picture of the item and get simple guidance on what to do next.
              </p>

              <Link
                href="/repair/new"
                className="mx-auto mt-8 inline-flex min-h-14 min-w-48 items-center justify-center rounded-2xl bg-brand-green px-6 text-base font-semibold text-brand-dark transition hover:opacity-95"
              >
                Open Camera
              </Link>

              <p className="mt-4 text-sm text-slate-400">Repair, reuse, or recycle.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
