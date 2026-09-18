import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { CouponForm } from "@/components/admin/CouponForm";
import { createCouponDefinition } from "../actions";

export default async function NewCouponPage() {
  await requireAdmin();

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/coupons" className="text-sm" style={{ color: "var(--color-muted)" }}>
          ← Coupons
        </Link>
        <h1 className="display text-4xl mt-2">New coupon</h1>
      </div>
      <CouponForm action={createCouponDefinition} submitLabel="Create coupon" />
    </div>
  );
}
