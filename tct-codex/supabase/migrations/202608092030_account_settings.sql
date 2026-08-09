create table if not exists public.account_email_changes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_email text not null check (new_email ~* '^\S+@\S+\.\S+$'),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 10),
  requested_at timestamptz not null default now()
);

alter table public.account_email_changes enable row level security;

-- E-mail changes are only handled by the authenticated Edge Function. Keeping
-- this table inaccessible to browser clients prevents verification-code data
-- from being read or overwritten directly.
revoke all on table public.account_email_changes from anon, authenticated;

