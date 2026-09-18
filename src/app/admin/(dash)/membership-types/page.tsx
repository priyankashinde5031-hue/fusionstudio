import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { TIER_THEMES } from "@/lib/themes";
import { formatRupees } from "@/lib/format";
import type { MembershipType, Benefit } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function MembershipTypesPage() {
  await requireAdmin();
  const supabase = db();

  const [{ data: types }, { data: benefits }] = await Promise.all([
    supabase.from("membership_types").select("*").order("created_at", { ascending: true }),
    supabase.from("benefits").select("id, membership_type_id"),
  ]);

  const benefitCount = new Map<string, number>();
  (benefits ?? []).forEach((b: Pick<Benefit, "id" | "membership_type_id">) => {
    benefitCount.set(b.membership_type_id, (benefitCount.get(b.membership_type_id) ?? 0) + 1);
  });

  const list = (types ?? []) as MembershipType[];

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">Membership Types</div>
          <h1 className="display text-4xl">Tiers &amp; benefits</h1>
        </div>
        <Link href="/admin/membership-types/new" className="btn btn-gold">
          + New type
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="text-3xl mb-3" style={{ color: "var(--color-gold)" }}>
            ❖
          </div>
          <p className="font-semibold mb-1">No membership types yet</p>
          <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
            Create your first tier — Silver, Gold, Platinum or Black.
          </p>
          <Link href="/admin/membership-types/new" className="btn btn-gold">
            + New type
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((t) => {
            const theme = TIER_THEMES[t.theme];
            return (
              <Link
                key={t.id}
                href={`/admin/membership-types/${t.id}`}
                className="panel panel-hover p-5 block relative overflow-hidden"
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: theme.accent }}
                />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ background: "var(--color-surface-2)", color: theme.accent }}
                    >
                      ◈
                    </span>
                    <div>
                      <div className="font-semibold text-lg leading-tight">{t.name}</div>
                      <div className="text-xs" style={{ color: "var(--color-faint)" }}>
                        {theme.label} · {theme.finish}
                      </div>
                    </div>
                  </div>
                  <span className={t.is_active ? "chip chip-success" : "chip chip-muted"}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {t.description && (
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--color-muted)" }}>
                    {t.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-muted)" }}>
                  <span className="mono">{formatRupees(t.price)}</span>
                  <span style={{ color: "var(--color-hairline-strong)" }}>·</span>
                  <span>{t.validity_days} days</span>
                  <span style={{ color: "var(--color-hairline-strong)" }}>·</span>
                  <span>{benefitCount.get(t.id) ?? 0} benefits</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
