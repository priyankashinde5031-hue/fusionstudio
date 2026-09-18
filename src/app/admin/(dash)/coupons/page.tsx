import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import type { CouponDefinition } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function displayStatus(c: CouponDefinition): { label: string; cls: string } {
  const now = Date.now();
  if (!c.is_active) return { label: "Inactive", cls: "chip chip-muted" };
  if (new Date(c.valid_until).getTime() < now) return { label: "Expired", cls: "chip chip-danger" };
  if (new Date(c.valid_from).getTime() > now) return { label: "Upcoming", cls: "chip" };
  return { label: "Live", cls: "chip chip-success" };
}

export default async function CouponsPage() {
  await requireAdmin();

  const { data } = await db()
    .from("coupon_definitions")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (data ?? []) as CouponDefinition[];

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">Coupons</div>
          <h1 className="display text-4xl">Coupon definitions</h1>
        </div>
        <Link href="/admin/coupons/new" className="btn btn-gold">
          + New coupon
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="text-3xl mb-3" style={{ color: "var(--color-gold)" }}>
            ✦
          </div>
          <p className="font-semibold mb-1">No coupons yet</p>
          <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
            Create a coupon definition — a template you can hand out to members.
          </p>
          <Link href="/admin/coupons/new" className="btn btn-gold">
            + New coupon
          </Link>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {list.map((c, i) => {
            const st = displayStatus(c);
            return (
              <Link
                key={c.id}
                href={`/admin/coupons/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-surface-2)]"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-gold-bright)" }}
                >
                  ✦
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-sm truncate" style={{ color: "var(--color-muted)" }}>
                    {c.description}
                  </div>
                </div>
                <div className="hidden sm:block text-right text-xs shrink-0" style={{ color: "var(--color-faint)" }}>
                  <div className="mono">{formatDate(c.valid_from)}</div>
                  <div className="mono">→ {formatDate(c.valid_until)}</div>
                </div>
                <span className={st.cls}>{st.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
