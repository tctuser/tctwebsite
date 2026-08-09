-- Replace the weekly/total quota with one clear rule: a configurable number
-- of confirmed bookings per Europe/Berlin calendar day. Privileged booking
-- roles remain exempt, and admins can disable the rule entirely.
alter table public.booking_rules
  add column if not exists max_daily_bookings integer not null default 3
    check (max_daily_bookings between 1 and 20),
  add column if not exists daily_booking_limit_enabled boolean not null default true;

update public.booking_rules
set max_daily_bookings = 3,
    daily_booking_limit_enabled = true
where id = true;

drop trigger if exists enforce_booking_weekly_quota on public.court_bookings;
drop function if exists public.enforce_booking_weekly_quota();

create or replace function public.enforce_booking_daily_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rules public.booking_rules;
  already_booked integer;
  booking_day date;
begin
  if new.status <> 'confirmed' or public.is_booking_privileged() then
    return new;
  end if;

  select * into rules from public.booking_rules where id = true;
  if not rules.daily_booking_limit_enabled then
    return new;
  end if;

  booking_day := (new.starts_at at time zone 'Europe/Berlin')::date;
  -- Prevent two parallel requests from both becoming the fourth booking.
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':' || booking_day::text, 0)
  );

  select count(*) into already_booked
  from public.court_bookings
  where user_id = new.user_id
    and status = 'confirmed'
    and (starts_at at time zone 'Europe/Berlin')::date = booking_day;

  if already_booked >= rules.max_daily_bookings then
    raise exception using
      message = 'Dein Buchungskontingent für diesen Tag ist bereits ausgeschöpft.',
      errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger enforce_booking_daily_quota
before insert on public.court_bookings
for each row execute function public.enforce_booking_daily_quota();

-- The old RPC also imposed a second limit on all upcoming bookings. Recreate
-- it without that obsolete check; the daily trigger is now the sole quota.
create or replace function public.book_court(
  target_court_id uuid,
  requested_start timestamptz,
  requested_minutes integer,
  guest_name text,
  requested_email text
)
returns public.court_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  rules public.booking_rules;
  booking public.court_bookings;
  requested_end timestamptz;
  local_start timestamp;
  local_end timestamp;
  court_kind public.court_kind;
  price integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Bitte zuerst anmelden.' using errcode = '28000';
  end if;
  if requested_email !~* '^\S+@\S+\.\S+$' then
    raise exception 'Bitte eine gültige E-Mail-Adresse für die Bestätigung eingeben.';
  end if;

  select * into rules from public.booking_rules where id = true;
  requested_end := requested_start + make_interval(mins => requested_minutes);
  local_start := requested_start at time zone 'Europe/Berlin';
  local_end := requested_end at time zone 'Europe/Berlin';

  if requested_minutes not in (60, 90, 120) then raise exception 'Ungültige Spielzeit.'; end if;
  if requested_start < now() then raise exception 'Diese Uhrzeit liegt bereits in der Vergangenheit.'; end if;
  if local_start::date > (now() at time zone 'Europe/Berlin')::date + rules.advance_days then raise exception 'Dieser Termin liegt außerhalb des Vorausbuchungszeitraums.'; end if;
  if extract(minute from local_start) <> 0 or extract(minute from local_end) <> 0 or extract(hour from local_start) < 7 or extract(hour from local_end) > 22 then raise exception 'Buchbar ist stündlich zwischen 07:00 und 22:00 Uhr.'; end if;
  if not rules.allow_guest and nullif(trim(coalesce(guest_name, '')), '') is not null then raise exception 'Gastspieler sind derzeit nicht erlaubt.'; end if;

  select kind into court_kind from public.courts where id = target_court_id and active;
  if court_kind is null then raise exception 'Dieser Platz ist nicht verfügbar.'; end if;
  if court_kind = 'padel' then price := requested_minutes * 2400 / 60; end if;

  if exists (
    select 1 from public.court_blocks
    where court_id = target_court_id
      and starts_at < requested_end and ends_at > requested_start
  ) then raise exception 'Der Platz ist in diesem Zeitraum gesperrt.'; end if;

  if not public.is_booking_privileged() and exists (
    select 1 from public.court_bookings
    where user_id = auth.uid() and status = 'confirmed'
      and starts_at < requested_end and ends_at > requested_start
  ) then raise exception 'Mitglieder können zur selben Uhrzeit nur einen Platz buchen.'; end if;

  insert into public.court_bookings (
    court_id, user_id, starts_at, ends_at, partner_name,
    booking_email, amount_cents
  ) values (
    target_court_id, auth.uid(), requested_start, requested_end,
    nullif(trim(guest_name), ''), lower(trim(requested_email)), price
  ) returning * into booking;

  return booking;
end;
$$;

revoke all on function public.book_court(uuid, timestamptz, integer, text, text) from public, anon;
grant execute on function public.book_court(uuid, timestamptz, integer, text, text) to authenticated;
