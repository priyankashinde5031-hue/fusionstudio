import "server-only";
import { db } from "@/lib/supabase/admin";
import { nowMs } from "@/lib/format";
import type { Member, MembershipType } from "@/lib/db/types";

/**
 * Assign the enabled, still-valid default coupons of `typeId` to `memberId`,
 * skipping any coupon definition the member already holds an instance of.
 * Returns the number of coupons granted.
 */
export async function grantDefaultCoupons(
  memberId: string,
  typeId: string,
): Promise<number> {
  const supabase = db();

  const { data: links } = await supabase
    .from("membership_type_default_coupons")
    .select("coupon_definition_id")
    .eq("membership_type_id", typeId);

  const defIds = (links ?? []).map(
    (l: { coupon_definition_id: string }) => l.coupon_definition_id,
  );
  if (defIds.length === 0) return 0;

  // Only grant coupons that are active and not expired.
  const nowIso = new Date(nowMs()).toISOString();
  const { data: validDefs } = await supabase
    .from("coupon_definitions")
    .select("id")
    .in("id", defIds)
    .eq("is_active", true)
    .gt("valid_until", nowIso);
  const validIds = new Set((validDefs ?? []).map((d: { id: string }) => d.id));
  if (validIds.size === 0) return 0;

  // Skip definitions the member already holds an instance of.
  const { data: held } = await supabase
    .from("assigned_coupons")
    .select("coupon_definition_id")
    .eq("member_id", memberId)
    .in("coupon_definition_id", Array.from(validIds));
  const heldIds = new Set(
    (held ?? []).map((h: { coupon_definition_id: string }) => h.coupon_definition_id),
  );

  const toGrant = Array.from(validIds).filter((id) => !heldIds.has(id));
  if (toGrant.length === 0) return 0;

  const { error } = await supabase.from("assigned_coupons").insert(
    toGrant.map((defId) => ({
      coupon_definition_id: defId,
      member_id: memberId,
      status: "available",
      source: "default",
    })),
  );
  if (error) return 0;
  return toGrant.length;
}

/**
 * Find a member by normalized mobile, or create one.
 * Used by admin bulk-assign and (Phase 5) coupon transfers.
 */
export async function findOrCreateMember(
  mobile: string,
  opts: { isLoyalty?: boolean; createdVia?: "admin" | "coupon_transfer" } = {},
): Promise<{ member: Member; created: boolean }> {
  const supabase = db();
  const { data: existing } = await supabase
    .from("members")
    .select("*")
    .eq("mobile", mobile)
    .maybeSingle();

  if (existing) return { member: existing as Member, created: false };

  const { data: created, error } = await supabase
    .from("members")
    .insert({
      mobile,
      is_loyalty: opts.isLoyalty ?? false,
      created_via: opts.createdVia ?? "admin",
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not create member.");
  }
  return { member: created as Member, created: true };
}

/**
 * Issue a membership card of `typeId` to `memberId`. Computes valid_until from
 * the type's validity_days and marks the member as loyalty.
 */
export async function issueCard(
  memberId: string,
  typeId: string,
): Promise<{ cardId: string; membershipNumber: string } | { error: string }> {
  const supabase = db();
  const { data: type } = await supabase
    .from("membership_types")
    .select("*")
    .eq("id", typeId)
    .maybeSingle();

  if (!type) return { error: "Membership type not found." };
  const t = type as MembershipType;

  const now = new Date();
  const validUntil = new Date(now.getTime() + t.validity_days * 24 * 60 * 60 * 1000);

  const { data: card, error } = await supabase
    .from("membership_cards")
    .insert({
      membership_type_id: typeId,
      member_id: memberId,
      valid_from: now.toISOString(),
      valid_until: validUntil.toISOString(),
      status: "active",
    })
    .select("id, membership_number")
    .single();

  if (error || !card) return { error: error?.message ?? "Could not issue card." };

  // Issuing a card makes them a loyalty member.
  await supabase.from("members").update({ is_loyalty: true }).eq("id", memberId);

  // Auto-grant this tier's default coupons.
  await grantDefaultCoupons(memberId, typeId);

  return { cardId: card.id, membershipNumber: card.membership_number as string };
}
