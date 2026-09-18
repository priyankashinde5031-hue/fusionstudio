import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; detail: string };

export default async function ConnectionTestPage() {
  // Diagnostic route: hidden on production, available on preview/staging and
  // local dev (where VERCEL_ENV is "preview", "development", or undefined).
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  const checks: Check[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_URL",
    ok: Boolean(url),
    detail: url ?? "missing",
  });
  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ok: Boolean(anon),
    detail: anon ? `set (${anon.length} chars)` : "missing",
  });
  checks.push({
    label: "SUPABASE_SERVICE_ROLE_KEY",
    ok: Boolean(service),
    detail: service ? `set (${service.length} chars)` : "missing",
  });

  // Attempt a live call to confirm the URL + anon key actually reach Supabase.
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getUser();
    // No signed-in user is expected and fine; we only care that the
    // request reached Supabase without a config/network error.
    const reached = !error || error.name === "AuthSessionMissingError";
    checks.push({
      label: "Supabase reachable (auth endpoint)",
      ok: reached,
      detail: reached ? "connected — no active session (expected)" : error!.message,
    });
  } catch (e) {
    checks.push({
      label: "Supabase reachable (auth endpoint)",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  // Service-role self-test: read a row count that RLS would block for anon.
  // If the SERVICE_ROLE key is wrong (e.g. anon pasted in), this returns 0/err.
  try {
    const { count, error } = await db()
      .from("admins")
      .select("*", { count: "exact", head: true });
    const ok = !error && (count ?? 0) > 0;
    checks.push({
      label: "Service-role read (admins count)",
      ok,
      detail: error
        ? `ERROR: ${error.message} — key likely wrong (anon?) or RLS-blocked`
        : `${count ?? 0} admins visible${(count ?? 0) === 0 ? " — service role NOT bypassing RLS" : " — service role OK"}`,
    });
  } catch (e) {
    checks.push({
      label: "Service-role read (admins count)",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  const allOk = checks.every((c) => c.ok);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Fusion Studio — Connection Test
      </h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Verifies the Supabase environment variables and live connectivity to the
        linked project.
      </p>

      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 8,
          marginBottom: "1.5rem",
          fontWeight: 600,
          color: allOk ? "#065f46" : "#991b1b",
          background: allOk ? "#d1fae5" : "#fee2e2",
        }}
      >
        {allOk ? "✅ All checks passed — Supabase is wired up correctly." : "❌ Some checks failed — see below."}
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {checks.map((c) => (
          <li
            key={c.label}
            style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}
          >
            <span style={{ fontSize: "1.1rem" }}>{c.ok ? "✅" : "❌"}</span>
            <span style={{ fontWeight: 600, minWidth: 260 }}>{c.label}</span>
            <span style={{ color: "#666", fontSize: "0.9rem", wordBreak: "break-all" }}>{c.detail}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
