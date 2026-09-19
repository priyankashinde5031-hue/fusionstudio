-- Multi-use ("punch card") coupons + per-use redemption log.
-- A coupon definition can allow N redemptions (usage_limit). Each assigned
-- coupon tracks how many uses it has consumed; every redemption records who
-- availed it (name / mobile), so e.g. a guest can bring a sister along.

alter table coupon_definitions
  add column if not exists usage_limit integer not null default 1 check (usage_limit >= 1);

alter table assigned_coupons
  add column if not exists uses_count integer not null default 0;

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  assigned_coupon_id uuid not null references assigned_coupons (id),
  used_by_name text,
  used_by_mobile text,
  redeemed_by_admin_id uuid references admins (id),
  created_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_idx on coupon_redemptions (assigned_coupon_id);

alter table coupon_redemptions enable row level security;
