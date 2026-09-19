// Redemption code generation.
// Unambiguous charset: no 0/O, 1/I/L, and no U (avoids accidental words).
const CHARSET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 6;

export function generateCode(length: number = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

/** Normalize a staff-typed code for comparison (uppercase, strip spaces/dashes). */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
