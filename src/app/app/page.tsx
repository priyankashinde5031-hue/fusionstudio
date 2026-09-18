import Link from "next/link";

export default function CustomerAppComingSoon() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="eyebrow mb-4">Customer app</div>
        <h1 className="display text-4xl mb-3">Your wallet is on its way</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          Log in with your phone to see your membership card, benefits and coupons.
          This is arriving in Phase 3.
        </p>
        <Link href="/" className="btn btn-ghost">
          ← Back
        </Link>
      </div>
    </main>
  );
}
