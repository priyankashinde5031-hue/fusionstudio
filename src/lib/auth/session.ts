import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "fs_admin_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export interface AdminSession {
  adminId: string;
  email: string;
  name: string | null;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing AUTH_SECRET env var.");
  return new TextEncoder().encode(s);
}

export async function createAdminSession(session: AdminSession): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
