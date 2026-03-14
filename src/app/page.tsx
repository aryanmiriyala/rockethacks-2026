import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm w-full space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Fix-It-Flow
          </h1>
          <p className="text-brand-muted text-lg">
            Your voice-first repair mentor.
            <br />
            Stop the e-waste.
          </p>
        </div>

        <div className="rounded-xl bg-brand-surface p-5 text-left text-sm text-brand-muted space-y-2">
          <p className="font-semibold text-white">How it works</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Take a photo of your broken device</li>
            <li>AI identifies the part and issue</li>
            <li>Follow hands-free voice guidance step by step</li>
          </ol>
        </div>

        <Link
          href="/repair/new"
          className="block w-full rounded-xl bg-brand-green py-4 text-center font-semibold text-brand-dark text-lg hover:opacity-90 transition-opacity"
        >
          Start a Repair
        </Link>

        <p className="text-xs text-brand-muted">
          50 million tons of e-waste per year. Most of it is fixable.
        </p>
      </div>
    </main>
  );
}
