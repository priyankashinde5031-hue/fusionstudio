"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate } from "@/lib/format";
import type { FormState } from "@/app/admin/(dash)/membership-types/actions";
import type { CouponKind } from "@/lib/db/types";

type CouponOption = {
  id: string;
  name: string;
  description: string;
  kind: CouponKind;
  valid_until: string | null;
};

function KindBadge({ kind }: { kind: CouponKind }) {
  const membership = kind === "membership";
  return (
    <span
      className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full"
      style={{
        color: membership ? "var(--color-gold-bright)" : "var(--color-muted)",
        background: membership
          ? "color-mix(in srgb, var(--color-gold) 15%, transparent)"
          : "var(--color-surface-2)",
        border: `1px solid ${
          membership
            ? "color-mix(in srgb, var(--color-gold) 35%, transparent)"
            : "var(--color-hairline)"
        }`,
      }}
    >
      {membership ? "Membership" : "Marketing"}
    </span>
  );
}

export function DefaultCouponsForm({
  action,
  coupons,
  selectedIds,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  coupons: CouponOption[];
  selectedIds: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const selected = new Set(selectedIds);

  const membership = coupons.filter((c) => c.kind === "membership");
  const marketing = coupons.filter((c) => c.kind !== "membership");

  function row(c: CouponOption) {
    return (
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
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{c.name}</span>
            <KindBadge kind={c.kind} />
          </span>
          <span className="block text-xs truncate" style={{ color: "var(--color-faint)" }}>
            {c.description}
          </span>
          <span className="block text-[11px] mt-0.5" style={{ color: "var(--color-faint)" }}>
            {c.kind === "membership"
              ? "Expires with the membership"
              : `Expires ${c.valid_until ? formatDate(c.valid_until) : "—"}`}
          </span>
        </span>
      </label>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {coupons.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-faint)" }}>
          No active coupons to offer. Create a coupon first.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {membership.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="eyebrow">Membership coupons</div>
              {membership.map(row)}
            </div>
          )}
          {marketing.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="eyebrow">Marketing coupons</div>
              {marketing.map(row)}
            </div>
          )}
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
