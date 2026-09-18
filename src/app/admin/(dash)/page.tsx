import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const admin = await requireAdmin();
  const supabase = db();

  const [typesRes, activeTypesRes, couponsRes, activeCouponsRes, membersRes] =
    await Promise.all([
      supabase.from("membership_types").select("*", { count: "exact", head: true }),
      supabase
        .from("membership_types")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("coupon_definitions").select("*", { count: "exact", head: true }),
      supabase
        .from("coupon_definitions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("members").select("*", { count: "exact", head: true }),
    ]);

  const typeCount = typesRes.count ?? 0;
  const activeTypes = activeTypesRes.count ?? 0;
  const couponCount = couponsRes.count ?? 0;
  const activeCoupons = activeCouponsRes.count ?? 0;
  const memberCount = membersRes.count ?? 0;

  const firstName = (admin.name ?? "there").split(" ")[0];

  const stats = [
    { label: "Membership Types", value: typeCount, sub: `${activeTypes} active`, href: "/admin/membership-types" },
    { label: "Coupons", value: couponCount, sub: `${activeCoupons} active`, href: "/admin/coupons" },
    { label: "Members", value: memberCount, sub: "Phase 2", href: "/admin/members", soon: true },
  ];

  return (
    <div>
      <div className="mb-9">
        <div className="eyebrow mb-2">Overview</div>
        <h1 className="display text-4xl sm:text-5xl">Welcome back, {firstName}.</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          Define tiers, benefits and coupons. Phase 1 — foundation &amp; admin core.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => {
          const inner = (
            <>
              <div className="text-sm" style={{ color: "var(--color-muted)" }}>
                {s.label}
              </div>
              <div className="mono text-4xl font-semibold mt-3 mb-1">{s.value}</div>
              <div className="text-xs" style={{ color: "var(--color-faint)" }}>
                {s.sub}
              </div>
            </>
          );
          return s.soon ? (
            <div key={s.label} className="panel p-5" style={{ opacity: 0.6 }}>
              {inner}
            </div>
          ) : (
            <Link key={s.label} href={s.href} className="panel panel-hover p-5 block">
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="eyebrow mb-3">Quick actions</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/membership-types/new" className="panel panel-hover p-5 flex items-center gap-4">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: "var(--color-gold-soft)", color: "var(--color-gold-bright)" }}
          >
            ❖
          </span>
          <div>
            <div className="font-semibold">New membership type</div>
            <div className="text-xs" style={{ color: "var(--color-muted)" }}>
              Define a tier, its benefits &amp; validity
            </div>
          </div>
        </Link>
        <Link href="/admin/coupons/new" className="panel panel-hover p-5 flex items-center gap-4">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: "var(--color-gold-soft)", color: "var(--color-gold-bright)" }}
          >
            ✦
          </span>
          <div>
            <div className="font-semibold">New coupon</div>
            <div className="text-xs" style={{ color: "var(--color-muted)" }}>
              Create a coupon definition with validity &amp; expiry
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
