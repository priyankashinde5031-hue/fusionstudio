-- Coupon kind: marketing vs membership.
--
-- 'marketing'  — the existing behaviour: admin sets a fixed valid_from/valid_until
--                window on the definition. UNCHANGED.
-- 'membership' — no fixed expiry stored on the definition. When assigned to a
--                member, the coupon expires together with that member's
--                membership (the active card's valid_until, ~365 days). If the
--                member has no active membership, the coupon reads as expired.
--
-- Existing definitions default to 'marketing' so nothing changes for them.

alter table coupon_definitions
  add column kind text not null default 'marketing'
  check (kind in ('marketing', 'membership'));

-- Membership coupons carry no fixed expiry, so valid_until is optional for them.
-- (Marketing coupons still require it — enforced in app validation.)
alter table coupon_definitions
  alter column valid_until drop not null;
