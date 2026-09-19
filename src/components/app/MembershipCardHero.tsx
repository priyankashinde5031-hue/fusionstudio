"use client";

import type React from "react";
import { useRef, useState } from "react";
import type { MembershipTheme } from "@/lib/db/types";
import { formatValidThru } from "@/lib/format";
import { SKINS } from "@/lib/card-skins";

const MAX_TILT = 8; // degrees

export function MembershipCardHero({
  theme,
  tierName,
  memberName,
  membershipNumber,
  validUntil,
  benefits,
}: {
  theme: MembershipTheme;
  tierName: string;
  memberName: string | null;
  membershipNumber: string;
  validUntil: string;
  benefits: string[];
}) {
  const skin = SKINS[theme];
  const grouped = membershipNumber.replace(/(.{4})/g, "$1 ").trim();
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function onMove(e: React.PointerEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * MAX_TILT * 2, y: px * MAX_TILT * 2 });
  }
  function reset() {
    setTilt({ x: 0, y: 0 });
  }

  const faceBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "var(--radius-card)",
    background: skin.bg,
    color: skin.fg,
    border: `1px solid ${skin.border}`,
    boxShadow: "var(--shadow-lift)",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    overflow: "hidden",
    padding: 20,
  };

  return (
    <div style={{ perspective: 1200, width: "100%", maxWidth: 420, margin: "0 auto" }}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show card front" : "Show benefits"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1.586",
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (flipped ? 180 : 0)}deg)`,
          transition: reduced ? "none" : "transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1)",
          cursor: "pointer",
        }}
      >
        {/* FRONT */}
        <div style={faceBase}>
          <div className="absolute inset-0" style={{ background: skin.sheen }} />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 30% 20%, transparent 0 6px, rgba(0,0,0,0.04) 6px 7px)",
            }}
          />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="wordmark text-xl leading-none">
                  Fusion<span style={{ opacity: 0.85 }}>Studio</span>
                </div>
                <div
                  className="mt-1 text-[0.62rem] font-semibold tracking-[0.22em] uppercase"
                  style={{ color: skin.sub }}
                >
                  {tierName}
                </div>
              </div>
              <span
                className="text-[0.6rem] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-full"
                style={{ border: `1px solid ${skin.sub}`, color: skin.fg }}
              >
                Member
              </span>
            </div>
            <div>
              <div className="mono text-[1.25rem]" style={{ letterSpacing: "0.14em" }}>
                {grouped}
              </div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="text-[0.55rem] uppercase tracking-[0.15em]" style={{ color: skin.sub }}>
                    Member
                  </div>
                  <div className="text-sm font-semibold truncate max-w-[200px]">
                    {memberName ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.55rem] uppercase tracking-[0.15em]" style={{ color: skin.sub }}>
                    Valid thru
                  </div>
                  <div className="mono text-sm font-semibold">{formatValidThru(validUntil)}</div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="absolute bottom-2 left-0 right-0 text-center text-[0.55rem] tracking-[0.15em] uppercase"
            style={{ color: skin.sub }}
          >
            Tap for benefits
          </div>
        </div>

        {/* BACK */}
        <div style={{ ...faceBase, transform: "rotateY(180deg)" }}>
          <div className="absolute inset-0" style={{ background: skin.sheen }} />
          <div className="relative h-full flex flex-col">
            <div
              className="text-[0.62rem] font-semibold tracking-[0.22em] uppercase mb-2"
              style={{ color: skin.sub }}
            >
              {tierName} benefits
            </div>
            <ul className="flex-1 flex flex-col gap-1.5 overflow-hidden">
              {benefits.length === 0 && (
                <li className="text-sm" style={{ color: skin.sub }}>
                  Benefits will appear here.
                </li>
              )}
              {benefits.slice(0, 6).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[0.82rem] leading-tight">
                  <span style={{ opacity: 0.7 }}>✦</span>
                  <span className="truncate">{b}</span>
                </li>
              ))}
            </ul>
            <div
              className="text-center text-[0.55rem] tracking-[0.15em] uppercase"
              style={{ color: skin.sub }}
            >
              Tap to flip back
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
