-- Fusion Studio — Phase 1 core schema
-- Memberships, benefits, coupons (definitions + assigned instances), members,
-- admins, transfers, audit log.
--
-- Security model: all app DB access is server-side via the Supabase service
-- role (which bypasses RLS). RLS is ENABLED with NO permissive policies, so the
-- public anon key cannot read or write anything. Custom auth (admin session /
-- member PIN) is enforced in application code, not RLS.

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type created_via as enum ('admin', 'coupon_transfer');
create type card_status as enum ('active', 'expired', 'revoked');
create type coupon_status as enum ('available', 'revealed', 'redeemed', 'expired');
create type membership_theme as enum ('silver', 'gold', 'platinum', 'black');

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Human-readable id sequences (FS-M-000123, FS-C-000123)
-- ─────────────────────────────────────────────────────────────
create sequence if not exists seq_membership_number start 1;
create sequence if not exists seq_coupon_number start 1;

-- ─────────────────────────────────────────────────────────────
-- admins — internal staff login (email + password)
-- ─────────────────────────────────────────────────────────────
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz
);
create trigger admins_set_updated_at before update on admins
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- members — customers, identified by mobile (+91). Loyalty or Guest.
-- ─────────────────────────────────────────────────────────────
create table members (
  id uuid primary key default gen_random_uuid(),
  mobile text not null unique
    check (mobile ~ '^\+91[6-9][0-9]{9}$'),
  name text,
  is_loyalty boolean not null default true,
  mobile_verified_at timestamptz,
  pin_hash text,
  pin_reset_required boolean not null default false,
  created_via created_via not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz
);
create trigger members_set_updated_at before update on members
  for each row execute function set_updated_at();
create index members_mobile_idx on members (mobile);

-- ─────────────────────────────────────────────────────────────
-- membership_types — tiers (Silver / Gold / Platinum / Black)
-- ─────────────────────────────────────────────────────────────
create table membership_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2),
  validity_days integer not null default 365 check (validity_days > 0),
  theme membership_theme not null default 'gold',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger membership_types_set_updated_at before update on membership_types
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- benefits — perk lines attached to a membership type
-- ─────────────────────────────────────────────────────────────
create table benefits (
  id uuid primary key default gen_random_uuid(),
  membership_type_id uuid not null references membership_types (id) on delete cascade,
  text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index benefits_type_idx on benefits (membership_type_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- membership_cards — issued instance of a type, assigned to a member
-- ─────────────────────────────────────────────────────────────
create table membership_cards (
  id uuid primary key default gen_random_uuid(),
  membership_number text not null unique
    default ('FS-M-' || lpad(nextval('seq_membership_number')::text, 6, '0')),
  membership_type_id uuid not null references membership_types (id),
  member_id uuid not null references members (id),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  status card_status not null default 'active',
  issued_at timestamptz not null default now()
);
create index membership_cards_member_idx on membership_cards (member_id);
create index membership_cards_type_idx on membership_cards (membership_type_id);

-- ─────────────────────────────────────────────────────────────
-- coupon_definitions — coupon templates the admin creates
-- ─────────────────────────────────────────────────────────────
create table coupon_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  terms text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coupon_definitions_set_updated_at before update on coupon_definitions
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- assigned_coupons — the wallet item (a coupon given to a member)
-- ─────────────────────────────────────────────────────────────
create table assigned_coupons (
  id uuid primary key default gen_random_uuid(),
  coupon_number text not null unique
    default ('FS-C-' || lpad(nextval('seq_coupon_number')::text, 6, '0')),
  coupon_definition_id uuid not null references coupon_definitions (id),
  member_id uuid not null references members (id),
  status coupon_status not null default 'available',
  redemption_code text,
  revealed_at timestamptz,
  code_expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_admin_id uuid references admins (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger assigned_coupons_set_updated_at before update on assigned_coupons
  for each row execute function set_updated_at();
create index assigned_coupons_member_idx on assigned_coupons (member_id);
create index assigned_coupons_definition_idx on assigned_coupons (coupon_definition_id);
create index assigned_coupons_status_idx on assigned_coupons (status);
-- A redemption code must be unique among currently-active revealed coupons so
-- staff entry is unambiguous.
create unique index assigned_coupons_active_code_idx
  on assigned_coupons (redemption_code)
  where status = 'revealed' and redemption_code is not null;

-- ─────────────────────────────────────────────────────────────
-- coupon_transfers — audit trail of who sent a coupon to whom
-- ─────────────────────────────────────────────────────────────
create table coupon_transfers (
  id uuid primary key default gen_random_uuid(),
  assigned_coupon_id uuid not null references assigned_coupons (id),
  from_member_id uuid references members (id),
  to_member_id uuid not null references members (id),
  to_mobile text not null,
  created_at timestamptz not null default now()
);
create index coupon_transfers_coupon_idx on coupon_transfers (assigned_coupon_id);

-- ─────────────────────────────────────────────────────────────
-- audit_log — who did what, when
-- ─────────────────────────────────────────────────────────────
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins (id),
  member_id uuid references members (id),
  action text not null,
  entity_type text,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Row-Level Security: enable on every table, add NO policies.
-- The anon/public key is therefore denied all access; the server uses the
-- service role which bypasses RLS.
-- ─────────────────────────────────────────────────────────────
alter table admins enable row level security;
alter table members enable row level security;
alter table membership_types enable row level security;
alter table benefits enable row level security;
alter table membership_cards enable row level security;
alter table coupon_definitions enable row level security;
alter table assigned_coupons enable row level security;
alter table coupon_transfers enable row level security;
alter table audit_log enable row level security;
