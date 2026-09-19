-- Soft-unassign for wrongly-assigned coupons.
-- We never hard-delete coupon records; an unassigned coupon is hidden from the
-- member's wallet and admin lists but kept for the audit trail.

alter table assigned_coupons
  add column unassigned_at timestamptz,
  add column unassigned_by_admin_id uuid references admins (id);

-- Speed up the "active (not unassigned)" lookups.
create index assigned_coupons_active_member_idx
  on assigned_coupons (member_id)
  where unassigned_at is null;
