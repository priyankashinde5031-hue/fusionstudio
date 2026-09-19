"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { transferCouponAction, type TransferState } from "@/app/app/actions";

function SendBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-gold btn-sm" disabled={pending} aria-busy={pending}>
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export function TransferButton({ couponId }: { couponId: string }) {
  const action = transferCouponAction.bind(null, couponId);
  const [state, formAction] = useActionState<TransferState, FormData>(action, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Transfer
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full flex flex-col gap-2 mt-1">
      <label className="label" htmlFor={`to-${couponId}`}>
        Recipient&apos;s mobile
      </label>
      <input
        id={`to-${couponId}`}
        name="mobile"
        inputMode="tel"
        autoComplete="tel"
        required
        className="input mono"
        placeholder="+91 98200 11223"
      />
      <div className="flex gap-2">
        <SendBtn />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--color-faint)" }}>
        The coupon leaves your wallet and moves to their number.
      </p>
      {state.error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }} role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
