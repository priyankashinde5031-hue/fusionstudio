"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { normalizeMobile } from "@/lib/format";
import { pinSchema } from "@/lib/validation";
import { createMemberSession, clearMemberSession } from "@/lib/auth/member-session";
import { getVerificationProvider } from "@/lib/auth/verification";
import { audit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { Member } from "@/lib/db/types";

export type Step = "mobile" | "pin" | "verify" | "setpin";

export interface LoginState {
  step: Step;
  mobile?: string;
  memberName?: string | null;
  error?: string;
}

async function findActiveMember(mobile: string): Promise<Member | null> {
  const { data } = await db()
    .from("members")
    .select("*")
    .eq("mobile", mobile)
    .is("deactivated_at", null)
    .maybeSingle();
  return (data as Member) ?? null;
}

function needsVerification(m: Member): boolean {
  return !m.pin_hash || m.pin_reset_required || !m.mobile_verified_at;
}

/** Step 1 — mobile entry. Decides whether to ask for a PIN or verify first. */
export async function lookupMember(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) {
    return { step: "mobile", error: "Enter a valid +91 mobile (10 digits, starts 6–9)." };
  }

  const member = await findActiveMember(mobile);
  if (!member) {
    return {
      step: "mobile",
      mobile,
      error: "No account found for this number. Ask the salon to register you.",
    };
  }

  if (needsVerification(member)) {
    return { step: "verify", mobile, memberName: member.name };
  }
  return { step: "pin", mobile, memberName: member.name };
}

/** Step 2a — method A verification (stub auto-passes in dev). */
export async function verifyMember(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) return { step: "mobile", error: "Something went wrong. Start again." };

  const member = await findActiveMember(mobile);
  if (!member) return { step: "mobile", error: "No account found for this number." };

  const provider = getVerificationProvider();
  const started = await provider.startVerification(mobile);
  if (!started.ok) {
    return { step: "verify", mobile, memberName: member.name, error: started.error ?? "Verification failed." };
  }
  const confirmed = await provider.confirmVerification(mobile);
  if (!confirmed.ok) {
    return { step: "verify", mobile, memberName: member.name, error: confirmed.error ?? "Verification failed." };
  }

  await db()
    .from("members")
    .update({ mobile_verified_at: new Date().toISOString(), pin_reset_required: false })
    .eq("id", member.id);

  await audit({ memberId: member.id, action: "member.verify", entityType: "member", entityId: member.id });

  return { step: "setpin", mobile, memberName: member.name };
}

/** Step 2b — set a new PIN (after verification), then sign in. */
export async function setMemberPin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) return { step: "mobile", error: "Something went wrong. Start again." };

  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("pin_confirm") ?? "");
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) {
    return { step: "setpin", mobile, error: parsed.error.issues[0]?.message ?? "Invalid PIN." };
  }
  if (pin !== confirm) {
    return { step: "setpin", mobile, error: "PINs don't match." };
  }

  const member = await findActiveMember(mobile);
  if (!member) return { step: "mobile", error: "No account found for this number." };
  if (!member.mobile_verified_at) {
    return { step: "verify", mobile, memberName: member.name, error: "Please verify your number first." };
  }

  const pin_hash = await bcrypt.hash(pin, 10);
  await db()
    .from("members")
    .update({ pin_hash, pin_reset_required: false })
    .eq("id", member.id);

  await audit({ memberId: member.id, action: "member.set_pin", entityType: "member", entityId: member.id });
  await createMemberSession({ memberId: member.id, mobile: member.mobile });
  redirect("/app");
}

/** Everyday login — mobile + PIN (method C). */
export async function loginWithPin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) return { step: "mobile", error: "Something went wrong. Start again." };
  const pin = String(formData.get("pin") ?? "");

  const member = await findActiveMember(mobile);
  if (!member) return { step: "mobile", error: "No account found for this number." };

  // If they need (re)verification, route them there instead.
  if (needsVerification(member)) {
    return { step: "verify", mobile, memberName: member.name };
  }

  const ok = await bcrypt.compare(pin, member.pin_hash ?? "");
  if (!ok) {
    return { step: "pin", mobile, memberName: member.name, error: "Incorrect PIN." };
  }

  await audit({ memberId: member.id, action: "member.login", entityType: "member", entityId: member.id });
  await createMemberSession({ memberId: member.id, mobile: member.mobile });
  redirect("/app");
}

export async function logoutMember(): Promise<void> {
  await clearMemberSession();
  redirect("/app/login");
}

/** Single entry point the client form posts to; dispatches by `_intent`. */
export async function loginStep(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const intent = String(formData.get("_intent") ?? "");

  // Rate-limit the sensitive steps (mobile lookup, PIN attempts, verification).
  if (intent === "pin" || intent === "lookup" || intent === "verify") {
    const limit = rateLimit(await clientKey(`member-${intent}`), 15, 5 * 60 * 1000);
    if (!limit.ok) {
      return { ...prev, error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` };
    }
  }
  switch (intent) {
    case "lookup":
      return lookupMember(prev, formData);
    case "verify":
      return verifyMember(prev, formData);
    case "setpin":
      return setMemberPin(prev, formData);
    case "pin":
      return loginWithPin(prev, formData);
    default:
      return { step: "mobile", error: "Something went wrong. Start again." };
  }
}
