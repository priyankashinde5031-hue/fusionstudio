import { formatInTimeZone } from "date-fns-tz";

export const IST = "Asia/Kolkata";

/** Current epoch ms. Wrapped so Server Components can read "now" without
 *  tripping the react-hooks/purity lint that flags a bare Date.now() in render. */
export function nowMs(): number {
  return Date.now();
}

/** DD/MM/YYYY in IST */
export function formatDate(value: string | Date): string {
  return formatInTimeZone(new Date(value), IST, "dd/MM/yyyy");
}

/** DD/MM/YYYY, HH:mm in IST */
export function formatDateTime(value: string | Date): string {
  return formatInTimeZone(new Date(value), IST, "dd/MM/yyyy, HH:mm");
}

/** MM/YY — for the "Valid thru" line on the membership card */
export function formatValidThru(value: string | Date): string {
  return formatInTimeZone(new Date(value), IST, "MM/yy");
}

/** ₹ currency, Indian grouping. null/undefined → em dash. */
export function formatRupees(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** Normalise a raw mobile input to +91XXXXXXXXXX, or null if invalid. */
export function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  // Strip a leading 91 country code or 0 trunk prefix.
  let ten = digits;
  if (ten.length === 12 && ten.startsWith("91")) ten = ten.slice(2);
  else if (ten.length === 11 && ten.startsWith("0")) ten = ten.slice(1);
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return `+91${ten}`;
}

export function isValidMobile(raw: string): boolean {
  return normalizeMobile(raw) !== null;
}

/** Display a stored +91XXXXXXXXXX as +91 XXXXX XXXXX */
export function formatMobile(mobile: string): string {
  const m = mobile.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : mobile;
}
