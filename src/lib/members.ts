import "server-only";
import { db } from "@/lib/supabase/admin";
import type { Member, MembershipType } from "@/lib/db/types";

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

  return { cardId: card.id, membershipNumber: card.membership_number as string };
}
