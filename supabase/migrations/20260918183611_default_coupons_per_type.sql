-- Fusion Studio — default coupons per membership type
--
-- Each membership type can have a set of "default" coupon definitions. When a
-- card of that type is issued (or a default is newly enabled), those coupons
-- are auto-assigned to the member as available wallet items.
--
-- Presence of a row here = enabled for that type.

create table membership_type_default_coupons (
  id uuid primary key default gen_random_uuid(),
  membership_type_id uuid not null references membership_types (id) on delete cascade,
  coupon_definition_id uuid not null references coupon_definitions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (membership_type_id, coupon_definition_id)
);
create index membership_type_default_coupons_type_idx
  on membership_type_default_coupons (membership_type_id);

alter table membership_type_default_coupons enable row level security;

-- Track how an assigned coupon was granted, so default grants are identifiable
-- and de-duplicated. Existing rows default to 'admin'.
alter table assigned_coupons
  add column source text not null default 'admin'
  check (source in ('admin', 'default', 'transfer'));
