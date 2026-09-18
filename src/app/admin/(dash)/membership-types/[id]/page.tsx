import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { MembershipTypeForm } from "@/components/admin/MembershipTypeForm";
import { updateMembershipType, toggleMembershipTypeActive } from "../actions";
import type { MembershipType, Benefit } from "@/lib/db/types";

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

  const boundUpdate = updateMembershipType.bind(null, id);
  const boundToggle = toggleMembershipTypeActive.bind(null, id, !t.is_active);

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
    </div>
  );
}
