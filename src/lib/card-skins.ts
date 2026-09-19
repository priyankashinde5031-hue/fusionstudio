import type { MembershipTheme } from "@/lib/db/types";

export interface TierSkin {
  bg: string;
  fg: string;
  sub: string;
  sheen: string;
  border: string;
}

export const SKINS: Record<MembershipTheme, TierSkin> = {
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
    // Icy blue-violet iridescent pearl, distinct from Silver's neutral steel.
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
