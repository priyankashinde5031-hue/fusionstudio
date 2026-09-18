// Fusion Studio — seed script (Phase 1)
// Run with:  npm run seed   (loads .env.local, targets the LINKED/staging DB)
//
// Idempotent-ish: skips inserts that already exist by natural key.
// Never touches production unless you point the env vars at prod.

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const ADMIN_EMAIL = "admin@fusionstudio.in";
const ADMIN_PASSWORD = "fusion123"; // dev only — change in production

async function seedAdmin() {
  const { data: existing } = await db
    .from("admins")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  if (existing) {
    console.log(`  admin ${ADMIN_EMAIL} already exists`);
    return;
  }
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const { error } = await db
    .from("admins")
    .insert({ email: ADMIN_EMAIL, password_hash, name: "Studio Manager" });
  if (error) throw error;
  console.log(`  ✓ admin ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

const TYPES = [
  {
    name: "Silver",
    theme: "silver",
    price: 2999,
    validity_days: 365,
    description: "Everyday perks for regulars.",
    benefits: ["10% off all services", "Priority booking", "Birthday month surprise"],
  },
  {
    name: "Gold",
    theme: "gold",
    price: 5999,
    validity_days: 365,
    description: "Our most-loved tier.",
    benefits: [
      "15% off all services",
      "1 free head spa / month",
      "Complimentary beverages",
      "Priority booking",
    ],
  },
  {
    name: "Platinum",
    theme: "platinum",
    price: 11999,
    validity_days: 365,
    description: "The full Fusion experience.",
    benefits: [
      "25% off all services",
      "2 free head spas / month",
      "1 free hair treatment / quarter",
      "Dedicated stylist",
      "Home service on request",
    ],
  },
];

async function seedTypes() {
  for (const t of TYPES) {
    const { data: existing } = await db
      .from("membership_types")
      .select("id")
      .eq("name", t.name)
      .maybeSingle();
    if (existing) {
      console.log(`  type ${t.name} already exists`);
      continue;
    }
    const { data: created, error } = await db
      .from("membership_types")
      .insert({
        name: t.name,
        theme: t.theme,
        price: t.price,
        validity_days: t.validity_days,
        description: t.description,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    await db.from("benefits").insert(
      t.benefits.map((text, i) => ({
        membership_type_id: created.id,
        text,
        sort_order: i,
      })),
    );
    console.log(`  ✓ type ${t.name} (+${t.benefits.length} benefits)`);
  }
}

function ist(dateStr, end = false) {
  return new Date(`${dateStr}T${end ? "23:59:59" : "00:00:00"}+05:30`).toISOString();
}

const COUPONS = [
  {
    name: "Festive Head Spa",
    description: "1 complimentary head spa",
    terms: "Valid once. Not clubbable with other offers.",
    valid_from: "2026-09-01",
    valid_until: "2026-12-31",
  },
  {
    name: "₹500 off Colour",
    description: "₹500 off any hair colour service",
    terms: "Min bill ₹2000.",
    valid_from: "2026-09-01",
    valid_until: "2026-11-30",
  },
  {
    name: "Bring-a-Friend Facial",
    description: "20% off a facial for a friend",
    terms: null,
    valid_from: "2026-09-01",
    valid_until: "2027-03-31",
  },
];

async function seedCoupons() {
  for (const c of COUPONS) {
    const { data: existing } = await db
      .from("coupon_definitions")
      .select("id")
      .eq("name", c.name)
      .maybeSingle();
    if (existing) {
      console.log(`  coupon ${c.name} already exists`);
      continue;
    }
    const { error } = await db.from("coupon_definitions").insert({
      name: c.name,
      description: c.description,
      terms: c.terms,
      valid_from: ist(c.valid_from),
      valid_until: ist(c.valid_until, true),
      is_active: true,
    });
    if (error) throw error;
    console.log(`  ✓ coupon ${c.name}`);
  }
}

const MEMBERS = [
  { mobile: "+919820011223", name: "Aarav Mehta", is_loyalty: true },
  { mobile: "+919833044556", name: "Diya Sharma", is_loyalty: true },
  { mobile: "+917700088990", name: null, is_loyalty: false }, // guest
];

async function seedMembers() {
  for (const m of MEMBERS) {
    const { data: existing } = await db
      .from("members")
      .select("id")
      .eq("mobile", m.mobile)
      .maybeSingle();
    if (existing) {
      console.log(`  member ${m.mobile} already exists`);
      continue;
    }
    const { error } = await db.from("members").insert({
      mobile: m.mobile,
      name: m.name,
      is_loyalty: m.is_loyalty,
      created_via: "admin",
    });
    if (error) throw error;
    console.log(`  ✓ member ${m.mobile}${m.is_loyalty ? "" : " (guest)"}`);
  }
}

async function main() {
  console.log(`Seeding ${url} …`);
  console.log("Admins:");
  await seedAdmin();
  console.log("Membership types:");
  await seedTypes();
  console.log("Coupons:");
  await seedCoupons();
  console.log("Members:");
  await seedMembers();
  console.log("\nDone. Admin login: %s / %s", ADMIN_EMAIL, ADMIN_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
