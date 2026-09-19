import { z } from "zod";

export const themeEnum = z.enum(["silver", "gold", "platinum", "black"]);

export const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, "PIN must be 4–6 digits.");

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const membershipTypeSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  // Empty string must be checked BEFORE coercion — z.coerce.number("") is 0.
  price: z
    .union([z.literal(""), z.coerce.number().min(0, "Price can't be negative.")])
    .optional(),
  validity_days: z.coerce
    .number()
    .int("Whole days only.")
    .min(1, "At least 1 day.")
    .max(3650, "Max 10 years."),
  theme: themeEnum,
  is_active: z.coerce.boolean().optional().default(true),
  // Benefits arrive as a newline-separated block from the form.
  benefits: z.string().optional().default(""),
});

export const couponDefinitionSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(80),
    description: z.string().trim().min(2, "Benefit description is required.").max(500),
    terms: z.string().trim().max(1000).optional().or(z.literal("")),
    valid_from: z.string().min(1, "Validity start is required."),
    valid_until: z.string().min(1, "Expiry is required."),
    is_active: z.coerce.boolean().optional().default(true),
  })
  .refine(
    (v) => new Date(v.valid_until).getTime() > new Date(v.valid_from).getTime(),
    { message: "Expiry must be after the validity start.", path: ["valid_until"] },
  );

export const memberSchema = z.object({
  mobile: z.string().trim().min(1, "Mobile number is required."),
  name: z.string().trim().max(80).optional().or(z.literal("")),
  is_loyalty: z.coerce.boolean().optional().default(true),
});

export const assignCardSchema = z.object({
  membership_type_id: z.string().uuid("Pick a membership type."),
});

export const assignCouponSchema = z.object({
  coupon_definition_id: z.string().uuid("Pick a coupon."),
});

export const bulkAssignSchema = z.object({
  mobiles: z.string().min(1, "Enter at least one mobile number."),
});

export type MembershipTypeInput = z.infer<typeof membershipTypeSchema>;
export type CouponDefinitionInput = z.infer<typeof couponDefinitionSchema>;
export type MemberInput = z.infer<typeof memberSchema>;

/** Split a pasted block of mobiles (newline/comma/space separated). */
export function splitMobiles(block: string): string[] {
  return block
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500);
}

/** Parse a benefits textarea (one per line) into trimmed non-empty lines. */
export function parseBenefitLines(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 30);
}
