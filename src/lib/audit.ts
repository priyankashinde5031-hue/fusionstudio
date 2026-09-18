import "server-only";
import { db } from "@/lib/supabase/admin";

export interface AuditEntry {
  adminId?: string | null;
  memberId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
}

/** Best-effort audit write; never throws into the caller's flow. */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db()
      .from("audit_log")
      .insert({
        admin_id: entry.adminId ?? null,
        member_id: entry.memberId ?? null,
        action: entry.action,
        entity_type: entry.entityType ?? null,
        entity_id: entry.entityId ?? null,
        detail: (entry.detail ?? null) as unknown,
      });
  } catch (e) {
    console.error("audit write failed", e);
  }
}
