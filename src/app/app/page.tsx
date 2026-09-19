import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { db } from "@/lib/supabase/admin";
import { formatDate, formatDateTime, formatMobile, nowMs } from "@/lib/format";
import { TIER_THEMES } from "@/lib/themes";
import { MembershipCardHero } from "@/components/app/MembershipCardHero";
import { RevealButton } from "@/components/app/RevealButton";
import { TransferButton } from "@/components/app/TransferButton";
import { RevealedCouponCard } from "@/components/app/RevealedCouponCard";
import { WalletTabs, type UsedItem, type TransferItem } from "@/components/app/WalletTabs";
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

/** Pick a friendly icon for a free-text benefit line. */
function benefitIcon(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("spa")) return "🧖";
  if (t.includes("hair") && t.includes("treat")) return "✨";
  if (t.includes("hair")) return "💇";
  if (t.includes("facial") || t.includes("treatment")) return "✨";
  if (t.includes("%") || t.includes("off") || t.includes("discount")) return "🏷️";
  if (t.includes("book")) return "📅";
  if (t.includes("beverage") || t.includes("drink") || t.includes("tea") || t.includes("coffee"))
    return "🥂";
  if (t.includes("home") || t.includes("service")) return "🚗";
  if (t.includes("stylist")) return "💈";
  if (t.includes("priority")) return "⭐";
  return "✦";
}

