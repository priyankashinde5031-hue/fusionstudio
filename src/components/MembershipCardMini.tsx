import type { MembershipTheme } from "@/lib/db/types";
import { formatValidThru } from "@/lib/format";

interface TierSkin {
  bg: string;
  fg: string;
  sub: string;
  sheen: string;
  border: string;
}

const SKINS: Record<MembershipTheme, TierSkin> = {
  silver: {
    bg: "linear-gradient(135deg, #e9edf0 0%, #c3c9cf 45%, #f2f4f6 55%, #b8bfc6 100%)",
    fg: "#22262b",
    sub: "rgba(34,38,43,0.62)",
    sheen: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)",
    border: "rgba(255,255,255,0.5)",
  },
  gold: {
    bg: "linear-gradient(135deg, #f4dca8 0%, #d9b36c 40%, #f6e3b0 55%, #b98f45 100%)",
    fg: "#3a2c10",
    sub: "rgba(58,44,16,0.66)",
    sheen: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
    border: "rgba(255,255,255,0.45)",
  },
  platinum: {
    // Icy blue-violet iridescent pearl: pale-blue → lilac → mint, distinct from
    // Silver's neutral steel.
    bg: "linear-gradient(135deg, #e7ecf6 0%, #c4cfe8 26%, #e9dcf3 46%, #d3ecec 64%, #bfcbe6 100%)",
    fg: "#2b3040",
    sub: "rgba(43,48,64,0.62)",
    sheen: "linear-gradient(105deg, transparent 38%, rgba(214,224,255,0.65) 50%, transparent 62%)",
    border: "rgba(255,255,255,0.6)",
  },
  black: {
    bg: "linear-gradient(135deg, #16161a 0%, #0b0b0d 55%, #1c1c22 100%)",
    fg: "#f0e6cf",
    sub: "rgba(217,179,108,0.7)",
    sheen: "linear-gradient(105deg, transparent 42%, rgba(217,179,108,0.14) 50%, transparent 58%)",
    border: "rgba(217,179,108,0.35)",
  },
};

export function MembershipCardMini({
  theme,
  tierName,
  memberName,
  membershipNumber,
  validUntil,
}: {
  theme: MembershipTheme;
  tierName: string;
  memberName: string | null;
  membershipNumber: string;
  validUntil: string;
}) {
  const skin = SKINS[theme];
  const grouped = membershipNumber.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div
      className="relative overflow-hidden w-full"
      style={{
        aspectRatio: "1.586",
        maxWidth: 400,
        borderRadius: "var(--radius-card)",
        background: skin.bg,
        color: skin.fg,
        border: `1px solid ${skin.border}`,
        boxShadow: "var(--shadow-lift)",
      }}
    >
      {/* Guilloché-ish texture */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 30% 20%, transparent 0 6px, rgba(0,0,0,0.04) 6px 7px)",
        }}
      />
      {/* Diagonal sheen */}
      <div className="absolute inset-0" style={{ background: skin.sheen }} />

      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="wordmark text-lg leading-none">
              Fusion<span style={{ opacity: 0.85 }}>Studio</span>
            </div>
            <div
              className="mt-0.5 text-[0.6rem] font-semibold tracking-[0.2em] uppercase"
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
          <div className="mono text-[1.05rem] tracking-[0.12em]" style={{ letterSpacing: "0.12em" }}>
            {grouped}
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.15em]" style={{ color: skin.sub }}>
                Member
              </div>
              <div className="text-sm font-semibold truncate max-w-[190px]">
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
    </div>
  );
}
