-- OTP challenges for member mobile verification (method A, real OTP).
-- One active challenge per mobile at a time; code is stored hashed.

create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  mobile text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_challenges_mobile_idx on otp_challenges (mobile, created_at desc);

alter table otp_challenges enable row level security;
