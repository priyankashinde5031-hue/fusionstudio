import "server-only";
import { db } from "@/lib/supabase/admin";
import { nowMs } from "@/lib/format";
import { generateCode, normalizeCode } from "@/lib/coupon-code";
import { audit } from "@/lib/audit";
import type { AssignedCoupon, CouponDefinition } from "@/lib/db/types";

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

type RowWithDef = AssignedCoupon & {
  coupon_definition: Pick<CouponDefinition, "valid_from" | "valid_until"> | null;
};

/**
 * Recompute coupon states (§7). Flips lapsed reveals back to `available`
 * (clearing the code) and past-expiry coupons to `expired`. Runs from the
 * cron job (all coupons) and lazily on read (scoped to one member).
 * Returns the number of coupons changed.
 */
export async function revalidateCoupons(opts: { memberId?: string } = {}): Promise<number> {
  const supabase = db();
  let query = supabase
    .from("assigned_coupons")
    .select("id, status, code_expires_at, coupon_definition:coupon_definitions(valid_until)")
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
        .update({ status: "expired", redemption_code: null, revealed_at: null, code_expires_at: null })
        .eq("id", r.id);
      changed += 1;
      continue;
    }

    if (
      r.status === "revealed" &&
      r.code_expires_at != null &&
      new Date(r.code_expires_at).getTime() < now
    ) {
      // Reveal window lapsed with no redemption → back to available.
      await supabase
        .from("assigned_coupons")
        .update({ status: "available", redemption_code: null, revealed_at: null, code_expires_at: null })
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
  // Extremely unlikely; fall back to a longer code.
  return generateCode(8);
}

export interface RevealResult {
  ok: boolean;
  code?: string;
  expiresAt?: string;
  error?: string;
}

/** Member reveals an available coupon → fresh code + 24h window (§7). */
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

  // Fix any stale state on this member's coupons first.
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
    // Already revealed and still valid — just return the existing code.
    return { ok: true, code: coupon.redemption_code ?? undefined, expiresAt: coupon.code_expires_at ?? undefined };
  }
  if (coupon.status !== "available") return { ok: false, error: "This coupon can't be revealed." };

  const now = nowMs();
  if (!def || !def.is_active) return { ok: false, error: "This coupon is not active." };
  if (new Date(def.valid_from).getTime() > now)
    return { ok: false, error: "This coupon isn't valid yet." };
  if (new Date(def.valid_until).getTime() < now)
    return { ok: false, error: "This coupon has expired." };

  const code = await generateUniqueRevealCode();
  const expiresAt = new Date(now + WINDOW_MS).toISOString();

  const { error } = await supabase
    .from("assigned_coupons")
    .update({
      status: "revealed",
      redemption_code: code,
      revealed_at: new Date(now).toISOString(),
      code_expires_at: expiresAt,
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

  return { ok: true, code, expiresAt };
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

  // Clear any lapsed reveals so an expired code can't be matched.
  await revalidateCoupons({ memberId });

  const { data: row } = await supabase
    .from("assigned_coupons")
    .select("*, coupon_definition:coupon_definitions(*)")
    .eq("member_id", memberId)
    .eq("redemption_code", code)
    .maybeSingle();

  if (!row) {
    // Distinguish an already-used code for a clearer message.
    const { data: used } = await supabase
      .from("assigned_coupons")
      .select("id")
      .eq("member_id", memberId)
      .eq("status", "redeemed")
      .limit(1);
    void used;
    return { ok: false, error: "Invalid or expired code. Ask the customer to reveal again." };
  }

  const coupon = row as unknown as AssignedCoupon & { coupon_definition: CouponDefinition | null };

  if (coupon.status === "redeemed") return { ok: false, error: "This code was already redeemed." };
  if (coupon.status !== "revealed") return { ok: false, error: "This code is no longer active." };

  const now = nowMs();
  if (coupon.code_expires_at && new Date(coupon.code_expires_at).getTime() < now)
    return { ok: false, error: "The 24-hour window has passed. Ask the customer to reveal again." };
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
