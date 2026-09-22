import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { BulkAssignForm } from "@/components/admin/BulkAssignForm";
import { AssignAllButton } from "@/components/admin/AssignAllButton";
import { bulkAssignCouponAction, assignToAllMembersAction } from "@/app/admin/(dash)/members/actions";
import type { CouponDefinition } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function AssignCouponPage({
  params,
}: PageProps<"/admin/coupons/[id]/assign">) {
  await requireAdmin();
  const { id } = await params;

  const { data } = await db()
    .from("coupon_definitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const c = data as CouponDefinition;

  const bound = bulkAssignCouponAction.bind(null, id);
  const boundAll = assignToAllMembersAction.bind(null, id);

  return (
    <div>
      <div className="mb-8">
        <Link href={`/admin/coupons/${id}`} className="text-sm" style={{ color: "var(--color-muted)" }}>
          ← {c.name}
        </Link>
        <h1 className="display text-4xl mt-2">Assign “{c.name}”</h1>
        <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
          {c.description} ·{" "}
          {c.kind === "membership"
            ? "expires with membership"
            : `valid ${formatDate(c.valid_from)} → ${c.valid_until ? formatDate(c.valid_until) : "—"}`}
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <AssignAllButton action={boundAll} />
        <div>
          <div className="eyebrow mb-3">Or assign to specific numbers</div>
          <BulkAssignForm action={bound} />
        </div>
      </div>
    </div>
  );
}
