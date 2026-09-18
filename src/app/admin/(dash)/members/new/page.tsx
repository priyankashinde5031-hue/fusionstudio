import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { MemberForm } from "@/components/admin/MemberForm";

export default async function NewMemberPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/members" className="text-sm" style={{ color: "var(--color-muted)" }}>
          ← Members
        </Link>
        <h1 className="display text-4xl mt-2">New member</h1>
      </div>
      <MemberForm />
    </div>
  );
}
