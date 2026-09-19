"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { adminLoginSchema } from "@/lib/validation";
import { createAdminSession, clearAdminSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const limit = rateLimit(await clientKey("admin-login"), 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` };
  }

  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password } = parsed.data;

  const { data: admin } = await db()
    .from("admins")
    .select("*")
    .eq("email", email)
    .is("deactivated_at", null)
    .maybeSingle();

  // Constant-ish path: always run a compare to reduce timing signal.
  const hash = admin?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const ok = await bcrypt.compare(password, hash);

  if (!admin || !ok) {
    return { error: "Invalid email or password." };
  }

  await createAdminSession({
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
  });
  await audit({ adminId: admin.id, action: "admin.login" });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}
