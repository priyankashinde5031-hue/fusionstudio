import type { MembershipTheme } from "@/lib/db/types";

export interface TierTheme {
  key: MembershipTheme;
  label: string;
  /** accent color token for chips/dots */
  accent: string;
  /** short description of the finish */
  finish: string;
}

export const TIER_THEMES: Record<MembershipTheme, TierTheme> = {
  silver: {
    key: "silver",
    label: "Silver",
    accent: "var(--color-tier-silver)",
    finish: "Cool brushed metal",
  },
  gold: {
    key: "gold",
    label: "Gold",
    accent: "var(--color-tier-gold)",
    finish: "Warm champagne foil",
  },
  platinum: {
    key: "platinum",
    label: "Platinum",
    accent: "var(--color-tier-platinum)",
    finish: "Pearl / iridescent",
  },
  black: {
    key: "black",
    label: "Black",
    accent: "var(--color-tier-black)",
    finish: "Matte black + gold",
  },
};

export const TIER_LIST = Object.values(TIER_THEMES);
