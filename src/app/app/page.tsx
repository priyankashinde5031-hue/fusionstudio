import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { db } from "@/lib/supabase/admin";
import { formatDate, formatDateTime, formatMobile, nowMs } from "@/lib/format";
import { TIER_THEMES } from "@/lib/themes";
import { MembershipCardMini } from "@/components/MembershipCardMini";
import { RevealButton } from "@/components/app/RevealButton";
import { TransferButton } from "@/components/app/TransferButton";
import { RevealedCouponCard } from "@/components/app/RevealedCouponCard";
import { revalidateCoupons } from "@/lib/coupons";
import { logoutMember } from "./login/actions";
import type {
  Member,
  MembershipCard,
  MembershipType,
  Benefit,
  AssignedCoupon,
  CouponDefinition,
} from "@/lib/db/types";

export const dynamic = "force-dynamic";

type CardWithType = MembershipCard & { membership_type: MembershipType | null };
type CouponWithDef = AssignedCoupon & { coupon_definition: CouponDefinition | null };

const GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "available", label: "Available", statuses: ["available"] },
  { key: "revealed", label: "Active", statuses: ["revealed"] },
  { key: "used", label: "Used", statuses: ["redeemed"] },
  { key: "expired", label: "Expired", statuses: ["expired"] },
];

export default async function CustomerHome() {
  const session = await requireMember();
  const supabase = db();

  const { data: memberRow } = await supabase
    .from("members")
    .select("*")
    .eq("id", session.memberId)
    .maybeSingle();

  // Session valid but member gone/deactivated — treat as signed out.
  if (!memberRow) redirect("/app/login");
  const member = memberRow as Member;

  // Lazy state correction (§7): fix any lapsed reveals / expiries on read.
  await revalidateCoupons({ memberId: member.id });

  const [{ data: cardRows }, { data: couponRows }] = await Promise.all([
    supabase
      .from("membership_cards")
      .select("*, membership_type:membership_types(*)")
      .eq("member_id", member.id)
      .order("issued_at", { ascending: false }),
    supabase
      .from("assigned_coupons")
      .select("*, coupon_definition:coupon_definitions(*)")
      .eq("member_id", member.id)
      .is("unassigned_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const cards = (cardRows ?? []) as CardWithType[];
  const coupons = (couponRows ?? []) as CouponWithDef[];
  const now = nowMs();
  const activeCard =
    cards.find((c) => c.status === "active" && new Date(c.valid_until).getTime() > now) ?? null;

  let benefits: Benefit[] = [];
  if (activeCard?.membership_type) {
    const { data } = await supabase
      .from("benefits")
      .select("*")
      .eq("membership_type_id", activeCard.membership_type.id)
      .order("sort_order");
    benefits = (data ?? []) as Benefit[];
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
        style={{
          background: "color-mix(in srgb, var(--color-ink) 88%, transparent)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        <div className="wordmark text-xl">
          Fusion<span style={{ color: "var(--color-gold)" }}>Studio</span>
        </div>
        <form action={logoutMember}>
          <button
            type="submit"
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex-1 px-5 py-6 flex flex-col gap-7">
        {/* Greeting */}
        <div>
          <div className="eyebrow mb-1">{member.is_loyalty ? "Member" : "Guest"}</div>
          <h1 className="display text-3xl">
            {member.name ? `Hi, ${member.name.split(" ")[0]}` : "Welcome"}
          </h1>
          <div className="mono text-sm mt-1" style={{ color: "var(--color-faint)" }}>
            {formatMobile(member.mobile)}
          </div>
        </div>

        {/* Card / guest state */}
        {activeCard && activeCard.membership_type ? (
          <section className="flex flex-col items-center gap-3">
            <MembershipCardMini
              theme={activeCard.membership_type.theme}
              tierName={activeCard.membership_type.name}
              memberName={member.name}
              membershipNumber={activeCard.membership_number}
              validUntil={activeCard.valid_until}
            />
            <div className="text-xs" style={{ color: "var(--color-faint)" }}>
              {TIER_THEMES[activeCard.membership_type.theme].label} · valid till{" "}
              {formatDate(activeCard.valid_until)}
            </div>
          </section>
        ) : (
          <section
            className="panel p-6 text-center"
            style={{ background: "linear-gradient(180deg, var(--color-surface), var(--color-ink-2))" }}
          >
            <div className="text-2xl mb-2" style={{ color: "var(--color-gold)" }}>
              ✦
            </div>
            <p className="font-semibold mb-1">No membership card yet</p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              You can still hold and use coupons below. Ask the salon about becoming a
              member for a card and benefits.
            </p>
          </section>
        )}

        {/* Benefits */}
        {benefits.length > 0 && (
          <section>
            <div className="eyebrow mb-3">Your benefits</div>
            <div className="panel p-5">
              <ul className="flex flex-col gap-2.5">
                {benefits.map((b) => (
                  <li key={b.id} className="flex items-start gap-2.5 text-sm">
                    <span style={{ color: "var(--color-gold)" }}>✦</span>
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Coupons wallet */}
        <section>
          <div className="eyebrow mb-3">Coupons</div>
          {coupons.length === 0 ? (
            <div className="panel p-6 text-center">
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No coupons yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {GROUPS.map((g) => {
                const items = coupons.filter((c) => g.statuses.includes(c.status));
                if (items.length === 0) return null;
                return (
                  <div key={g.key}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-faint)" }}>
                      {g.label} ({items.length})
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {items.map((c) => {
                        // Active (revealed) coupons show the code to present at the counter.
                        if (g.key === "revealed" && c.redemption_code) {
                          return (
                            <RevealedCouponCard
                              key={c.id}
                              couponId={c.id}
                              name={c.coupon_definition?.name ?? "Coupon"}
                              description={c.coupon_definition?.description ?? ""}
                              couponNumber={c.coupon_number}
                              code={c.redemption_code}
                            />
                          );
                        }
                        return (
                          <div
                            key={c.id}
                            className="panel p-4"
                            style={{ opacity: g.key === "used" || g.key === "expired" ? 0.6 : 1 }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {c.coupon_definition?.name ?? "Coupon"}
                                </div>
                                <div className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
                                  {c.coupon_definition?.description}
                                </div>
                              </div>
                              {g.key !== "available" && (
                                <span className="chip chip-muted">{g.label}</span>
                              )}
                            </div>
                            {c.coupon_definition && (
                              <div className="mt-3 flex items-center gap-3 text-xs mono" style={{ color: "var(--color-faint)" }}>
                                <span>{c.coupon_number}</span>
                                <span style={{ color: "var(--color-hairline-strong)" }}>·</span>
                                <span>exp {formatDate(c.coupon_definition.valid_until)}</span>
                              </div>
                            )}
                            {c.status === "redeemed" && c.redeemed_at && (
                              <div className="mt-1 text-xs" style={{ color: "var(--color-faint)" }}>
                                Used {formatDateTime(c.redeemed_at)}
                              </div>
                            )}
                            {g.key === "available" && (
                              <div className="mt-3 flex flex-wrap items-start gap-2">
                                <RevealButton couponId={c.id} />
                                <TransferButton couponId={c.id} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs mt-4 text-center" style={{ color: "var(--color-faint)" }}>
            Reveal a code to use in-salon, or transfer an unused coupon to a friend.
          </p>
        </section>
      </main>
    </div>
  );
}
