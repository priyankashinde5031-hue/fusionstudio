import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { logoutAction } from "@/app/admin/login/actions";
import { SidebarNav } from "@/components/admin/Sidebar";

export default async function AdminDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const initials = (admin.name ?? admin.email)
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className="lg:w-72 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 flex flex-col"
        style={{
          borderRight: "1px solid var(--color-hairline)",
          background: "linear-gradient(180deg, var(--color-ink-2), var(--color-ink))",
        }}
      >
        <div className="p-5 lg:p-6">
          <Link href="/admin" className="inline-flex items-baseline gap-0.5">
            <span className="wordmark text-2xl">Fusion</span>
            <span className="wordmark text-2xl" style={{ color: "var(--color-gold)" }}>
              Studio
            </span>
          </Link>
          <div className="eyebrow mt-1" style={{ fontSize: "0.6rem" }}>
            Admin
          </div>
        </div>

        <div className="px-4 lg:px-5 flex-1">
          <SidebarNav />
        </div>

        {/* Account footer */}
        <div
          className="m-4 lg:m-5 p-3 rounded-xl flex items-center gap-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              background: "linear-gradient(180deg, var(--color-gold-bright), var(--color-gold))",
              color: "#241c0c",
            }}
          >
            {initials || "FS"}
          </div>
          <Link href="/admin/account" className="min-w-0 flex-1" title="Account settings">
            <div className="text-sm font-semibold truncate">{admin.name ?? "Staff"}</div>
            <div className="text-xs truncate" style={{ color: "var(--color-faint)" }}>
              {admin.email}
            </div>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
              title="Sign out"
            >
              Exit
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 lg:py-12">{children}</div>
      </div>
    </div>
  );
}
