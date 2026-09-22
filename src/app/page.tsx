import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="eyebrow mb-5">Membership &amp; Coupons</div>
        <h1 className="display text-6xl mb-3">
          cimoma<span style={{ color: "var(--color-gold)" }}>Studio</span>
        </h1>
        <p style={{ color: "var(--color-muted)" }} className="mb-10 text-[0.95rem]">
          A premium membership management platform. Cards, benefits and rewards —
          beautifully managed from one place.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/admin" className="btn btn-gold w-full">
            Staff dashboard →
          </Link>
          <Link href="/app" className="btn btn-ghost w-full">
            Customer app
          </Link>
        </div>

        <p className="mt-10 text-xs" style={{ color: "var(--color-faint)" }}>
          made with <span style={{ color: "var(--color-gold)" }}>♥</span> by zeloagent.com
        </p>
      </div>
    </main>
  );
}
