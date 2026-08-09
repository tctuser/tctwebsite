-- Practical booking extras: weekly quota, wait list and a short recurring series.

alter table public.booking_rules
  add column if not exists max_weekly_bookings integer not null default 3
  check (max_weekly_bookings between 1 and 20),
  add column if not exists max_recurring_weeks integer not null default 4
  check (max_recurring_weeks between 2 and 12);

alter table public.court_bookings
  add column if not exists recurring_group_id uuid;

create table if not exists public.court_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  booking_email text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (user_id, court_id, starts_at, ends_at)
);

create index if not exists court_waitlist_slot_idx
  on public.court_waitlist (court_id, starts_at, ends_at, notified_at, created_at);

alter table public.court_waitlist enable row level security;

drop policy if exists "members manage own court waitlist" on public.court_waitlist;
create policy "members manage own court waitlist"
on public.court_waitlist
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and booking_email ~* '^\S+@\S+\.\S+$');

create or replace function public.enforce_booking_weekly_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rules public.booking_rules;
  already_booked integer;
  week_start timestamp;
begin
  if public.is_booking_privileged() then
    return new;
  end if;

  select * into rules from public.booking_rules where id = true;
  week_start := date_trunc('week', new.starts_at at time zone 'Europe/Berlin');
  select count(*) into already_booked
  from public.court_bookings
  where user_id = new.user_id
    and status = 'confirmed'
    and date_trunc('week', starts_at at time zone 'Europe/Berlin') = week_start;

  if already_booked >= rules.max_weekly_bookings then
    raise exception 'Dein wöchentliches Buchungskontingent ist bereits ausgeschöpft.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_booking_weekly_quota on public.court_bookings;
create trigger enforce_booking_weekly_quota
before insert on public.court_bookings
for each row execute function public.enforce_booking_weekly_quota();

create or replace function public.book_recurring_courts(
  target_court_id uuid,
  first_start timestamptz,
  requested_minutes integer,
  weeks integer,
  guest_name text,
  requested_email text
)
returns setof public.court_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  rules public.booking_rules;
  slot_start timestamptz;
  slot_end timestamptz;
  slot_local timestamp;
  court_kind public.court_kind;
  price integer := 0;
  series_id uuid := gen_random_uuid();
  item public.court_bookings;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'Bitte zuerst anmelden.' using errcode = '28000';
  end if;
  if requested_email !~* '^\S+@\S+\.\S+$' then
    raise exception 'Bitte eine gültige E-Mail-Adresse für die Bestätigung eingeben.';
  end if;
  select * into rules from public.booking_rules where id = true;
  if weeks not between 2 and rules.max_recurring_weeks then
    raise exception using message = 'Wiederkehrende Buchungen sind für zwei bis ' || rules.max_recurring_weeks || ' Wochen möglich.';
  end if;
  if requested_minutes not in (60, 90, 120) then
    raise exception 'Ungültige Spielzeit.';
  end if;
  if not rules.allow_guest and nullif(trim(coalesce(guest_name, '')), '') is not null then
    raise exception 'Gastspieler sind derzeit nicht erlaubt.';
  end if;
  select kind into court_kind from public.courts where id = target_court_id and active;
  if court_kind is null then
    raise exception 'Dieser Platz ist nicht verfügbar.';
  end if;
  if court_kind = 'padel' then
    price := requested_minutes * 2400 / 60;
  end if;

  for i in 0..weeks - 1 loop
    slot_start := first_start + make_interval(weeks => i);
    slot_end := slot_start + make_interval(mins => requested_minutes);
    slot_local := slot_start at time zone 'Europe/Berlin';
    if slot_start < now()
      or extract(minute from slot_local) <> 0
      or extract(hour from slot_local) < 7
      or extract(hour from (slot_end at time zone 'Europe/Berlin')) > 22 then
      raise exception 'Eine Buchung der Serie liegt außerhalb der buchbaren Zeiten.';
    end if;
    if exists (
      select 1 from public.court_blocks
      where court_id = target_court_id
        and starts_at < slot_end and ends_at > slot_start
    ) or exists (
      select 1 from public.court_bookings
      where court_id = target_court_id and status = 'confirmed'
        and starts_at < slot_end and ends_at > slot_start
    ) then
      raise exception 'Mindestens ein Termin der Serie ist nicht frei. Es wurde nichts gebucht.';
    end if;
  end loop;

  for i in 0..weeks - 1 loop
    slot_start := first_start + make_interval(weeks => i);
    slot_end := slot_start + make_interval(mins => requested_minutes);
    insert into public.court_bookings (
      court_id, user_id, starts_at, ends_at, partner_name,
      booking_email, amount_cents, recurring_group_id
    ) values (
      target_court_id, auth.uid(), slot_start, slot_end,
      nullif(trim(guest_name), ''), lower(trim(requested_email)), price, series_id
    ) returning * into item;
    return next item;
  end loop;
end;
$$;

revoke all on function public.book_recurring_courts(uuid, timestamptz, integer, integer, text, text) from public, anon;
grant execute on function public.book_recurring_courts(uuid, timestamptz, integer, integer, text, text) to authenticated;
