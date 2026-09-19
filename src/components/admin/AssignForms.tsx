"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/app/admin/(dash)/members/actions";

function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="text-xs mt-2" style={{ color: "var(--color-danger)" }}>
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="text-xs mt-2" style={{ color: "var(--color-success)" }}>
        ✓ {state.ok}
      </p>
    );
  return null;
}

export function AssignCardForm({
  action,
  types,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  types: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  if (types.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-faint)" }}>
        No active membership types. Create one first.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="membership_type_id">
          Membership type
        </label>
        <select id="membership_type_id" name="membership_type_id" className="select" required>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton className="btn btn-gold w-full" pendingText="Issuing…">
        Issue card
      </SubmitButton>
      <Feedback state={state} />
    </form>
  );
}

export function AssignCouponForm({
  action,
  coupons,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  coupons: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  if (coupons.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-faint)" }}>
        No active coupons. Create one first.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="coupon_definition_id">
          Coupon
        </label>
        <select id="coupon_definition_id" name="coupon_definition_id" className="select" required>
          {coupons.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton className="btn btn-ghost w-full" pendingText="Assigning…">
        Assign coupon
      </SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
