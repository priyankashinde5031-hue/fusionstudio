"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { adminPasswordChangeSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export interface PwState {
  error?: string;
  ok?: string;
}

export async function changeAdminPassword(
  _prev: PwState,
  formData: FormData,
): Promise<PwState> {
  const session = await requireAdmin();

  const parsed = adminPasswordChangeSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { data: admin } = await db()
    .from("admins")
    .select("password_hash")
    .eq("id", session.adminId)
    .maybeSingle();
  if (!admin) return { error: "Account not found." };

  const ok = await bcrypt.compare(parsed.data.current, admin.password_hash);
  if (!ok) return { error: "Current password is incorrect." };

  const password_hash = await bcrypt.hash(parsed.data.next, 10);
  const { error } = await db()
    .from("admins")
    .update({ password_hash })
    .eq("id", session.adminId);
  if (error) return { error: "Could not update password. Try again." };

  await audit({ adminId: session.adminId, action: "admin.change_password" });
  return { ok: "Password updated." };
}
