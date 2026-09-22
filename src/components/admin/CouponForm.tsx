"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/app/admin/(dash)/coupons/actions";
import type { CouponKind } from "@/lib/db/types";

export interface CouponDefaults {
  name: string;
  description: string;
  terms: string;
  kind: CouponKind;
  valid_from: string; // yyyy-mm-dd
  valid_until: string; // yyyy-mm-dd
  usage_limit: string;
  is_active: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: CouponDefaults = {
  name: "",
  description: "",
  terms: "",
  kind: "marketing",
  valid_from: todayIso(),
  valid_until: "",
  usage_limit: "1",
  is_active: true,
};

export function CouponForm({
  action,
  defaults = EMPTY,
  submitLabel = "Create coupon",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: CouponDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [kind, setKind] = useState<CouponKind>(defaults.kind);
  const isMembership = kind === "membership";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel p-6 flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="name">
              Coupon name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={defaults.name}
              className="input"
              placeholder="e.g. Festive Head Spa"
            />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Benefit description
            </label>
            <textarea
              id="description"
              name="description"
              required
              defaultValue={defaults.description}
              className="textarea"
              placeholder="What the customer gets, e.g. 1 complimentary head spa."
            />
          </div>
          <div>
            <span className="label">Coupon type</span>
            <input type="hidden" name="kind" value={kind} />
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setKind("marketing")}
                className="panel px-3 py-2.5 text-left"
                style={{
                  borderColor: !isMembership ? "var(--color-gold)" : undefined,
                  outline: !isMembership ? "1px solid var(--color-gold)" : "none",
                }}
              >
                <div className="text-sm font-medium">Marketing</div>
                <div className="text-xs" style={{ color: "var(--color-faint)" }}>
                  Fixed start &amp; expiry dates
                </div>
              </button>
              <button
                type="button"
                onClick={() => setKind("membership")}
                className="panel px-3 py-2.5 text-left"
                style={{
                  borderColor: isMembership ? "var(--color-gold)" : undefined,
                  outline: isMembership ? "1px solid var(--color-gold)" : "none",
                }}
              >
                <div className="text-sm font-medium">Membership</div>
                <div className="text-xs" style={{ color: "var(--color-faint)" }}>
                  Expires with the membership
                </div>
              </button>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={defaults.is_active}
              className="w-4 h-4 accent-[var(--color-gold)]"
            />
            <span className="text-sm">Active (available to assign)</span>
          </label>
        </div>

        <div className="panel p-6 flex flex-col gap-5">
          {isMembership ? (
            <div
              className="rounded-lg px-3 py-3 text-sm"
              style={{
                color: "var(--color-muted)",
                background: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-gold) 25%, transparent)",
              }}
            >
              <div className="font-medium" style={{ color: "var(--color-fg)" }}>
                No expiry date needed
              </div>
              This coupon expires automatically together with the member&apos;s
              membership (the card&apos;s validity, ~365 days). If the membership
              lapses, the coupon expires with it.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="valid_from">
                    Validity (start)
                  </label>
                  <input
                    id="valid_from"
                    name="valid_from"
                    type="date"
                    required
                    defaultValue={defaults.valid_from}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="valid_until">
                    Expiry
                  </label>
                  <input
                    id="valid_until"
                    name="valid_until"
                    type="date"
                    required
                    defaultValue={defaults.valid_until}
                    className="input"
                  />
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--color-faint)" }}>
                Times are anchored to IST — a coupon is usable from 00:00 on the
                start date through 23:59 on the expiry date.
              </p>
            </>
          )}
          <div>
            <label className="label" htmlFor="usage_limit">
              Number of uses
            </label>
            <input
              id="usage_limit"
              name="usage_limit"
              type="number"
              min="1"
              max="100"
              required
              defaultValue={defaults.usage_limit}
              className="input"
              style={{ maxWidth: 160 }}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--color-faint)" }}>
              How many times it can be redeemed. e.g. 4 for “pay for 3, get 1 free”.
              Closes automatically after the last use.
            </p>
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="terms">
              Terms <span style={{ color: "var(--color-faint)" }}>optional</span>
            </label>
            <textarea
              id="terms"
              name="terms"
              defaultValue={defaults.terms}
              className="textarea"
              style={{ minHeight: 120 }}
              placeholder="Fine print, e.g. Not valid with other offers. One per visit."
            />
          </div>
        </div>
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

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        <Link href="/admin/coupons" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
