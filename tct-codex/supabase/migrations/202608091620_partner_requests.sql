-- Member-only tennis partner board. Contact details are only visible to
-- authenticated, verified club members; phone numbers are never collected.
create table if not exists public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  contact_email text not null check (contact_email ~* '^\S+@\S+\.\S+$'),
  level text not null check (char_length(level) between 2 and 50),
  availability text not null check (char_length(availability) between 2 and 120),
  message text check (char_length(message) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index if not exists partner_requests_active_idx
  on public.partner_requests (active, expires_at desc, created_at desc);

alter table public.partner_requests enable row level security;

create policy "verified members read active partner requests"
on public.partner_requests
for select to authenticated
using (
  exists (select 1 from public.profiles where id = auth.uid() and email_verified = true)
  and ((active and expires_at > now()) or user_id = auth.uid())
);

create policy "verified members create own partner requests"
on public.partner_requests
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and email_verified = true
      and lower(login_email) = lower(partner_requests.contact_email)
  )
);

create policy "members remove own partner requests"
on public.partner_requests
for delete to authenticated
using (user_id = auth.uid());

revoke all on table public.partner_requests from anon;
grant select, insert, delete on table public.partner_requests to authenticated;
