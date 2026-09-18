import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession, type AdminSession } from "./session";

/**
 * Use in protected admin Server Components / Server Actions.
 * Redirects to the login page when there is no valid session.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
