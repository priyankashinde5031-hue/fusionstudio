"use client";

import { useState } from "react";
import { formatDate, formatDateTime, formatMobile } from "@/lib/format";

export interface UsedItem {
  id: string;
  name: string;
  description: string;
  couponNumber: string;
  status: "redeemed" | "expired";
  redeemedAt: string | null;
  expUntil: string;
  receivedFromMobile?: string;
  receivedAt?: string;
}

export interface TransferItem {
  id: string;
  name: string;
  toMobile: string;
  at: string;
}

export function WalletTabs({
  used,
  transfers,
}: {
  used: UsedItem[];
  transfers: TransferItem[];
}) {
  const [tab, setTab] = useState<"used" | "transfer">("used");

  return (
    <div>
      {/* Toggle */}
      <div
        className="flex p-1 rounded-xl mb-3"
        style={{ background: "var(--color-ink-2)", border: "1px solid var(--color-hairline)" }}
      >
        {(["used", "transfer"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={
                active
                  ? { background: "var(--color-gold-soft)", color: "var(--color-gold-bright)" }
                  : { color: "var(--color-muted)" }
              }
            >
              {t === "used" ? `Used (${used.length})` : `Transferred (${transfers.length})`}
            </button>
          );
        })}
      </div>

      {tab === "used" ? (
        used.length === 0 ? (
          <div className="panel p-6 text-center">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              No used or expired coupons yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {used.map((c) => (
              <div key={c.id} className="panel p-4" style={{ opacity: 0.7 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {c.description}
                    </div>
                  </div>
                  <span className="chip chip-muted">{c.status === "redeemed" ? "Used" : "Expired"}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs mono" style={{ color: "var(--color-faint)" }}>
                  <span>{c.couponNumber}</span>
                  <span style={{ color: "var(--color-hairline-strong)" }}>·</span>
                  <span>exp {formatDate(c.expUntil)}</span>
                </div>
                {c.status === "redeemed" && c.redeemedAt && (
                  <div className="mt-1 text-xs" style={{ color: "var(--color-faint)" }}>
                    Used {formatDateTime(c.redeemedAt)}
                  </div>
                )}
                {c.receivedFromMobile && c.receivedAt && (
                  <div className="mt-1 text-xs" style={{ color: "var(--color-faint)" }}>
                    Received from {formatMobile(c.receivedFromMobile)} · {formatDateTime(c.receivedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : transfers.length === 0 ? (
        <div className="panel p-6 text-center">
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            You haven&apos;t transferred any coupons.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {transfers.map((t) => (
            <div key={t.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.name}</div>
                  <div className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
                    Transferred to {formatMobile(t.toMobile)}
                  </div>
                </div>
                <span className="chip">Sent</span>
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--color-faint)" }}>
                {formatDateTime(t.at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
