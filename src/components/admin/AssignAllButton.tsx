"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/admin/(dash)/members/actions";

function GoBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-gold btn-sm" disabled={pending} aria-busy={pending}>
      {pending ? "Assigning…" : "Yes, assign to all"}
    </button>
  );
}

export function AssignAllButton({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [armed, setArmed] = useState(false);

  return (
    <div className="panel p-5 max-w-2xl">
      <div className="eyebrow mb-1">Assign to all members</div>
      <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
        Gives this coupon to every active <strong>loyalty</strong> member (guests are
        skipped, and members who already hold it are skipped).
      </p>

      {!armed ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArmed(true)}>
          Assign to all loyalty members
        </button>
      ) : (
        <form action={formAction} className="flex items-center gap-2">
          <GoBtn />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArmed(false)}>
            Cancel
          </button>
        </form>
      )}

      {state.error && (
        <p className="text-sm mt-3" style={{ color: "var(--color-danger)" }} role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm mt-3" style={{ color: "var(--color-success)" }}>
          ✓ {state.ok}
        </p>
      )}
    </div>
  );
}
