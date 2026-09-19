import "server-only";
import { db } from "@/lib/supabase/admin";
import { nowMs } from "@/lib/format";
import { generateCode, normalizeCode } from "@/lib/coupon-code";
import { audit } from "@/lib/audit";
import type { AssignedCoupon, CouponDefinition } from "@/lib/db/types";

type RowWithDef = AssignedCoupon & {
  coupon_definition: Pick<CouponDefinition, "valid_from" | "valid_until"> | null;
};

/**
 * Recompute coupon states (§7). Flips coupons whose definition has passed its
 * expiry to `expired`. (There is no 24-hour reveal window — a revealed coupon
 * keeps its code until redeemed.) Runs lazily on read.
 * Returns the number of coupons changed.
 */
export async function revalidateCoupons(opts: { memberId?: string } = {}): Promise<number> {
  const supabase = db();
  let query = supabase
    .from("assigned_coupons")
    .select("id, status, coupon_definition:coupon_definitions(valid_until)")
    .in("status", ["available", "revealed"]);
  if (opts.memberId) query = query.eq("member_id", opts.memberId);

  const { data } = await query;
  const rows = (data ?? []) as unknown as RowWithDef[];
  const now = nowMs();

  let changed = 0;
  for (const r of rows) {
    const defExpired =
      r.coupon_definition?.valid_until != null &&
      new Date(r.coupon_definition.valid_until).getTime() < now;

    if (defExpired) {
      await supabase
        .from("assigned_coupons")
        .update({ status: "expired", redemption_code: null, revealed_at: null })
        .eq("id", r.id);
      changed += 1;
    }
  }
  return changed;
}

async function generateUniqueRevealCode(): Promise<string> {
  const supabase = db();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    const { data } = await supabase
      .from("assigned_coupons")
      .select("id")
      .eq("status", "revealed")
      .eq("redemption_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return generateCode(8);
}

export interface RevealResult {
  ok: boolean;
  code?: string;
  error?: string;
}

/** Member reveals an available coupon → a code that stays valid until redeemed. */
export async function revealCoupon(
  memberId: string,
  assignedCouponId: string,
): Promise<RevealResult> {
  const supabase = db();

  // Only verified members may reveal (§4).
  const { data: member } = await supabase
    .from("members")
    .select("mobile_verified_at, deactivated_at")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || member.deactivated_at) return { ok: false, error: "Account unavailable." };
  if (!member.mobile_verified_at) return { ok: false, error: "Verify your number first." };

  // Fix any stale (expired) state on this member's coupons first.
  await revalidateCoupons({ memberId });

  const { data: row } = await supabase
    .from("assigned_coupons")
    .select("*, coupon_definition:coupon_definitions(*)")
    .eq("id", assignedCouponId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Coupon not found." };
  const coupon = row as unknown as AssignedCoupon & { coupon_definition: CouponDefinition | null };
  const def = coupon.coupon_definition;

  if (coupon.status === "redeemed") return { ok: false, error: "This coupon is already used." };
  if (coupon.status === "revealed") {
    // Already revealed — just return the existing code.
    return { ok: true, code: coupon.redemption_code ?? undefined };
  }
  if (coupon.status !== "available") return { ok: false, error: "This coupon can't be revealed." };

  const now = nowMs();
  if (!def || !def.is_active) return { ok: false, error: "This coupon is not active." };
  if (new Date(def.valid_from).getTime() > now)
    return { ok: false, error: "This coupon isn't valid yet." };
  if (new Date(def.valid_until).getTime() < now)
    return { ok: false, error: "This coupon has expired." };

  const code = await generateUniqueRevealCode();

  const { error } = await supabase
    .from("assigned_coupons")
    .update({
      status: "revealed",
      redemption_code: code,
      revealed_at: new Date(now).toISOString(),
    })
    .eq("id", assignedCouponId)
    .eq("member_id", memberId)
    .eq("status", "available"); // guard against races

  if (error) return { ok: false, error: "Could not reveal. Try again." };

  await audit({
    memberId,
    action: "coupon.reveal",
    entityType: "assigned_coupon",
    entityId: assignedCouponId,
    detail: { coupon_number: coupon.coupon_number },
  });

  return { ok: true, code };
}

/** Member hides a revealed code → coupon returns to available (transferable again). */
export async function hideCoupon(
  memberId: string,
  assignedCouponId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = db();
  const { data: row } = await supabase
    .from("assigned_coupons")
    .select("id, status")
    .eq("id", assignedCouponId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Coupon not found." };
  if (row.status === "redeemed") return { ok: false, error: "This coupon is already used." };
  if (row.status !== "revealed") return { ok: true }; // already not revealed — nothing to do

  const { error } = await supabase
    .from("assigned_coupons")
    .update({ status: "available", redemption_code: null, revealed_at: null })
    .eq("id", assignedCouponId)
    .eq("member_id", memberId)
    .eq("status", "revealed");

  if (error) return { ok: false, error: "Could not hide the code. Try again." };

  await audit({
    memberId,
    action: "coupon.hide",
    entityType: "assigned_coupon",
    entityId: assignedCouponId,
  });
  return { ok: true };
}

export interface RedeemResult {
  ok: boolean;
  couponNumber?: string;
  couponName?: string;
  error?: string;
}

/** Staff redeem a member's revealed coupon by the code the customer shows. */
export async function redeemByCode(
  adminId: string,
  memberId: string,
  rawCode: string,
): Promise<RedeemResult> {
  const supabase = db();
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter the code the customer is showing." };

  // Fix any expired coupons first so an expired coupon's code can't be matched.
  await revalidateCoupons({ memberId });

  const { data: row } = await supabase
    .from("assigned_coupons")
    .select("*, coupon_definition:coupon_definitions(*)")
    .eq("member_id", memberId)
    .eq("redemption_code", code)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Invalid code. Ask the customer to reveal the coupon in their app." };
  }

  const coupon = row as unknown as AssignedCoupon & { coupon_definition: CouponDefinition | null };

  if (coupon.status === "redeemed") return { ok: false, error: "This code was already redeemed." };
  if (coupon.status !== "revealed") return { ok: false, error: "This code is no longer active." };

  const now = nowMs();
  if (coupon.coupon_definition && new Date(coupon.coupon_definition.valid_until).getTime() < now)
    return { ok: false, error: "This coupon has expired." };

  const { error } = await supabase
    .from("assigned_coupons")
    .update({
      status: "redeemed",
      redeemed_at: new Date(now).toISOString(),
      redeemed_by_admin_id: adminId,
    })
    .eq("id", coupon.id)
    .eq("status", "revealed"); // guard against double-redeem races

  if (error) return { ok: false, error: "Could not redeem. Try again." };

  await audit({
    adminId,
    memberId,
    action: "coupon.redeem",
    entityType: "assigned_coupon",
    entityId: coupon.id,
    detail: { coupon_number: coupon.coupon_number, code },
  });

  return {
    ok: true,
    couponNumber: coupon.coupon_number,
    couponName: coupon.coupon_definition?.name,
  };
}
