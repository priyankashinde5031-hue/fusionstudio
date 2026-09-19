"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { hideCouponAction, type RevealState } from "@/app/app/actions";

function HideButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Hiding…" : "Hide code"}
    </button>
  );
}

export function RevealedCouponCard({
  couponId,
  name,
  description,
  couponNumber,
  code,
}: {
  couponId: string;
  name: string;
  description: string;
  couponNumber: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const hide = hideCouponAction.bind(null, couponId);
  const [hideState, hideAction] = useActionState<RevealState, FormData>(hide, {});

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

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm" style={{ color: "var(--color-muted)" }}>
          Show this code at the counter.
        </span>
        <form action={hideAction}>
          <HideButton />
        </form>
      </div>
      {hideState.error && (
        <div className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
          {hideState.error}
        </div>
      )}
      <div className="mt-2 text-xs mono" style={{ color: "var(--color-faint)" }}>
        {couponNumber}
      </div>
    </div>
  );
}
