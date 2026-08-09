-- TCT Court Booking: run once via `npx supabase db query --linked --file supabase/court-booking.sql`.
-- All booking writes go through the RPCs below; the browser never decides availability.

create extension if not exists btree_gist;

create type public.court_kind as enum ('tennis', 'padel');

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind public.court_kind not null,
  area text not null check (area in ('outdoor', 'indoor')),
  sort_order integer not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.courts (name, kind, area, sort_order) values
  ('Außenplatz CC', 'tennis', 'outdoor', 1),
  ('Außenplatz 1', 'tennis', 'outdoor', 2),
  ('Außenplatz 2', 'tennis', 'outdoor', 3),
  ('Außenplatz 3', 'tennis', 'outdoor', 4),
  ('Außenplatz 4', 'tennis', 'outdoor', 5),
  ('Außenplatz 5', 'tennis', 'outdoor', 6),
  ('Außenplatz 10', 'tennis', 'outdoor', 7),
  ('Außenplatz 11', 'tennis', 'outdoor', 8),
  ('Außenplatz 16', 'tennis', 'outdoor', 9),
  ('Außenplatz 17', 'tennis', 'outdoor', 10),
  ('Außenplatz 18', 'tennis', 'outdoor', 11),
  ('Außenplatz 19', 'tennis', 'outdoor', 12),
  ('Außenplatz 20', 'tennis', 'outdoor', 13),
  ('Außenplatz 21', 'tennis', 'outdoor', 14),
  ('Außenplatz 22', 'tennis', 'outdoor', 15),
  ('Padelplatz', 'padel', 'outdoor', 16)
on conflict (name) do nothing;

create table if not exists public.booking_rules (
  id boolean primary key default true check (id),
  advance_days integer not null default 7 check (advance_days between 1 and 30),
  max_active_bookings integer not null default 3 check (max_active_bookings between 1 and 20),
  default_minutes integer not null default 60 check (default_minutes in (60, 90, 120)),
  cancellation_hours integer not null default 2 check (cancellation_hours between 0 and 48),
  allow_guest boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.booking_rules (id) values (true) on conflict (id) do nothing;

create table if not exists public.court_bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  partner_name text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at),
  check (char_length(coalesce(partner_name, '')) <= 100)
);

create index if not exists court_bookings_court_time_idx on public.court_bookings (court_id, starts_at);
create index if not exists court_bookings_user_time_idx on public.court_bookings (user_id, starts_at);
do $$ begin
  alter table public.court_bookings add constraint court_bookings_no_overlap
    exclude using gist (court_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (status = 'confirmed');
exception when duplicate_object then null;
end $$;

create table if not exists public.court_blocks (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text not null default 'Platzsperre',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (char_length(title) between 2 and 100)
);
create index if not exists court_blocks_court_time_idx on public.court_blocks (court_id, starts_at);

create or replace function public.is_booking_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('management', 'admin')
  );
$$;

alter table public.courts enable row level security;
alter table public.booking_rules enable row level security;
alter table public.court_bookings enable row level security;
alter table public.court_blocks enable row level security;

drop policy if exists "courts visible to everyone" on public.courts;
create policy "courts visible to everyone" on public.courts for select using (true);
drop policy if exists "booking admins manage courts" on public.courts;
create policy "booking admins manage courts" on public.courts for all using (public.is_booking_admin()) with check (public.is_booking_admin());

drop policy if exists "booking rules visible to everyone" on public.booking_rules;
create policy "booking rules visible to everyone" on public.booking_rules for select using (true);
drop policy if exists "booking admins manage rules" on public.booking_rules;
create policy "booking admins manage rules" on public.booking_rules for update using (public.is_booking_admin()) with check (public.is_booking_admin());

drop policy if exists "members see own bookings" on public.court_bookings;
create policy "members see own bookings" on public.court_bookings for select using (auth.uid() = user_id or public.is_booking_admin());

drop policy if exists "booking admins see blocks" on public.court_blocks;
create policy "booking admins see blocks" on public.court_blocks for select using (public.is_booking_admin());
drop policy if exists "booking admins delete blocks" on public.court_blocks;
create policy "booking admins delete blocks" on public.court_blocks for delete using (public.is_booking_admin());

create or replace function public.get_court_schedule(target_day date, requested_kind public.court_kind default null)
returns table (
  court_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  source text,
  label text,
  is_own boolean
)
language sql stable security definer set search_path = public as $$
  select b.court_id, b.starts_at, b.ends_at, 'booking'::text, 'Belegt'::text, b.user_id = auth.uid()
  from public.court_bookings b join public.courts c on c.id = b.court_id
  where b.status = 'confirmed'
    and b.starts_at < ((target_day + 1)::timestamp at time zone 'Europe/Berlin')
    and b.ends_at > (target_day::timestamp at time zone 'Europe/Berlin')
    and (requested_kind is null or c.kind = requested_kind)
  union all
  select x.court_id, x.starts_at, x.ends_at, 'block'::text, x.title, false
  from public.court_blocks x join public.courts c on c.id = x.court_id
  where x.starts_at < ((target_day + 1)::timestamp at time zone 'Europe/Berlin')
    and x.ends_at > (target_day::timestamp at time zone 'Europe/Berlin')
    and (requested_kind is null or c.kind = requested_kind);
