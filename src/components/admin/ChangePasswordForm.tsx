"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { PwState } from "@/app/admin/(dash)/account/actions";

export function ChangePasswordForm({
  action,
}: {
  action: (prev: PwState, formData: FormData) => Promise<PwState>;
}) {
  const [state, formAction] = useActionState<PwState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="current">
          Current password
        </label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="next">
          New password
        </label>
        <input id="next" name="next" type="password" autoComplete="new-password" required className="input" placeholder="At least 8 characters" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </div>

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

      <SubmitButton className="btn btn-gold" pendingText="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}
