import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { MembershipTypeForm } from "@/components/admin/MembershipTypeForm";
import { DefaultCouponsForm } from "@/components/admin/DefaultCouponsForm";
import {
  updateMembershipType,
  toggleMembershipTypeActive,
  updateDefaultCoupons,
} from "../actions";
import type { MembershipType, Benefit, CouponDefinition } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function EditMembershipTypePage({
  params,
}: PageProps<"/admin/membership-types/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = db();

  const { data: type } = await supabase
    .from("membership_types")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!type) notFound();
  const t = type as MembershipType;

  const { data: benefitRows } = await supabase
    .from("benefits")
    .select("*")
    .eq("membership_type_id", id)
    .order("sort_order", { ascending: true });

  const benefitsBlock = ((benefitRows ?? []) as Benefit[]).map((b) => b.text).join("\n");

  const [{ data: activeCoupons }, { data: defaultLinks }] = await Promise.all([
    supabase
      .from("coupon_definitions")
      .select("id, name, description")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("membership_type_default_coupons")
      .select("coupon_definition_id")
      .eq("membership_type_id", id),
  ]);

  const couponOptions = (activeCoupons ?? []) as Pick<
    CouponDefinition,
    "id" | "name" | "description"
  >[];
  const selectedDefaultIds = (defaultLinks ?? []).map(
    (l: { coupon_definition_id: string }) => l.coupon_definition_id,
  );

  const boundUpdate = updateMembershipType.bind(null, id);
  const boundToggle = toggleMembershipTypeActive.bind(null, id, !t.is_active);
  const boundDefaults = updateDefaultCoupons.bind(null, id);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link
            href="/admin/membership-types"
            className="text-sm"
            style={{ color: "var(--color-muted)" }}
          >
            ← Membership Types
          </Link>
          <h1 className="display text-4xl mt-2">{t.name}</h1>
          <div className="text-xs mt-1 mono" style={{ color: "var(--color-faint)" }}>
            {t.id}
          </div>
        </div>
        <form action={boundToggle}>
          <button type="submit" className={t.is_active ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"}>
            {t.is_active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>

      <MembershipTypeForm
        action={boundUpdate}
        submitLabel="Save changes"
        defaults={{
          name: t.name,
          description: t.description ?? "",
          price: t.price !== null ? String(t.price) : "",
          validity_days: String(t.validity_days),
          theme: t.theme,
          is_active: t.is_active,
          benefits: benefitsBlock,
        }}
      />

      <div className="panel p-6 mt-6">
        <div className="eyebrow mb-1">Default coupons</div>
        <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
          Coupons every {t.name} cardholder gets automatically, shown as available
          in their wallet.
        </p>
        <DefaultCouponsForm
          action={boundDefaults}
          coupons={couponOptions}
          selectedIds={selectedDefaultIds}
        />
      </div>
    </div>
  );
}
