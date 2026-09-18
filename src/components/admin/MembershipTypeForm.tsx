"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { TIER_LIST, TIER_THEMES } from "@/lib/themes";
import type { FormState } from "@/app/admin/(dash)/membership-types/actions";
import type { MembershipTheme } from "@/lib/db/types";

export interface MembershipTypeDefaults {
  name: string;
  description: string;
  price: string;
  validity_days: string;
  theme: MembershipTheme;
  is_active: boolean;
  benefits: string;
}

const EMPTY: MembershipTypeDefaults = {
  name: "",
  description: "",
  price: "",
  validity_days: "365",
  theme: "gold",
  is_active: true,
  benefits: "",
};

export function MembershipTypeForm({
  action,
  defaults = EMPTY,
  submitLabel = "Create type",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: MembershipTypeDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [theme, setTheme] = useState<MembershipTheme>(defaults.theme);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="panel p-6 flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={defaults.name}
              className="input"
              placeholder="e.g. Gold"
            />
          </div>

          <div>
            <label className="label">Tier finish</label>
            <div className="grid grid-cols-2 gap-2">
              {TIER_LIST.map((t) => {
                const selected = theme === t.key;
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors"
                    style={{
                      background: selected ? "var(--color-gold-soft)" : "var(--color-ink-2)",
                      border: `1px solid ${
                        selected
                          ? "color-mix(in srgb, var(--color-gold) 45%, transparent)"
                          : "var(--color-hairline)"
                      }`,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ background: t.accent, boxShadow: "0 0 0 1px rgba(0,0,0,0.3) inset" }}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{t.label}</span>
                      <span className="block text-[0.65rem]" style={{ color: "var(--color-faint)" }}>
                        {t.finish}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="theme" value={theme} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="price">
                Price (₹) <span style={{ color: "var(--color-faint)" }}>optional</span>
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={defaults.price}
                className="input"
                placeholder="—"
              />
            </div>
            <div>
              <label className="label" htmlFor="validity_days">
                Validity (days)
              </label>
              <input
                id="validity_days"
                name="validity_days"
                type="number"
                min="1"
                required
                defaultValue={defaults.validity_days}
                className="input"
              />
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

        {/* Right column */}
        <div className="panel p-6 flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="description">
              Description <span style={{ color: "var(--color-faint)" }}>optional</span>
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaults.description}
              className="textarea"
              placeholder="A short line describing this tier."
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="label" htmlFor="benefits">
              Benefits <span style={{ color: "var(--color-faint)" }}>one per line — order = display order</span>
            </label>
            <textarea
              id="benefits"
              name="benefits"
              defaultValue={defaults.benefits}
              className="textarea flex-1"
              style={{ minHeight: 200 }}
              placeholder={"10% off all services\n1 free head spa / month\nPriority booking"}
            />
            <p className="text-xs mt-2" style={{ color: "var(--color-faint)" }}>
              Reorder by moving lines; remove by deleting a line. Saved on submit.
            </p>
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
        <Link href="/admin/membership-types" className="btn btn-ghost">
          Cancel
        </Link>
        <span className="ml-auto text-xs" style={{ color: "var(--color-faint)" }}>
          {TIER_THEMES[theme].label} · {TIER_THEMES[theme].finish}
        </span>
      </div>
    </form>
  );
}
