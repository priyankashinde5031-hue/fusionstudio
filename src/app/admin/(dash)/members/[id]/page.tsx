import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { formatMobile, formatDate, nowMs } from "@/lib/format";
import { TIER_THEMES } from "@/lib/themes";
import { MembershipCardMini } from "@/components/MembershipCardMini";
import { AssignCardForm, AssignCouponForm } from "@/components/admin/AssignForms";
import {
  assignCardAction,
  assignCouponToMemberAction,
  upgradeMember,
  resetMemberPin,
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
        .order("created_at", { ascending: false }),
      supabase.from("membership_types").select("id, name").eq("is_active", true).order("name"),
      supabase.from("coupon_definitions").select("id, name").eq("is_active", true).order("name"),
    ]);

  const cards = (cardRows ?? []) as CardWithType[];
  const coupons = (couponRows ?? []) as CouponWithDef[];
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/admin/members" className="text-sm" style={{ color: "var(--color-muted)" }}>
            ← Members
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="display text-4xl">{member.name ?? "Unnamed member"}</h1>
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

        {/* Coupons wallet */}
        <section className="flex flex-col gap-5">
          <div className="eyebrow">Coupons ({coupons.length})</div>

          {coupons.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No coupons yet.
              </p>
            </div>
          ) : (
            <div className="panel overflow-hidden">
              {coupons.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {c.coupon_definition?.name ?? "Coupon"}
                    </div>
                    <div className="mono text-xs truncate" style={{ color: "var(--color-faint)" }}>
                      {c.coupon_number}
                    </div>
                  </div>
                  <span className={COUPON_CHIP[c.status] ?? "chip"}>{c.status}</span>
                </div>
              ))}
            </div>
          )}

          <div className="panel p-5">
            <div className="eyebrow mb-3">Assign a coupon</div>
            <AssignCouponForm
              action={boundAssignCoupon}
              coupons={(couponDefs ?? []) as { id: string; name: string }[]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
