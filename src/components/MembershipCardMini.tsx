import type { MembershipTheme } from "@/lib/db/types";
import { formatValidThru } from "@/lib/format";
import { SKINS } from "@/lib/card-skins";

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
