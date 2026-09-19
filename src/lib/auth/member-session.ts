import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "fs_member_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — customer convenience

export interface MemberSession {
  memberId: string;
  mobile: string;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing AUTH_SECRET env var.");
  return new TextEncoder().encode(s);
}

export async function createMemberSession(session: MemberSession): Promise<void> {
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

export async function getMemberSession(): Promise<MemberSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { memberId: String(payload.memberId), mobile: String(payload.mobile) };
  } catch {
    return null;
  }
}

export async function clearMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
