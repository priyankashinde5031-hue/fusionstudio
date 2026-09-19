"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { revealCouponAction, type RevealState } from "@/app/app/actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-gold btn-sm" disabled={pending} aria-busy={pending}>
      {pending ? "Revealing…" : "Reveal code"}
    </button>
  );
}

function CodeModal({ state, onClose }: { state: RevealState; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(state.code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="panel w-full max-w-sm p-6 text-center"
        style={{ borderColor: "color-mix(in srgb, var(--color-gold) 45%, transparent)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eyebrow mb-1">Your code</div>
        <div className="font-semibold text-lg mb-1">{state.couponName}</div>
        {state.usageLimit && state.usageLimit > 1 && typeof state.usesLeft === "number" && (
          <div className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
            Punch card · {state.usesLeft} of {state.usageLimit} uses left
          </div>
        )}
        <button
          type="button"
          onClick={copy}
          className="w-full rounded-xl px-4 py-5 my-3"
          style={{
            background: "var(--color-ink-2)",
            border: "1px dashed color-mix(in srgb, var(--color-gold) 55%, transparent)",
          }}
        >
          <div
            className="mono text-4xl font-semibold"
            style={{ color: "var(--color-gold-bright)", letterSpacing: "0.32em" }}
          >
            {state.code}
          </div>
          <div className="text-xs mt-2" style={{ color: "var(--color-faint)" }}>
            {copied ? "Copied ✓" : "Tap to copy"}
          </div>
        </button>
        <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
          Show this code at the counter.
        </p>
        <button type="button" className="btn btn-gold w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export function RevealButton({ couponId }: { couponId: string }) {
  const action = revealCouponAction.bind(null, couponId);
  const [state, formAction] = useActionState<RevealState, FormData>(action, {});
  const [dismissedCode, setDismissedCode] = useState<string>();

  // Show the modal for a fresh code until the user dismisses that specific code.
  const showModal = !!state.code && state.code !== dismissedCode;

  return (
    <>
      <form action={formAction} className="flex flex-col gap-1">
        <Btn />
        {state.error && (
          <span className="text-xs" style={{ color: "var(--color-danger)" }}>
            {state.error}
          </span>
        )}
      </form>
      {showModal && <CodeModal state={state} onClose={() => setDismissedCode(state.code)} />}
    </>
  );
}
