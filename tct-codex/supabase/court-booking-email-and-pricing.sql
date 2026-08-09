-- Persist booking price and confirmation recipient, including existing Padel bookings.
alter table public.court_bookings add column if not exists amount_cents integer not null default 0 check (amount_cents >= 0);
alter table public.court_bookings add column if not exists booking_email text;

update public.court_bookings b
set amount_cents = round(extract(epoch from (b.ends_at - b.starts_at)) / 3600 * 2400)::integer
from public.courts c
where c.id = b.court_id and c.kind = 'padel' and b.amount_cents = 0;

update public.court_bookings b
set booking_email = p.login_email
from public.profiles p
where p.id = b.user_id and b.booking_email is null;

create or replace function public.book_court(
  target_court_id uuid,
  requested_start timestamptz,
  requested_minutes integer,
  guest_name text,
  requested_email text
)
returns public.court_bookings
language plpgsql security definer set search_path = public as $$
declare
  rules public.booking_rules;
  booking public.court_bookings;
  requested_end timestamptz;
  local_start timestamp;
  local_end timestamp;
  court_kind public.court_kind;
  price integer := 0;
begin
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden.' using errcode = '28000'; end if;
  if requested_email !~* '^\S+@\S+\.\S+$' then raise exception 'Bitte eine gültige E-Mail-Adresse für die Bestätigung eingeben.'; end if;
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
  if exists (select 1 from public.court_blocks where court_id = target_court_id and starts_at < requested_end and ends_at > requested_start) then raise exception 'Der Platz ist in diesem Zeitraum gesperrt.'; end if;
  if (select count(*) from public.court_bookings where user_id = auth.uid() and status = 'confirmed' and starts_at >= now()) >= rules.max_active_bookings then raise exception 'Die maximale Anzahl gleichzeitiger Buchungen ist erreicht.'; end if;
  insert into public.court_bookings (court_id, user_id, starts_at, ends_at, partner_name, booking_email, amount_cents)
  values (target_court_id, auth.uid(), requested_start, requested_end, nullif(trim(guest_name), ''), lower(trim(requested_email)), price)
  returning * into booking;
  return booking;
end;
$$;
revoke all on function public.book_court(uuid, timestamptz, integer, text, text) from public;
grant execute on function public.book_court(uuid, timestamptz, integer, text, text) to authenticated;
