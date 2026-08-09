-- Role-based booking limits and multi-court event reservations.
-- Apply with: npx supabase db push

create or replace function public.is_booking_privileged()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('management', 'admin', 'tournament_manager', 'team_manager')
  );
$$;

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
  if not public.is_booking_privileged() and exists (
    select 1 from public.court_bookings
    where user_id = auth.uid() and status = 'confirmed'
      and starts_at < requested_end and ends_at > requested_start
  ) then raise exception 'Mitglieder können zur selben Uhrzeit nur einen Platz buchen.'; end if;
  if not public.is_booking_privileged() and (
    select count(*) from public.court_bookings
    where user_id = auth.uid() and status = 'confirmed' and starts_at >= now()
  ) >= rules.max_active_bookings then raise exception 'Die maximale Anzahl kommender Buchungen ist erreicht.'; end if;
  insert into public.court_bookings (court_id, user_id, starts_at, ends_at, partner_name, booking_email, amount_cents)
  values (target_court_id, auth.uid(), requested_start, requested_end, nullif(trim(guest_name), ''), lower(trim(requested_email)), price)
  returning * into booking;
  return booking;
end;
$$;

create or replace function public.book_multiple_courts(
  target_court_ids uuid[],
  requested_start timestamptz,
  requested_minutes integer,
  guest_name text,
  requested_email text
)
returns setof public.court_bookings
language plpgsql security definer set search_path = public as $$
declare
  rules public.booking_rules;
  requested_end timestamptz;
  local_start timestamp;
  local_end timestamp;
  selected_count integer;
begin
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden.' using errcode = '28000'; end if;
  if not public.is_booking_privileged() then raise exception 'Mehrere Plätze dürfen nur durch berechtigte Rollen gebucht werden.' using errcode = '42501'; end if;
  if cardinality(target_court_ids) not between 2 and 4 or cardinality(array(select distinct unnest(target_court_ids))) <> cardinality(target_court_ids) then raise exception 'Wähle zwei bis vier unterschiedliche Tennisplätze.'; end if;
  if requested_email !~* '^\S+@\S+\.\S+$' then raise exception 'Bitte eine gültige E-Mail-Adresse für die Bestätigung eingeben.'; end if;
  select * into rules from public.booking_rules where id = true;
  requested_end := requested_start + make_interval(mins => requested_minutes);
  local_start := requested_start at time zone 'Europe/Berlin';
  local_end := requested_end at time zone 'Europe/Berlin';
  if requested_minutes not in (60, 90, 120) or requested_start < now() or local_start::date > (now() at time zone 'Europe/Berlin')::date + rules.advance_days or extract(minute from local_start) <> 0 or extract(minute from local_end) <> 0 or extract(hour from local_start) < 7 or extract(hour from local_end) > 22 then raise exception 'Ungültige Buchungszeit.'; end if;
  if not rules.allow_guest and nullif(trim(coalesce(guest_name, '')), '') is not null then raise exception 'Gastspieler sind derzeit nicht erlaubt.'; end if;
  select count(*) into selected_count from public.courts where id = any(target_court_ids) and active and kind = 'tennis';
  if selected_count <> cardinality(target_court_ids) then raise exception 'Mehrfachbuchungen sind nur für verfügbare Tennisplätze möglich.'; end if;
  if exists (select 1 from public.court_blocks where court_id = any(target_court_ids) and starts_at < requested_end and ends_at > requested_start) then raise exception 'Mindestens einer der gewählten Plätze ist gesperrt.'; end if;
  if exists (select 1 from public.court_bookings where court_id = any(target_court_ids) and status = 'confirmed' and starts_at < requested_end and ends_at > requested_start) then raise exception 'Mindestens einer der gewählten Plätze wurde gerade belegt.'; end if;
  return query
    insert into public.court_bookings (court_id, user_id, starts_at, ends_at, partner_name, booking_email, amount_cents)
    select court_id, auth.uid(), requested_start, requested_end, nullif(trim(guest_name), ''), lower(trim(requested_email)), 0
    from unnest(target_court_ids) as court_id
    returning *;
end;
$$;

revoke all on function public.book_multiple_courts(uuid[], timestamptz, integer, text, text) from public;
grant execute on function public.book_multiple_courts(uuid[], timestamptz, integer, text, text) to authenticated;

create or replace function public.create_court_blocks(
  target_court_ids uuid[],
  requested_start timestamptz,
  requested_end timestamptz,
  block_title text,
  repeat_mode text default 'once',
  repeat_count integer default 1
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  i integer;
  block_start timestamptz;
  block_end timestamptz;
  step_interval interval;
begin
  if not public.is_booking_admin() then raise exception 'Nicht berechtigt.' using errcode = '42501'; end if;
  if cardinality(target_court_ids) is null or cardinality(target_court_ids) < 1 or requested_end <= requested_start or repeat_mode not in ('once','daily','weekly') or repeat_count not between 1 and 52 or nullif(trim(block_title), '') is null then raise exception 'Ungültige Sperrzeit.'; end if;
  if (select count(*) from public.courts where id = any(target_court_ids) and active) <> cardinality(array(select distinct unnest(target_court_ids))) then raise exception 'Mindestens ein Platz ist nicht verfügbar.'; end if;
  step_interval := case repeat_mode when 'daily' then interval '1 day' when 'weekly' then interval '1 week' else interval '0 day' end;
  for i in 0..repeat_count - 1 loop
    block_start := requested_start + step_interval * i;
    block_end := requested_end + step_interval * i;
    if exists (select 1 from public.court_bookings where court_id = any(target_court_ids) and status = 'confirmed' and starts_at < block_end and ends_at > block_start) then raise exception 'Für mindestens einen gewählten Platz gibt es bereits eine Buchung. Bestehende Buchungen werden nie automatisch gelöscht.'; end if;
    insert into public.court_blocks (court_id, starts_at, ends_at, title, created_by)
    select court_id, block_start, block_end, trim(block_title), auth.uid() from unnest(target_court_ids) as court_id;
  end loop;
  return cardinality(target_court_ids) * repeat_count;
end;
$$;

revoke all on function public.create_court_blocks(uuid[], timestamptz, timestamptz, text, text, integer) from public;
grant execute on function public.create_court_blocks(uuid[], timestamptz, timestamptz, text, text, integer) to authenticated;
