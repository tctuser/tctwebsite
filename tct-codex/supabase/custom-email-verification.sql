alter table public.profiles add column if not exists email_verified boolean not null default true;
update public.profiles set email_verified = true where email_verified is null;

create table if not exists public.member_email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.member_email_verifications enable row level security;
