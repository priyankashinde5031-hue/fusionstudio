-- Remove the 24-hour reveal window.
-- A revealed coupon now keeps its code until it is redeemed; there is no
-- time-boxed expiry on the reveal itself. The coupon's own valid_from/valid_until
-- still governs when it can be revealed/used.

alter table assigned_coupons drop column if exists code_expires_at;
