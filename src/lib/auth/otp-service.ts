import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/supabase/admin";
import { nowMs } from "@/lib/format";
import { getOtpSender, isStubOtp } from "./otp";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export interface SendOtpResult {
  ok: boolean;
  error?: string;
  /** Only returned in dev with the stub, so the flow is testable on screen. */
  devCode?: string;
}

/** Generate, store (hashed) and send a fresh OTP for a mobile. */
export async function sendOtp(mobile: string): Promise<SendOtpResult> {
  const supabase = db();
  const code = generateOtp();
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(nowMs() + OTP_TTL_MS).toISOString();

  // Invalidate any prior unconsumed challenges for this mobile.
  await supabase
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("mobile", mobile)
    .is("consumed_at", null);

  const { error } = await supabase
    .from("otp_challenges")
    .insert({ mobile, code_hash, expires_at });
  if (error) return { ok: false, error: "Could not start verification. Try again." };

  const sent = await getOtpSender().send(mobile, code);
  if (!sent.ok) return { ok: false, error: sent.error ?? "Could not send the code." };

  return { ok: true, devCode: isStubOtp() && process.env.NODE_ENV !== "production" ? code : undefined };
}

export interface VerifyOtpResult {
  ok: boolean;
  error?: string;
}

/** Verify a submitted OTP against the latest active challenge for a mobile. */
export async function verifyOtp(mobile: string, rawCode: string): Promise<VerifyOtpResult> {
  const supabase = db();
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code." };

  const { data: challenge } = await supabase
    .from("otp_challenges")
    .select("*")
    .eq("mobile", mobile)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) return { ok: false, error: "No active code. Tap resend." };
  if (new Date(challenge.expires_at).getTime() < nowMs()) {
    return { ok: false, error: "Code expired. Tap resend." };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Tap resend for a new code." };
  }

  const match = await bcrypt.compare(code, challenge.code_hash);
  if (!match) {
    await supabase
      .from("otp_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    return { ok: false, error: "Incorrect code. Try again." };
  }

  await supabase
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id);
  return { ok: true };
}
