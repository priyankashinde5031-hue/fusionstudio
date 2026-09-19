import "server-only";
import { headers } from "next/headers";

/**
 * Basic in-memory sliding-window rate limiter.
 *
 * NOTE: memory is per-serverless-instance, so this is best-effort — good enough
 * to blunt bursts/abuse. For strict limits across instances, back this with a
 * shared store (e.g. Upstash Redis) later.
 */
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (arr.length >= limit) {
    const retryAfterSec = Math.ceil((arr[0] + windowMs - now) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
  }

  arr.push(now);
  hits.set(key, arr);
  // Opportunistic cleanup to bound memory.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => t <= cutoff)) hits.delete(k);
    }
  }
  return { ok: true };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
