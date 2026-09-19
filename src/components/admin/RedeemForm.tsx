"use client";

import { useState, useTransition } from "react";

type PreviewFn = (
  code: string,
) => Promise<{ ok: boolean; couponName?: string; usesLeft?: number; usageLimit?: number; error?: string }>;
type RedeemFn = (
  code: string,
  usedByName: string,
  usedByMobile: string,
) => Promise<{ ok: boolean; message?: string; error?: string }>;

export function RedeemForm({
  preview,
  redeem,
}: {
  preview: PreviewFn;
  redeem: RedeemFn;
}) {
  const [code, setCode] = useState("");
  const [usedBy, setUsedBy] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [info, setInfo] = useState<{ couponName?: string; usesLeft?: number; usageLimit?: number }>();
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setOk(undefined);
    startTransition(async () => {
      const res = await preview(code);
      if (!res.ok) setError(res.error);
      else {
        setInfo({ couponName: res.couponName, usesLeft: res.usesLeft, usageLimit: res.usageLimit });
        setStep("confirm");
      }
    });
  }

  function onConfirm() {
    startTransition(async () => {
      // Used-by can be a name or a mobile number; store as name unless it's all digits.
      const isMobile = /^[+\d][\d\s]{7,}$/.test(usedBy.trim());
      const res = await redeem(code, isMobile ? "" : usedBy.trim(), isMobile ? usedBy.trim() : "");
      if (!res.ok) {
        setError(res.error);
        setStep("enter");
      } else {
        setOk(res.message);
        setStep("enter");
        setCode("");
        setUsedBy("");
        setInfo(undefined);
      }
    });
  }

  if (step === "confirm" && info) {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "var(--color-gold-soft)", border: "1px solid color-mix(in srgb, var(--color-gold) 40%, transparent)" }}
        >
          <div className="text-sm">
            You&apos;re redeeming{" "}
            <span className="font-semibold" style={{ color: "var(--color-gold-bright)" }}>
              {info.couponName}
            </span>
            .
          </div>
          {info.usageLimit && info.usageLimit > 1 && (
            <div className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              Punch card: {info.usesLeft} of {info.usageLimit} use{info.usageLimit === 1 ? "" : "s"} left
              {typeof info.usesLeft === "number" && info.usesLeft <= 1 ? " (this closes it)" : ""}.
            </div>
          )}
          {usedBy.trim() && (
            <div className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              Used by: {usedBy.trim()}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-gold" onClick={onConfirm} disabled={pending}>
            {pending ? "Redeeming…" : "Confirm redeem"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep("enter")} disabled={pending}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onCheck} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="code">
          Redemption code
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoComplete="off"
          spellCheck={false}
          className="input mono"
          style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}
          placeholder="e.g. K7P2QX"
        />
      </div>
      <div>
        <label className="label" htmlFor="usedby">
          Used by <span style={{ color: "var(--color-faint)" }}>optional — name or mobile</span>
        </label>
        <input
          id="usedby"
          value={usedBy}
          onChange={(e) => setUsedBy(e.target.value)}
          className="input"
          placeholder="e.g. sister's name, or +91…"
        />
      </div>
      <button type="submit" className="btn btn-gold w-full" disabled={pending}>
        {pending ? "Checking…" : "Check code"}
      </button>
      <p className="text-xs" style={{ color: "var(--color-faint)" }}>
        Ask the customer to reveal the coupon in their app and read you the code.
      </p>
      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }} role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="text-sm" style={{ color: "var(--color-success)" }}>
          ✓ {ok}
        </p>
      )}
    </form>
  );
}
