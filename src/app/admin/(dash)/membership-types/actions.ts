"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { membershipTypeSchema, parseBenefitLines } from "@/lib/validation";
import { audit } from "@/lib/audit";

export interface FormState {
  error?: string;
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
