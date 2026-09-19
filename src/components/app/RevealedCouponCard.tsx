"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function format(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function RevealedCouponCard({
  name,
  description,
  couponNumber,
  code,
  expiresAt,
}: {
  name: string;
  description: string;
  couponNumber: string;
  code: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const expiry = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => expiry - Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const left = expiry - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        // Window lapsed — refresh so the server moves it back to Available.
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiry, router]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can read the code */
    }
  }

  const urgent = remaining < 60 * 60 * 1000; // under 1h

  return (
    <div
      className="panel p-5"
      style={{ borderColor: "color-mix(in srgb, var(--color-gold) 40%, transparent)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            {description}
          </div>
        </div>
        <span className="chip chip-gold">Active</span>
      </div>

      {/* The code */}
      <button
        type="button"
        onClick={copy}
        className="w-full rounded-xl px-4 py-4 text-center transition-colors"
        style={{
          background: "var(--color-ink-2)",
          border: "1px dashed color-mix(in srgb, var(--color-gold) 50%, transparent)",
        }}
        aria-label="Copy code"
      >
        <div className="mono text-3xl font-semibold tracking-[0.35em]" style={{ color: "var(--color-gold-bright)" }}>
          {code}
        </div>
        <div className="text-xs mt-1.5" style={{ color: "var(--color-faint)" }}>
          {copied ? "Copied ✓" : "Tap to copy"}
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span style={{ color: "var(--color-muted)" }}>Show at the counter within</span>
        <span
          className="mono font-semibold"
          style={{ color: urgent ? "var(--color-danger)" : "var(--color-fg)" }}
        >
          {format(remaining)}
        </span>
      </div>
      <div className="mt-2 text-xs mono" style={{ color: "var(--color-faint)" }}>
        {couponNumber}
      </div>
    </div>
  );
}