$$;
revoke all on function public.get_court_schedule(date, public.court_kind) from public;
grant execute on function public.get_court_schedule(date, public.court_kind) to authenticated;

create or replace function public.book_court(
  target_court_id uuid,
  requested_start timestamptz,
  requested_minutes integer,
  guest_name text default null
)
returns public.court_bookings
language plpgsql security definer set search_path = public as $$
declare
  rules public.booking_rules;
  booking public.court_bookings;
  requested_end timestamptz;
  local_start timestamp;
  local_end timestamp;
begin
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden.' using errcode = '28000'; end if;
  select * into rules from public.booking_rules where id = true;
  requested_end := requested_start + make_interval(mins => requested_minutes);
  local_start := requested_start at time zone 'Europe/Berlin';
  local_end := requested_end at time zone 'Europe/Berlin';
  if requested_minutes not in (60, 90, 120) then raise exception 'Ungültige Spielzeit.'; end if;
  if requested_start < now() then raise exception 'Diese Uhrzeit liegt bereits in der Vergangenheit.'; end if;
  if local_start::date > (now() at time zone 'Europe/Berlin')::date + rules.advance_days then raise exception 'Dieser Termin liegt außerhalb des Vorausbuchungszeitraums.'; end if;
  if extract(minute from local_start) <> 0 or extract(minute from local_end) <> 0
    or extract(hour from local_start) < 7 or extract(hour from local_end) > 22 then raise exception 'Buchbar ist stündlich zwischen 07:00 und 22:00 Uhr.'; end if;
  if not rules.allow_guest and nullif(trim(coalesce(guest_name, '')), '') is not null then raise exception 'Gastspieler sind derzeit nicht erlaubt.'; end if;
  if not exists (select 1 from public.courts where id = target_court_id and active) then raise exception 'Dieser Platz ist nicht verfügbar.'; end if;
  if exists (select 1 from public.court_blocks where court_id = target_court_id and starts_at < requested_end and ends_at > requested_start) then raise exception 'Der Platz ist in diesem Zeitraum gesperrt.'; end if;
  if (select count(*) from public.court_bookings where user_id = auth.uid() and status = 'confirmed' and starts_at >= now()) >= rules.max_active_bookings then raise exception 'Die maximale Anzahl gleichzeitiger Buchungen ist erreicht.'; end if;
  insert into public.court_bookings (court_id, user_id, starts_at, ends_at, partner_name)
  values (target_court_id, auth.uid(), requested_start, requested_end, nullif(trim(guest_name), ''))
  returning * into booking;
  return booking;
end;
$$;
revoke all on function public.book_court(uuid, timestamptz, integer, text) from public;
grant execute on function public.book_court(uuid, timestamptz, integer, text) to authenticated;

create or replace function public.cancel_own_booking(booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare rules public.booking_rules;
begin
  select * into rules from public.booking_rules where id = true;
  update public.court_bookings set status = 'cancelled', cancelled_at = now()
  where id = booking_id and user_id = auth.uid() and status = 'confirmed'
    and starts_at >= now() + make_interval(hours => rules.cancellation_hours);
  if not found then raise exception 'Diese Buchung kann nicht mehr storniert werden.'; end if;
end;
$$;
revoke all on function public.cancel_own_booking(uuid) from public;
grant execute on function public.cancel_own_booking(uuid) to authenticated;

create or replace function public.create_court_block(
  target_court_id uuid,
  requested_start timestamptz,
  requested_end timestamptz,
  block_title text,
  repeat_mode text default 'once',
  repeat_count integer default 1
)
returns integer language plpgsql security definer set search_path = public as $$
declare i integer; block_start timestamptz; block_end timestamptz; step_interval interval;
begin
  if not public.is_booking_admin() then raise exception 'Nicht berechtigt.' using errcode = '42501'; end if;
  if requested_end <= requested_start or repeat_mode not in ('once','daily','weekly') or repeat_count not between 1 and 52 then raise exception 'Ungültige Sperrzeit.'; end if;
  step_interval := case repeat_mode when 'daily' then interval '1 day' when 'weekly' then interval '1 week' else interval '0 day' end;
  for i in 0..repeat_count - 1 loop
    block_start := requested_start + step_interval * i;
    block_end := requested_end + step_interval * i;
    if exists (select 1 from public.court_bookings where court_id = target_court_id and status = 'confirmed' and starts_at < block_end and ends_at > block_start) then
      raise exception 'Für mindestens eine Sperrzeit gibt es bereits eine Buchung.';
    end if;
    insert into public.court_blocks (court_id, starts_at, ends_at, title, created_by) values (target_court_id, block_start, block_end, trim(block_title), auth.uid());
  end loop;
  return repeat_count;
end;
$$;
revoke all on function public.create_court_block(uuid, timestamptz, timestamptz, text, text, integer) from public;
grant execute on function public.create_court_block(uuid, timestamptz, timestamptz, text, text, integer) to authenticated;
