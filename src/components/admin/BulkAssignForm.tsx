"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/app/admin/(dash)/members/actions";

export function BulkAssignForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="panel p-6 flex flex-col gap-5 max-w-2xl">
      <div>
        <label className="label" htmlFor="mobiles">
          Mobile numbers
        </label>
        <textarea
          id="mobiles"
          name="mobiles"
          required
          className="textarea mono"
          style={{ minHeight: 180 }}
          placeholder={"+91 98200 11223\n9833044556\n7700088990"}
        />
        <p className="text-xs mt-2" style={{ color: "var(--color-faint)" }}>
          One per line (commas or spaces also work). Unknown numbers are created as
          Guest Members. Invalid numbers are skipped.
        </p>
      </div>

      {state.error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          role="alert"
          style={{
            color: "var(--color-danger)",
            background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
          }}
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{
            color: "var(--color-success)",
            background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-success) 35%, transparent)",
          }}
        >
          ✓ {state.ok}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Assigning…">Assign to all</SubmitButton>
        <Link href="/admin/coupons" className="btn btn-ghost">
          Done
        </Link>
      </div>
    </form>
  );
}
