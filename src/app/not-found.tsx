import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-sm">
        <div className="eyebrow mb-3">404</div>
        <h1 className="display text-4xl mb-2">Page not found</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          The page you are looking for does not exist or has moved.
        </p>
        <Link href="/" className="btn btn-ghost">
          ← Back home
        </Link>
      </div>
    </main>
  );
}
