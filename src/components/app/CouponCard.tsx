"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { revealCouponAction, hideCouponAction, type RevealState } from "@/app/app/actions";
import { TransferButton } from "./TransferButton";
import { formatDate, formatDateTime, formatMobile } from "@/lib/format";

function RevealBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-gold btn-sm" disabled={pending} aria-busy={pending}>
      {pending ? "Revealing…" : "Reveal code"}
    </button>
  );
}

export interface CouponCardProps {
  couponId: string;
  name: string;
  description: string;
  couponNumber: string;
  expUntil: string;
  usesLeft: number;
  usageLimit: number;
  initialCode: string | null;
  receivedFromMobile?: string;
  receivedAt?: string;
}

/**
 * One card that handles both the "available" and "revealed" states, so
 * revealing simply expands the SAME card in place (no unmount, no jump).
 */
export function CouponCard(props: CouponCardProps) {
  const { couponId, name, description, couponNumber, expUntil, initialCode } = props;
  const revealAction = revealCouponAction.bind(null, couponId);
  const [state, formAction] = useActionState<RevealState, FormData>(revealAction, {});
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hidePending, startHide] = useTransition();

  const code = hidden ? null : state.code ?? initialCode ?? null;
  const usesLeft = state.usesLeft ?? props.usesLeft;
  const usageLimit = state.usageLimit ?? props.usageLimit;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  function onHide() {
    startHide(async () => {
      await hideCouponAction(couponId, {}, new FormData());
      setHidden(true);
    });
  }

  return (
    <div
      className="panel p-4"
      style={
        code
          ? { borderColor: "color-mix(in srgb, var(--color-gold) 45%, transparent)" }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            {description}
          </div>
        </div>
        {code && <span className="chip chip-gold shrink-0">Active</span>}
      </div>

      {usageLimit > 1 && (
        <div className={code ? "text-xs mt-2" : "mt-2"} style={code ? { color: "var(--color-muted)" } : undefined}>
          {code ? (
            <>Punch card · {usesLeft} of {usageLimit} uses left</>
          ) : (
            <span className="chip chip-gold">
              {usesLeft} of {usageLimit} uses left
            </span>
          )}
        </div>
      )}

      {code ? (
        <>
          <button
            type="button"
            onClick={copy}
            className="w-full rounded-xl px-4 py-4 text-center mt-3"
            style={{
              background: "var(--color-ink-2)",
              border: "1px dashed color-mix(in srgb, var(--color-gold) 50%, transparent)",
            }}
            aria-label="Copy code"
          >
            <div
              className="mono text-3xl font-semibold"
              style={{ color: "var(--color-gold-bright)", letterSpacing: "0.32em" }}
            >
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
            <button
              type="button"
              onClick={onHide}
              disabled={hidePending}
              className="text-xs px-2 py-1 rounded-md shrink-0"
              style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
            >
              {hidePending ? "Hiding…" : "Hide code"}
            </button>
          </div>
          <div className="mt-2 text-xs mono" style={{ color: "var(--color-faint)" }}>
            {couponNumber}
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 text-xs mono" style={{ color: "var(--color-faint)" }}>
            <span>{couponNumber}</span>
            <span style={{ color: "var(--color-hairline-strong)" }}>·</span>
            <span>exp {formatDate(expUntil)}</span>
          </div>
          {props.receivedFromMobile && props.receivedAt && (
            <div className="mt-1 text-xs" style={{ color: "var(--color-faint)" }}>
              Received from {formatMobile(props.receivedFromMobile)} · {formatDateTime(props.receivedAt)}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <form action={formAction} className="flex flex-col gap-1">
              <RevealBtn />
              {state.error && (
                <span className="text-xs" style={{ color: "var(--color-danger)" }}>
                  {state.error}
                </span>
              )}
            </form>
            <TransferButton couponId={couponId} />
          </div>
        </>
      )}
    </div>
  );
}
