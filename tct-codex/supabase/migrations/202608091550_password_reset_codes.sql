create table if not exists public.password_reset_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  requested_at timestamptz not null default now()
);

alter table public.password_reset_codes enable row level security;
