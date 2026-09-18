import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { MembershipTypeForm } from "@/components/admin/MembershipTypeForm";
import { createMembershipType } from "../actions";

export default async function NewMembershipTypePage() {
  await requireAdmin();

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/membership-types"
          className="text-sm"
          style={{ color: "var(--color-muted)" }}
        >
          ← Membership Types
        </Link>
        <h1 className="display text-4xl mt-2">New membership type</h1>
      </div>
      <MembershipTypeForm action={createMembershipType} submitLabel="Create type" />
    </div>
  );
}
