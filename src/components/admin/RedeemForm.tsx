"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/app/admin/(dash)/members/actions";

export function RedeemForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="code">
            Redemption code
          </label>
          <input
            id="code"
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            className="input mono"
            style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}
            placeholder="e.g. K7P2QX"
          />
        </div>
        <SubmitButton className="btn btn-gold" pendingText="Redeeming…">
          Redeem
        </SubmitButton>
      </div>
      <p className="text-xs" style={{ color: "var(--color-faint)" }}>
        Ask the customer to reveal the coupon in their app and read you the code.
      </p>
      {state.error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }} role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm" style={{ color: "var(--color-success)" }}>
          ✓ {state.ok}
        </p>
      )}
    </form>
  );
}
