"use server";

import { revalidatePath } from "next/cache";
import { getMemberSession } from "@/lib/auth/member-session";
import { revealCoupon, hideCoupon } from "@/lib/coupons";

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
