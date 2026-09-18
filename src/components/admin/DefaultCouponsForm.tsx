"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/app/admin/(dash)/membership-types/actions";

export function DefaultCouponsForm({
  action,
  coupons,
  selectedIds,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  coupons: { id: string; name: string; description: string }[];
  selectedIds: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const selected = new Set(selectedIds);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {coupons.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-faint)" }}>
          No active coupons to offer. Create a coupon first.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {coupons.map((c) => (
            <label
              key={c.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none"
              style={{ background: "var(--color-ink-2)", border: "1px solid var(--color-hairline)" }}
            >
              <input
                type="checkbox"
                name="coupon_ids"
                value={c.id}
                defaultChecked={selected.has(c.id)}
                className="w-4 h-4 mt-0.5 accent-[var(--color-gold)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{c.name}</span>
                <span className="block text-xs truncate" style={{ color: "var(--color-faint)" }}>
                  {c.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--color-faint)" }}>
        Checked coupons are auto-added to a member&apos;s wallet (as “available”) when
        they receive this card — and to current cardholders when you save.
      </p>

      {state.error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }} role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-xs" style={{ color: "var(--color-success)" }}>
          ✓ {state.ok}
        </p>
      )}

      <div>
        <SubmitButton pendingText="Saving…" className="btn btn-ghost btn-sm">
          Save default coupons
        </SubmitButton>
      </div>
    </form>
  );
}
