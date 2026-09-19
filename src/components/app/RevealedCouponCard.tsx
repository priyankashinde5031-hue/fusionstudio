"use client";

import { useState } from "react";

export function RevealedCouponCard({
  name,
  description,
  couponNumber,
  code,
}: {
  name: string;
  description: string;
  couponNumber: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can read the code */
    }
  }

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

      <div className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
        Show this code at the counter.
      </div>
      <div className="mt-2 text-xs mono" style={{ color: "var(--color-faint)" }}>
        {couponNumber}
      </div>
    </div>
  );
}
