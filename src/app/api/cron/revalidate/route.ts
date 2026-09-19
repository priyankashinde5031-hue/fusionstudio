import { NextResponse } from "next/server";
import { revalidateCoupons } from "@/lib/coupons";

export const dynamic = "force-dynamic";

/**
 * Scheduled coupon revalidation (§7). Flips lapsed reveals back to available
 * and past-expiry coupons to expired, even if no one opens the app.
 *
 * Protected by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <secret>`
 * automatically when CRON_SECRET is set in the project env.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const changed = await revalidateCoupons();
  return NextResponse.json({ ok: true, changed, at: new Date().toISOString() });
}
