import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-md text-center">
        <div className="eyebrow mb-4 sm:mb-5 text-[0.65rem] sm:text-xs">
          Membership &amp; Coupons
        </div>
        <h1
          className="display leading-[1.05] mb-3 whitespace-nowrap"
          style={{ fontSize: "clamp(2.15rem, 11.5vw, 3.75rem)" }}
        >
          cimoma<span style={{ color: "var(--color-gold)" }}>Studio</span>
        </h1>
        <p
          style={{ color: "var(--color-muted)" }}
          className="mb-8 sm:mb-10 text-sm sm:text-[0.95rem] leading-relaxed text-balance"
        >
          A premium membership management platform. Cards, benefits and rewards —
          beautifully managed from one place.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/admin" className="btn btn-gold w-full py-3.5">
            Staff dashboard →
          </Link>
          <Link href="/app" className="btn btn-ghost w-full py-3.5">
            Customer app
          </Link>
        </div>

        <p className="mt-8 sm:mt-10 text-xs" style={{ color: "var(--color-faint)" }}>
          made with <span style={{ color: "var(--color-gold)" }}>♥</span> by zeloagent.com
        </p>
      </div>
    </main>
  );
}
