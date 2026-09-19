"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { normalizeMobile } from "@/lib/format";
import { pinSchema } from "@/lib/validation";
import { createMemberSession, clearMemberSession } from "@/lib/auth/member-session";
import { sendOtp, verifyOtp } from "@/lib/auth/otp-service";
import { audit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { Member } from "@/lib/db/types";

export type Step = "mobile" | "pin" | "otp" | "setpin";

export interface LoginState {
  step: Step;
  mobile?: string;
  memberName?: string | null;
  error?: string;
  info?: string;
  /** Dev-only: the OTP code, shown on screen while using the stub sender. */
  devCode?: string;
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

/** Send an OTP and return the "otp" step state (with a dev code when stubbed). */
async function startOtp(mobile: string, member: Member, info?: string): Promise<LoginState> {
  const res = await sendOtp(mobile);
  if (!res.ok) {
    return { step: "mobile", mobile, error: res.error ?? "Could not send the code." };
  }
  return { step: "otp", mobile, memberName: member.name, info, devCode: res.devCode };
}

/** Step 1 — mobile entry. Sends an OTP if verification is needed, else asks for PIN. */
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
    return startOtp(mobile, member);
  }
  return { step: "pin", mobile, memberName: member.name };
}

/** Step 2a — verify the OTP the customer received on WhatsApp. */
export async function verifyOtpStep(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) return { step: "mobile", error: "Something went wrong. Start again." };

  const member = await findActiveMember(mobile);
  if (!member) return { step: "mobile", error: "No account found for this number." };

  const result = await verifyOtp(mobile, String(formData.get("code") ?? ""));
  if (!result.ok) {
    return { step: "otp", mobile, memberName: member.name, error: result.error };
  }

  await db()
    .from("members")
    .update({ mobile_verified_at: new Date().toISOString(), pin_reset_required: false })
    .eq("id", member.id);
  await audit({ memberId: member.id, action: "member.verify", entityType: "member", entityId: member.id });

  return { step: "setpin", mobile, memberName: member.name };
}

/** Resend a fresh OTP. */
export async function resendOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
  if (!mobile) return { step: "mobile", error: "Something went wrong. Start again." };
  const member = await findActiveMember(mobile);
  if (!member) return { step: "mobile", error: "No account found for this number." };
  return startOtp(mobile, member, "A new code is on its way.");
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
    return startOtp(mobile, member, "Please verify your number first.");
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

  // If they need (re)verification, send an OTP and route them there.
  if (needsVerification(member)) {
    return startOtp(mobile, member);
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

  // Rate-limit sensitive steps. OTP sends are limited harder than PIN entry.
  if (intent === "lookup" || intent === "resend") {
    const limit = rateLimit(await clientKey(`otp-send`), 5, 10 * 60 * 1000);
    if (!limit.ok) {
      return { ...prev, error: `Too many code requests. Try again in ${limit.retryAfterSec}s.` };
    }
  }
  if (intent === "pin" || intent === "otp") {
    const limit = rateLimit(await clientKey(`member-${intent}`), 15, 5 * 60 * 1000);
    if (!limit.ok) {
      return { ...prev, error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` };
    }
  }

  switch (intent) {
    case "lookup":
      return lookupMember(prev, formData);
    case "otp":
      return verifyOtpStep(prev, formData);
    case "resend":
      return resendOtp(prev, formData);
    case "setpin":
      return setMemberPin(prev, formData);
    case "pin":
      return loginWithPin(prev, formData);
    default:
      return { step: "mobile", error: "Something went wrong. Start again." };
  }
}
