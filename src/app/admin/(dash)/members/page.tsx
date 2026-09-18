import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/supabase/admin";
import { formatMobile } from "@/lib/format";
import type { Member } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: PageProps<"/admin/members">) {
  await requireAdmin();
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  // Sanitize for use inside a PostgREST .or() filter.
  const q = qRaw.replace(/[%,()]/g, "").trim();

  let query = db()
    .from("members")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) query = query.or(`mobile.ilike.%${q}%,name.ilike.%${q}%`);

  const { data } = await query;
  const list = (data ?? []) as Member[];

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow mb-2">Members</div>
          <h1 className="display text-4xl">Members</h1>
        </div>
        <Link href="/admin/members/new" className="btn btn-gold">
          + New member
        </Link>
      </div>

      <form method="get" className="mb-6 flex gap-2 max-w-lg">
        <input
          name="q"
          defaultValue={qRaw}
          className="input"
          placeholder="Search by mobile or name…"
          inputMode="search"
        />
        <button type="submit" className="btn btn-ghost">
          Search
        </button>
        {q && (
          <Link href="/admin/members" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="text-3xl mb-3" style={{ color: "var(--color-gold)" }}>
            ◐
          </div>
          <p className="font-semibold mb-1">{q ? "No matches" : "No members yet"}</p>
          <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
            {q ? "Try a different mobile or name." : "Create a member or assign a card to get started."}
          </p>
          {!q && (
            <Link href="/admin/members/new" className="btn btn-gold">
              + New member
            </Link>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {list.map((m, i) => (
            <Link
              key={m.id}
              href={`/admin/members/${m.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: m.is_loyalty ? "var(--color-gold-soft)" : "var(--color-surface-2)",
                  color: m.is_loyalty ? "var(--color-gold-bright)" : "var(--color-muted)",
                }}
              >
                {(m.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{m.name ?? "Unnamed"}</div>
                <div className="mono text-sm truncate" style={{ color: "var(--color-muted)" }}>
                  {formatMobile(m.mobile)}
                </div>
              </div>
              <span className={m.is_loyalty ? "chip chip-gold" : "chip chip-muted"}>
                {m.is_loyalty ? "Loyalty" : "Guest"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
