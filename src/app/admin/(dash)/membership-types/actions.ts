"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { membershipTypeSchema, parseBenefitLines } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { grantDefaultCoupons } from "@/lib/members";
import { nowMs } from "@/lib/format";

export interface FormState {
  error?: string;
  ok?: string;
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price") === "" ? "" : formData.get("price"),
    validity_days: formData.get("validity_days"),
    theme: formData.get("theme"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
    benefits: formData.get("benefits") ?? "",
  };
}

async function replaceBenefits(typeId: string, block: string) {
  const lines = parseBenefitLines(block);
  await db().from("benefits").delete().eq("membership_type_id", typeId);
  if (lines.length > 0) {
    await db()
      .from("benefits")
      .insert(
        lines.map((text, i) => ({
          membership_type_id: typeId,
          text,
          sort_order: i,
        })),
      );
  }
}

export async function createMembershipType(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = membershipTypeSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const v = parsed.data;
  const { data: created, error } = await db()
    .from("membership_types")
    .insert({
      name: v.name,
      description: v.description || null,
      price: v.price === "" || v.price === undefined ? null : Number(v.price),
      validity_days: v.validity_days,
      theme: v.theme,
      is_active: v.is_active ?? true,
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not create type." };

  await replaceBenefits(created.id, v.benefits ?? "");
  await audit({
    adminId: admin.adminId,
    action: "membership_type.create",
    entityType: "membership_type",
    entityId: created.id,
    detail: { name: v.name },
  });

  revalidatePath("/admin/membership-types");
  redirect("/admin/membership-types");
}

export async function updateMembershipType(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = membershipTypeSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const v = parsed.data;
  const { error } = await db()
    .from("membership_types")
    .update({
      name: v.name,
      description: v.description || null,
      price: v.price === "" || v.price === undefined ? null : Number(v.price),
      validity_days: v.validity_days,
      theme: v.theme,
      is_active: v.is_active ?? true,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await replaceBenefits(id, v.benefits ?? "");
  await audit({
    adminId: admin.adminId,
    action: "membership_type.update",
    entityType: "membership_type",
    entityId: id,
    detail: { name: v.name },
  });

  revalidatePath("/admin/membership-types");
  revalidatePath(`/admin/membership-types/${id}`);
  redirect("/admin/membership-types");
}

/**
 * Replace the set of default coupons for a membership type (checkbox list),
 * then backfill the enabled defaults to existing active cardholders of this type.
 */
export async function updateDefaultCoupons(
  typeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const selected = formData
    .getAll("coupon_ids")
    .map((v) => String(v))
    .filter(Boolean);

  // Replace-all the links.
  await db().from("membership_type_default_coupons").delete().eq("membership_type_id", typeId);
  if (selected.length > 0) {
    const { error } = await db()
      .from("membership_type_default_coupons")
      .insert(
        selected.map((coupon_definition_id) => ({
          membership_type_id: typeId,
          coupon_definition_id,
        })),
      );
    if (error) return { error: error.message };
  }

  // Backfill to members holding an active card of this type.
  const nowIso = new Date(nowMs()).toISOString();
  const { data: cards } = await db()
    .from("membership_cards")
    .select("member_id")
    .eq("membership_type_id", typeId)
    .eq("status", "active")
    .gt("valid_until", nowIso);

  const memberIds = Array.from(
    new Set((cards ?? []).map((c: { member_id: string }) => c.member_id)),
  );
  let granted = 0;
  for (const memberId of memberIds) {
    granted += await grantDefaultCoupons(memberId, typeId);
  }

  await audit({
    adminId: admin.adminId,
    action: "membership_type.set_default_coupons",
    entityType: "membership_type",
    entityId: typeId,
    detail: { count: selected.length, backfilled: granted },
  });

  revalidatePath(`/admin/membership-types/${typeId}`);
  const msg =
    `${selected.length} default coupon${selected.length === 1 ? "" : "s"} saved` +
    (granted ? ` · ${granted} granted to existing members` : "");
  return { ok: msg };
}

/** Toggle active/inactive (soft — never deletes). */
export async function toggleMembershipTypeActive(id: string, next: boolean): Promise<void> {
  const admin = await requireAdmin();
  await db().from("membership_types").update({ is_active: next }).eq("id", id);
  await audit({
    adminId: admin.adminId,
    action: next ? "membership_type.activate" : "membership_type.deactivate",
    entityType: "membership_type",
    entityId: id,
  });
  revalidatePath("/admin/membership-types");
}
