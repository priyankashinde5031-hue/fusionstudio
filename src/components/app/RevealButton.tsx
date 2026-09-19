"use client";

import { useActionState } from "react";
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

export function RevealButton({ couponId }: { couponId: string }) {
  const action = revealCouponAction.bind(null, couponId);
  const [state, formAction] = useActionState<RevealState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Btn />
      {state.error && (
        <span className="text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </span>
      )}
    </form>
  );
}
