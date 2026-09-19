import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { formatMobile, formatDate, formatDateTime, nowMs } from "@/lib/format";
import { TIER_THEMES } from "@/lib/themes";
import { MembershipCardMini } from "@/components/MembershipCardMini";
import { AssignCardForm, AssignCouponForm } from "@/components/admin/AssignForms";
import { RedeemForm } from "@/components/admin/RedeemForm";
import { UnassignButton } from "@/components/admin/UnassignButton";
import { EditMemberName } from "@/components/admin/EditMemberName";
import { revalidateCoupons } from "@/lib/coupons";
import {
  assignCardAction,
  assignCouponToMemberAction,
  upgradeMember,
  resetMemberPin,
  redeemCouponAction,
  previewRedeemAction,
  unassignCouponAction,
  updateMemberName,
} from "../actions";
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

const COUPON_CHIP: Record<string, string> = {
  available: "chip chip-success",
  revealed: "chip chip-gold",
  redeemed: "chip chip-muted",
  expired: "chip chip-danger",
};

export default async function MemberDetailPage({
  params,
}: PageProps<"/admin/members/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = db();

  const { data: memberRow } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!memberRow) notFound();
  const member = memberRow as Member;

  // Keep coupon states accurate for staff (§7 lazy compute).
  await revalidateCoupons({ memberId: id });

  const [{ data: cardRows }, { data: couponRows }, { data: typeRows }, { data: couponDefs }] =
    await Promise.all([
      supabase
        .from("membership_cards")
        .select("*, membership_type:membership_types(*)")
        .eq("member_id", id)
        .order("issued_at", { ascending: false }),
      supabase
        .from("assigned_coupons")
        .select("*, coupon_definition:coupon_definitions(*)")
        .eq("member_id", id)
        .is("unassigned_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("membership_types").select("id, name").eq("is_active", true).order("name"),
      supabase.from("coupon_definitions").select("id, name").eq("is_active", true).order("name"),
    ]);

  const cards = (cardRows ?? []) as CardWithType[];
  const coupons = (couponRows ?? []) as CouponWithDef[];

  // Redemption log (who availed each punch), grouped per coupon.
  type Redemption = {
    assigned_coupon_id: string;
    used_by_name: string | null;
    used_by_mobile: string | null;
    redeemed_by_admin_id: string | null;
    created_at: string;
  };
  const couponIds = coupons.map((c) => c.id);
  const redemptionsByCoupon = new Map<string, Redemption[]>();
  if (couponIds.length) {
    const { data: redRows } = await supabase
      .from("coupon_redemptions")
      .select("assigned_coupon_id, used_by_name, used_by_mobile, redeemed_by_admin_id, created_at")
      .in("assigned_coupon_id", couponIds)
      .order("created_at", { ascending: true });
    for (const r of (redRows ?? []) as Redemption[]) {
      const list = redemptionsByCoupon.get(r.assigned_coupon_id) ?? [];
      list.push(r);
      redemptionsByCoupon.set(r.assigned_coupon_id, list);
    }
  }

  const now = nowMs();
  const activeCard =
    cards.find((c) => c.status === "active" && new Date(c.valid_until).getTime() > now) ?? null;

  let benefits: Benefit[] = [];
  if (activeCard?.membership_type) {
    const { data: b } = await supabase
      .from("benefits")
      .select("*")
      .eq("membership_type_id", activeCard.membership_type.id)
      .order("sort_order");
    benefits = (b ?? []) as Benefit[];
  }

  const boundAssignCard = assignCardAction.bind(null, id);
  const boundAssignCoupon = assignCouponToMemberAction.bind(null, id);
  const boundUpgrade = upgradeMember.bind(null, id);
  const boundResetPin = resetMemberPin.bind(null, id);
  const boundRedeem = redeemCouponAction.bind(null, id);
  const boundPreviewRedeem = previewRedeemAction.bind(null, id);
  const hasRevealed = coupons.some((c) => c.status === "revealed");

  // Active coupons first, historical (used/expired) at the bottom.
  const STATUS_RANK: Record<string, number> = { revealed: 0, available: 1, redeemed: 2, expired: 3 };
  const sortedCoupons = [...coupons].sort(
    (a, b) =>
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/admin/members" className="text-sm" style={{ color: "var(--color-muted)" }}>
            ← Members
          </Link>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <EditMemberName action={updateMemberName.bind(null, id)} initialName={member.name} />
            <span className={member.is_loyalty ? "chip chip-gold" : "chip chip-muted"}>
              {member.is_loyalty ? "Loyalty" : "Guest"}
            </span>
          </div>
          <div className="mono text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            {formatMobile(member.mobile)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-faint)" }}>
            {member.mobile_verified_at ? "Verified" : "Not yet verified"} ·{" "}
            {member.pin_hash ? (member.pin_reset_required ? "PIN reset pending" : "PIN set") : "No PIN yet"} ·
            joined {formatDate(member.created_at)} · via {member.created_via}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!member.is_loyalty && (
            <form action={boundUpgrade}>
              <button type="submit" className="btn btn-gold btn-sm">
                ↑ Upgrade to Loyalty
              </button>
            </form>
          )}
          {(member.pin_hash || member.mobile_verified_at) && !member.pin_reset_required && (
            <form action={boundResetPin}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Reset PIN
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card + benefits */}
        <section className="flex flex-col gap-5">
          <div className="eyebrow">Membership card</div>
          {activeCard && activeCard.membership_type ? (
            <>
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

              {benefits.length > 0 && (
                <div className="panel p-5">
                  <div className="eyebrow mb-3">Benefits</div>
                  <ul className="flex flex-col gap-2">
                    {benefits.map((b) => (
                      <li key={b.id} className="flex items-start gap-2.5 text-sm">
                        <span style={{ color: "var(--color-gold)" }}>✦</span>
                        <span>{b.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="panel p-8 text-center">
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No active card. Issue one below.
              </p>
            </div>
          )}

          <div className="panel p-5">
            <div className="eyebrow mb-3">Issue a card</div>
            <AssignCardForm action={boundAssignCard} types={(typeRows ?? []) as { id: string; name: string }[]} />
          </div>

          {cards.length > 1 && (
            <div className="text-xs" style={{ color: "var(--color-faint)" }}>
              {cards.length} cards on record (incl. expired/revoked).
            </div>
          )}
        </section>

        {/* Coupons: Redeem → Assign → list */}
        <section className="flex flex-col gap-5">
          <div
            className="panel p-5"
            style={
              hasRevealed
                ? { borderColor: "color-mix(in srgb, var(--color-gold) 45%, transparent)" }
                : undefined
            }
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="eyebrow">Redeem a coupon</div>
              {hasRevealed && <span className="chip chip-gold">code active</span>}
            </div>
            <RedeemForm preview={boundPreviewRedeem} redeem={boundRedeem} />
          </div>

          <div className="panel p-5">
            <div className="eyebrow mb-3">Assign a coupon</div>
            <AssignCouponForm
              action={boundAssignCoupon}
              coupons={(couponDefs ?? []) as { id: string; name: string }[]}
            />
          </div>

          <div>
            <div className="eyebrow mb-3">Coupons ({coupons.length})</div>
            {coupons.length === 0 ? (
              <div className="panel p-8 text-center">
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  No coupons yet.
                </p>
              </div>
            ) : (
              <div className="panel overflow-hidden">
                {sortedCoupons.map((c, i) => {
                  const limit = c.coupon_definition?.usage_limit ?? 1;
                  const log = redemptionsByCoupon.get(c.id) ?? [];
                  return (
                    <div
                      key={c.id}
                      className="px-4 py-3"
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)",
                        opacity: c.status === "redeemed" || c.status === "expired" ? 0.75 : 1,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">
                            {c.coupon_definition?.name ?? "Coupon"}
                            {limit > 1 && (
                              <span style={{ color: "var(--color-faint)" }}>
                                {" "}· {c.uses_count} of {limit} used
                              </span>
                            )}
                          </div>
                          <div className="mono text-xs truncate" style={{ color: "var(--color-faint)" }}>
                            {c.coupon_number}
                          </div>
                        </div>
                        <span className={COUPON_CHIP[c.status] ?? "chip"}>{c.status}</span>
                        {c.status !== "redeemed" && (
                          <UnassignButton
                            action={unassignCouponAction.bind(null, id, c.id)}
                            label={c.coupon_definition?.name ?? c.coupon_number}
                          />
                        )}
                      </div>

                      {log.length > 0 && (
                        <div
                          className="mt-2 pl-3 flex flex-col gap-1"
                          style={{ borderLeft: "2px solid var(--color-hairline-strong)" }}
                        >
                          {log.map((r, idx) => {
                            const who =
                              r.used_by_name ||
                              (r.used_by_mobile ? formatMobile(r.used_by_mobile) : "Not recorded");
                            return (
                              <div key={idx} className="text-xs" style={{ color: "var(--color-muted)" }}>
                                <span style={{ color: "var(--color-gold)" }}>#{idx + 1}</span>{" "}
                                <span className="font-medium" style={{ color: "var(--color-fg)" }}>
                                  {who}
                                </span>{" "}
                                · {formatDateTime(r.created_at)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
