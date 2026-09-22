"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { couponDefinitionSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export interface FormState {
  error?: string;
}

/** yyyy-mm-dd (from a date input) → IST-anchored ISO timestamp. */
function istStart(date: string): string {
  return new Date(`${date}T00:00:00+05:30`).toISOString();
}
function istEnd(date: string): string {
  return new Date(`${date}T23:59:59+05:30`).toISOString();
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    terms: formData.get("terms"),
    kind: formData.get("kind") === "membership" ? "membership" : "marketing",
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    usage_limit: formData.get("usage_limit"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  };
}

/**
 * Build the validity columns for a coupon. Marketing coupons store their fixed
 * IST window; membership coupons store no expiry (valid_until = null) and
 * expire with the holder's membership.
 */
function validityColumns(v: {
  kind: "marketing" | "membership";
  valid_from?: string;
  valid_until?: string;
}): { valid_from: string; valid_until: string | null } {
  if (v.kind === "membership") {
    return { valid_from: new Date().toISOString(), valid_until: null };
  }
  return { valid_from: istStart(v.valid_from ?? ""), valid_until: istEnd(v.valid_until ?? "") };
}

export async function createCouponDefinition(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = couponDefinitionSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const v = parsed.data;
  const { data: created, error } = await db()
    .from("coupon_definitions")
    .insert({
      name: v.name,
      description: v.description,
      terms: v.terms || null,
      kind: v.kind,
      ...validityColumns(v),
      usage_limit: v.usage_limit,
      is_active: v.is_active ?? true,
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not create coupon." };

  await audit({
    adminId: admin.adminId,
    action: "coupon_definition.create",
    entityType: "coupon_definition",
    entityId: created.id,
    detail: { name: v.name },
  });

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function updateCouponDefinition(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = couponDefinitionSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const v = parsed.data;
  const { error } = await db()
    .from("coupon_definitions")
    .update({
      name: v.name,
      description: v.description,
      terms: v.terms || null,
      kind: v.kind,
      ...validityColumns(v),
      usage_limit: v.usage_limit,
      is_active: v.is_active ?? true,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await audit({
    adminId: admin.adminId,
    action: "coupon_definition.update",
    entityType: "coupon_definition",
    entityId: id,
    detail: { name: v.name },
  });

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${id}`);
  redirect("/admin/coupons");
}

export async function toggleCouponActive(id: string, next: boolean): Promise<void> {
  const admin = await requireAdmin();
  await db().from("coupon_definitions").update({ is_active: next }).eq("id", id);
  await audit({
    adminId: admin.adminId,
    action: next ? "coupon_definition.activate" : "coupon_definition.deactivate",
    entityType: "coupon_definition",
    entityId: id,
  });
  revalidatePath("/admin/coupons");
}
