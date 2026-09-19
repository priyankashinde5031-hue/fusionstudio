import { requireAdmin } from "@/lib/auth/admin";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { changeAdminPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">Account</div>
        <h1 className="display text-4xl">Your account</h1>
        <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
          Signed in as <span className="mono">{admin.email}</span>
        </p>
      </div>

      <div className="panel p-6 max-w-md">
        <div className="eyebrow mb-4">Change password</div>
        <ChangePasswordForm action={changeAdminPassword} />
      </div>
    </div>
  );
}