export default async function CustomerHome() {
  const session = await requireMember();
  const supabase = db();

  const { data: memberRow } = await supabase
    .from("members")
    .select("*")
    .eq("id", session.memberId)
    .maybeSingle();

  if (!memberRow) redirect("/app/login");
  const member = memberRow as Member;

  // Lazy state correction (§7): fix any lapsed reveals / expiries on read.
  await revalidateCoupons({ memberId: member.id });

  const [{ data: cardRows }, { data: couponRows }, { data: outRows }, { data: recvRows }] =
    await Promise.all([
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
      supabase
        .from("coupon_transfers")
        .select("id, to_mobile, created_at, assigned_coupon:assigned_coupons(coupon_definition:coupon_definitions(name))")
        .eq("from_member_id", member.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("coupon_transfers")
        .select("assigned_coupon_id, from_member_id, created_at")
        .eq("to_member_id", member.id)
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

  // "Received from" map: assigned_coupon_id -> latest inbound transfer.
  const recvRaw = (recvRows ?? []) as { assigned_coupon_id: string; from_member_id: string | null; created_at: string }[];
  const recvLatest = new Map<string, { from_member_id: string | null; at: string }>();
  for (const r of recvRaw) {
    if (!recvLatest.has(r.assigned_coupon_id))
      recvLatest.set(r.assigned_coupon_id, { from_member_id: r.from_member_id, at: r.created_at });
  }
  const fromIds = [...new Set([...recvLatest.values()].map((v) => v.from_member_id).filter(Boolean))] as string[];
  const fromMobile = new Map<string, string>();
  if (fromIds.length) {
    const { data: fm } = await supabase.from("members").select("id, mobile").in("id", fromIds);
    (fm ?? []).forEach((m: { id: string; mobile: string }) => fromMobile.set(m.id, m.mobile));
  }
  function receivedInfo(couponId: string): { mobile: string; at: string } | undefined {
    const r = recvLatest.get(couponId);
    if (!r || !r.from_member_id) return undefined;
    const mobile = fromMobile.get(r.from_member_id);
    return mobile ? { mobile, at: r.at } : undefined;
  }

  const available = coupons.filter((c) => c.status === "available");
  const revealed = coupons.filter((c) => c.status === "revealed" && c.redemption_code);

  const usedItems: UsedItem[] = coupons
    .filter((c) => c.status === "redeemed" || c.status === "expired")
    .map((c) => {
      const rec = receivedInfo(c.id);
      return {
        id: c.id,
        name: c.coupon_definition?.name ?? "Coupon",
        description: c.coupon_definition?.description ?? "",
        couponNumber: c.coupon_number,
        status: c.status as "redeemed" | "expired",
        redeemedAt: c.redeemed_at,
        expUntil: c.coupon_definition?.valid_until ?? c.created_at,
        receivedFromMobile: rec?.mobile,
        receivedAt: rec?.at,
      };
    });

  const transferItems: TransferItem[] = (
    (outRows ?? []) as unknown as {
      id: string;
      to_mobile: string;
      created_at: string;
      assigned_coupon: { coupon_definition: { name: string } | null } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.assigned_coupon?.coupon_definition?.name ?? "Coupon",
    toMobile: r.to_mobile,
    at: r.created_at,
  }));

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
            <MembershipCardHero
              theme={activeCard.membership_type.theme}
              tierName={activeCard.membership_type.name}
              memberName={member.name}
              membershipNumber={activeCard.membership_number}
              validUntil={activeCard.valid_until}
              benefits={benefits.map((b) => b.text)}
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

        {/* Benefits — horizontal, iconized */}
        {benefits.length > 0 && (
          <section>
            <div className="eyebrow mb-3">Your benefits</div>
            <div
              className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5"
              style={{ scrollbarWidth: "none" }}
            >
              {benefits.map((b) => (
                <div
                  key={b.id}
                  className="panel p-4 shrink-0 flex flex-col gap-2"
                  style={{ width: 150 }}
                >
                  <span className="text-2xl">{benefitIcon(b.text)}</span>
                  <span className="text-sm leading-snug">{b.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scroll affordance */}
        <div className="flex flex-col items-center -my-2" aria-hidden="true">
          <span className="text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: "var(--color-faint)" }}>
            Your coupons
          </span>
          <span style={{ color: "var(--color-gold)", fontSize: "1.1rem", lineHeight: 1 }}>⌄</span>
        </div>

        {/* Available coupons */}
        <section>
          <div className="eyebrow mb-3">Available ({available.length})</div>
          {available.length === 0 ? (
            <div className="panel p-6 text-center">
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No available coupons right now.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {available.map((c) => {
                const rec = receivedInfo(c.id);
                return (
                  <div key={c.id} className="panel p-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {c.coupon_definition?.name ?? "Coupon"}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {c.coupon_definition?.description}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs mono" style={{ color: "var(--color-faint)" }}>
                      <span>{c.coupon_number}</span>
                      {c.coupon_definition && (
                        <>
                          <span style={{ color: "var(--color-hairline-strong)" }}>·</span>
                          <span>exp {formatDate(c.coupon_definition.valid_until)}</span>
                        </>
                      )}
                    </div>
                    {rec && (
                      <div className="mt-1 text-xs" style={{ color: "var(--color-faint)" }}>
                        Received from {formatMobile(rec.mobile)} · {formatDateTime(rec.at)}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <RevealButton couponId={c.id} />
                      <TransferButton couponId={c.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Active (revealed) coupons */}
        {revealed.length > 0 && (
          <section>
            <div className="eyebrow mb-3">Active — show at counter ({revealed.length})</div>
            <div className="flex flex-col gap-2.5">
              {revealed.map((c) => (
                <RevealedCouponCard
                  key={c.id}
                  couponId={c.id}
                  name={c.coupon_definition?.name ?? "Coupon"}
                  description={c.coupon_definition?.description ?? ""}
                  couponNumber={c.coupon_number}
                  code={c.redemption_code!}
                />
              ))}
            </div>
          </section>
        )}

        {/* History: Used / Transferred tabs */}
        <section>
          <div className="eyebrow mb-3">History</div>
          <WalletTabs used={usedItems} transfers={transferItems} />
        </section>
      </main>

      {/* Footer */}
      <footer
        className="px-5 py-6 text-center text-xs"
        style={{ color: "var(--color-faint)", borderTop: "1px solid var(--color-hairline)" }}
      >
        made with <span style={{ color: "var(--color-danger)" }}>♥</span> by{" "}
        <a
          href="https://zeloagent.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-gold)" }}
        >
          zeloagent.com
        </a>
      </footer>
    </div>
  );
}
