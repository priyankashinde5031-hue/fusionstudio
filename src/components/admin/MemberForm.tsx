"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { createMember, type FormState } from "@/app/admin/(dash)/members/actions";

export function MemberForm() {
  const [state, formAction] = useActionState<FormState, FormData>(createMember, {});

  return (
    <form action={formAction} className="panel p-6 flex flex-col gap-5 max-w-lg">
      <div>
        <label className="label" htmlFor="mobile">
          Mobile number
        </label>
        <input
          id="mobile"
          name="mobile"
          required
          className="input mono"
          placeholder="+91 98200 11223"
          inputMode="tel"
        />
        <p className="text-xs mt-1.5" style={{ color: "var(--color-faint)" }}>
          10 digits starting 6–9. This is the member&apos;s identity.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="name">
          Name <span style={{ color: "var(--color-faint)" }}>optional</span>
        </label>
        <input id="name" name="name" className="input" placeholder="e.g. Aarav Mehta" />
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          name="is_loyalty"
          defaultChecked
          className="w-4 h-4 accent-[var(--color-gold)]"
        />
        <span className="text-sm">Loyalty member (uncheck for a guest)</span>
      </label>

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

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Creating…">Create member</SubmitButton>
        <Link href="/admin/members" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
