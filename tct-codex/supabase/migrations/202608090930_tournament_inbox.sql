-- Dedicated inbox for tournament questions and registrations.
-- Kept separate from the general contact mailbox so team leads only see tournament data.

create table if not exists public.tournament_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 254),
  tournament_title text not null check (char_length(trim(tournament_title)) between 2 and 180),
  inquiry_type text not null check (inquiry_type in ('question', 'registration')),
  message text check (char_length(coalesce(message, '')) <= 4000),
  status public.contact_message_status not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists tournament_inquiries_created_at_idx on public.tournament_inquiries (created_at desc);
alter table public.tournament_inquiries enable row level security;

create or replace function public.is_tournament_inbox_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('management', 'admin', 'tournament_manager')
  );
$$;

drop policy if exists "visitors submit tournament inquiries" on public.tournament_inquiries;
create policy "visitors submit tournament inquiries"
on public.tournament_inquiries for insert to anon, authenticated
with check (
  status = 'new'
  and inquiry_type in ('question', 'registration')
  and char_length(trim(name)) between 2 and 120
  and char_length(trim(email)) between 5 and 254
  and char_length(trim(tournament_title)) between 2 and 180
  and char_length(coalesce(message, '')) <= 4000
);

drop policy if exists "tournament team manages tournament inquiries" on public.tournament_inquiries;
create policy "tournament team manages tournament inquiries"
on public.tournament_inquiries for all to authenticated
using (public.is_tournament_inbox_manager())
with check (public.is_tournament_inbox_manager());

-- Include these records in the existing owner-only change log when that log is installed.
do $$ begin
  if to_regclass('public.audit_log') is not null and to_regprocedure('public.write_audit_log()') is not null then
    alter table public.audit_log drop constraint if exists audit_log_table_name_check;
    alter table public.audit_log add constraint audit_log_table_name_check check (table_name in ('news', 'events', 'club_content', 'profiles', 'contact_messages', 'tournament_inquiries'));
    drop trigger if exists audit_tournament_inquiries on public.tournament_inquiries;
    create trigger audit_tournament_inquiries after insert or update or delete on public.tournament_inquiries for each row execute function public.write_audit_log();
  end if;
end $$;
