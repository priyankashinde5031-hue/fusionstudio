import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { CouponForm } from "@/components/admin/CouponForm";
import { updateCouponDefinition, toggleCouponActive } from "../actions";
import { formatInTimeZone } from "date-fns-tz";
import { IST } from "@/lib/format";
import type { CouponDefinition } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** timestamptz → yyyy-mm-dd in IST for the date inputs */
function toDateInput(ts: string): string {
  return formatInTimeZone(new Date(ts), IST, "yyyy-MM-dd");
}

export default async function EditCouponPage({
  params,
}: PageProps<"/admin/coupons/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const { data } = await db()
    .from("coupon_definitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const c = data as CouponDefinition;

  const boundUpdate = updateCouponDefinition.bind(null, id);
  const boundToggle = toggleCouponActive.bind(null, id, !c.is_active);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/admin/coupons" className="text-sm" style={{ color: "var(--color-muted)" }}>
            ← Coupons
          </Link>
          <h1 className="display text-4xl mt-2">{c.name}</h1>
          <div className="text-xs mt-1 mono" style={{ color: "var(--color-faint)" }}>
            {c.id}
          </div>
        </div>
        <form action={boundToggle}>
          <button type="submit" className={c.is_active ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"}>
            {c.is_active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>

      <CouponForm
        action={boundUpdate}
        submitLabel="Save changes"
        defaults={{
          name: c.name,
          description: c.description,
          terms: c.terms ?? "",
          valid_from: toDateInput(c.valid_from),
          valid_until: toDateInput(c.valid_until),
          is_active: c.is_active,
        }}
      />
    </div>
  );
}
