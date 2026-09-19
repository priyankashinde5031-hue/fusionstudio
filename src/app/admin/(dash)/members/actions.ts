"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { audit } from "@/lib/audit";
import { findOrCreateMember, issueCard } from "@/lib/members";
import { redeemByCode, previewRedeem } from "@/lib/coupons";
import { normalizeMobile } from "@/lib/format";
import {
  memberSchema,
  assignCardSchema,
  assignCouponSchema,
  bulkAssignSchema,
  splitMobiles,
} from "@/lib/validation";

export interface FormState {
  error?: string;
  ok?: string;
}

export async function createMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = memberSchema.safeParse({
    mobile: formData.get("mobile"),
    name: formData.get("name"),
    is_loyalty: formData.get("is_loyalty") === "on" || formData.get("is_loyalty") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const mobile = normalizeMobile(parsed.data.mobile);
  if (!mobile) return { error: "Enter a valid +91 mobile (10 digits, starts 6–9)." };

  const { data: existing } = await db()
    .from("members")
    .select("id")
    .eq("mobile", mobile)
    .maybeSingle();
  if (existing) return { error: "A member with this mobile already exists." };

  const { data: created, error } = await db()
    .from("members")
    .insert({
      mobile,
      name: parsed.data.name || null,
      is_loyalty: parsed.data.is_loyalty ?? true,
      created_via: "admin",
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not create member." };

  await audit({
    adminId: admin.adminId,
    action: "member.create",
    entityType: "member",
    entityId: created.id,
    detail: { mobile },
  });

  revalidatePath("/admin/members");
  redirect(`/admin/members/${created.id}`);
}

/** Edit a member's display name (e.g. name an unnamed guest). */
export async function updateMemberName(
  memberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);

  const { error } = await db()
    .from("members")
    .update({ name: name || null })
    .eq("id", memberId);
  if (error) return { error: error.message };

  await audit({
    adminId: admin.adminId,
    action: "member.rename",
    entityType: "member",
    entityId: memberId,
    detail: { name: name || null },
  });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  return { ok: "Saved." };
}

/** Force the member through mobile verification + new PIN on next login (§4). */
export async function resetMemberPin(memberId: string): Promise<void> {
  const admin = await requireAdmin();
  await db().from("members").update({ pin_reset_required: true }).eq("id", memberId);
  await audit({
    adminId: admin.adminId,
    action: "member.pin_reset",
    entityType: "member",
    entityId: memberId,
  });
  revalidatePath(`/admin/members/${memberId}`);
}

export async function upgradeMember(memberId: string): Promise<void> {
  const admin = await requireAdmin();
  await db().from("members").update({ is_loyalty: true }).eq("id", memberId);
  await audit({
    adminId: admin.adminId,
    action: "member.upgrade",
    entityType: "member",
    entityId: memberId,
  });
  revalidatePath(`/admin/members/${memberId}`);
}

export async function assignCardAction(
  memberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = assignCardSchema.safeParse({
    membership_type_id: formData.get("membership_type_id"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const result = await issueCard(memberId, parsed.data.membership_type_id);
  if ("error" in result) return { error: result.error };

  await audit({
    adminId: admin.adminId,
    action: "card.issue",
    entityType: "membership_card",
    entityId: result.cardId,
    memberId,
    detail: { membership_number: result.membershipNumber },
  });

  revalidatePath(`/admin/members/${memberId}`);
  return { ok: `Card ${result.membershipNumber} issued.` };
}

export async function assignCouponToMemberAction(
  memberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = assignCouponSchema.safeParse({
    coupon_definition_id: formData.get("coupon_definition_id"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { data: created, error } = await db()
    .from("assigned_coupons")
    .insert({
      coupon_definition_id: parsed.data.coupon_definition_id,
      member_id: memberId,
      status: "available",
    })
    .select("coupon_number")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not assign coupon." };

  await audit({
    adminId: admin.adminId,
    action: "coupon.assign",
    entityType: "assigned_coupon",
    memberId,
    detail: { coupon_number: created.coupon_number },
  });

  revalidatePath(`/admin/members/${memberId}`);
  return { ok: `Coupon ${created.coupon_number} assigned.` };
}

/** Soft-remove a wrongly-assigned coupon from a member (not for redeemed ones). */
export async function unassignCouponAction(
  memberId: string,
  assignedCouponId: string,
): Promise<void> {
  const admin = await requireAdmin();

  const { data: row } = await db()
    .from("assigned_coupons")
    .select("id, status, coupon_number")
    .eq("id", assignedCouponId)
    .eq("member_id", memberId)
    .is("unassigned_at", null)
    .maybeSingle();
  if (!row || row.status === "redeemed") return; // can't remove a used coupon

  await db()
    .from("assigned_coupons")
    .update({
      unassigned_at: new Date().toISOString(),
      unassigned_by_admin_id: admin.adminId,
      // Clear any active code so it frees the unique-code slot.
      redemption_code: null,
      revealed_at: null,
    })
    .eq("id", assignedCouponId)
    .eq("member_id", memberId);

  await audit({
    adminId: admin.adminId,
    memberId,
    action: "coupon.unassign",
    entityType: "assigned_coupon",
    entityId: assignedCouponId,
    detail: { coupon_number: row.coupon_number },
  });

  revalidatePath(`/admin/members/${memberId}`);
}

/** Look up a code without redeeming — powers the "You're redeeming X" prompt. */
export async function previewRedeemAction(
  memberId: string,
  code: string,
): Promise<{ ok: boolean; couponName?: string; usesLeft?: number; usageLimit?: number; error?: string }> {
  await requireAdmin();
  return previewRedeem(memberId, code);
}

/** Staff redeem a member's revealed coupon by the code, recording who availed it. */
export async function redeemCouponAction(
  memberId: string,
  code: string,
  usedByName: string,
  usedByMobile: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const admin = await requireAdmin();
  const result = await redeemByCode(admin.adminId, memberId, code, {
    name: usedByName,
    mobile: usedByMobile,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/admin/members/${memberId}`);
  const label = result.couponName ?? result.couponNumber;
  const message = result.closed
    ? `Redeemed ${label} — fully used now.`
    : `Redeemed ${label}. ${result.usesLeft} use${result.usesLeft === 1 ? "" : "s"} left.`;
  return { ok: true, message };
}

/** Assign a coupon to every active loyalty member (skips guests + existing holders). */
export async function assignToAllMembersAction(
  definitionId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  void _formData;
  const admin = await requireAdmin();

  const [{ data: members }, { data: holders }] = await Promise.all([
    db().from("members").select("id").eq("is_loyalty", true).is("deactivated_at", null),
    db()
      .from("assigned_coupons")
      .select("member_id")
      .eq("coupon_definition_id", definitionId)
      .is("unassigned_at", null),
  ]);

  const held = new Set((holders ?? []).map((h: { member_id: string }) => h.member_id));
  const targets = (members ?? [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) => !held.has(id));

  if (targets.length === 0) {
    return { ok: "All loyalty members already have this coupon." };
  }

  const { error } = await db()
    .from("assigned_coupons")
    .insert(
      targets.map((member_id: string) => ({
        coupon_definition_id: definitionId,
        member_id,
        status: "available",
      })),
    );
  if (error) return { error: error.message };

  await audit({
    adminId: admin.adminId,
    action: "coupon.assign_all",
    entityType: "coupon_definition",
    entityId: definitionId,
    detail: { assigned: targets.length },
  });

  revalidatePath(`/admin/coupons/${definitionId}`);
  revalidatePath("/admin/members");
  return { ok: `Assigned to ${targets.length} loyalty member${targets.length === 1 ? "" : "s"}.` };
}

/** Bulk-assign one coupon definition to a pasted list of mobiles. */
export async function bulkAssignCouponAction(
  definitionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = bulkAssignSchema.safeParse({ mobiles: formData.get("mobiles") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const raw = splitMobiles(parsed.data.mobiles);
  if (raw.length === 0) return { error: "Enter at least one mobile number." };

  let assigned = 0;
  let createdMembers = 0;
  const invalid: string[] = [];

  for (const entry of raw) {
    const mobile = normalizeMobile(entry);
    if (!mobile) {
      invalid.push(entry);
      continue;
    }
    const { member, created } = await findOrCreateMember(mobile, {
      isLoyalty: false,
      createdVia: "admin",
    });
    if (created) createdMembers += 1;

    const { error } = await db().from("assigned_coupons").insert({
      coupon_definition_id: definitionId,
      member_id: member.id,
      status: "available",
    });
    if (!error) assigned += 1;
  }

  await audit({
    adminId: admin.adminId,
    action: "coupon.bulk_assign",
    entityType: "coupon_definition",
    entityId: definitionId,
    detail: { assigned, createdMembers, invalid: invalid.length },
  });

  revalidatePath(`/admin/coupons/${definitionId}`);
  revalidatePath("/admin/members");

  const parts = [`${assigned} assigned`];
  if (createdMembers) parts.push(`${createdMembers} new member${createdMembers > 1 ? "s" : ""}`);
  if (invalid.length) parts.push(`${invalid.length} invalid skipped`);
  return { ok: parts.join(" · ") };
}
