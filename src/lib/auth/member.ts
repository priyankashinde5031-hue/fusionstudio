import "server-only";
import { redirect } from "next/navigation";
import { getMemberSession, type MemberSession } from "./member-session";

/** Use in protected customer pages. Redirects to /app/login when signed out. */
export async function requireMember(): Promise<MemberSession> {
  const session = await getMemberSession();
  if (!session) redirect("/app/login");
  return session;
}
