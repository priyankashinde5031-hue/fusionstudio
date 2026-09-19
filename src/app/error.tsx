"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-sm">
        <div className="eyebrow mb-3">Something went wrong</div>
        <h1 className="display text-4xl mb-2">A hiccup on our end</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          Please try again. If it keeps happening, refresh the page.
        </p>
        <button type="button" onClick={reset} className="btn btn-gold">
          Try again
        </button>
      </div>
    </main>
  );
}
