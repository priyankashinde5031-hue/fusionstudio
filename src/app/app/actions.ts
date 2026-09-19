"use server";

import { revalidatePath } from "next/cache";
import { getMemberSession } from "@/lib/auth/member-session";
import { revealCoupon, hideCoupon, transferCoupon } from "@/lib/coupons";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export interface RevealState {
  error?: string;
}

export async function revealCouponAction(
  assignedCouponId: string,
  _prev: RevealState,
  formData: FormData,
): Promise<RevealState> {
  void formData; // required by the useActionState signature; unused here
  const session = await getMemberSession();
  if (!session) return { error: "Please sign in again." };

  const limit = rateLimit(await clientKey(`reveal:${session.memberId}`), 20, 60 * 1000);
  if (!limit.ok) return { error: `Slow down — try again in ${limit.retryAfterSec}s.` };

  const result = await revealCoupon(session.memberId, assignedCouponId);
  if (!result.ok) return { error: result.error ?? "Could not reveal." };

  revalidatePath("/app");
  return {};
}

export async function hideCouponAction(
  assignedCouponId: string,
  _prev: RevealState,
  formData: FormData,
): Promise<RevealState> {
  void formData; // required by the useActionState signature; unused here
  const session = await getMemberSession();
  if (!session) return { error: "Please sign in again." };

  const result = await hideCoupon(session.memberId, assignedCouponId);
  if (!result.ok) return { error: result.error ?? "Could not hide the code." };

  revalidatePath("/app");
  return {};
}

export interface TransferState {
  error?: string;
  ok?: string;
}

export async function transferCouponAction(
  assignedCouponId: string,
  _prev: TransferState,
  formData: FormData,
): Promise<TransferState> {
  const session = await getMemberSession();
  if (!session) return { error: "Please sign in again." };

  const mobile = String(formData.get("mobile") ?? "");
  const result = await transferCoupon(session.memberId, assignedCouponId, mobile);
  if (!result.ok) return { error: result.error ?? "Could not transfer." };

  revalidatePath("/app");
  return { ok: `Sent to ${result.toMobile}${result.createdGuest ? " (new guest)" : ""}.` };
}
