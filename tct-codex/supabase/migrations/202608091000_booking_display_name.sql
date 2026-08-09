-- Show the optional "booked for" name to authenticated club members in the court schedule.
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
  select
    b.court_id,
    b.starts_at,
    b.ends_at,
    'booking'::text,
    coalesce(nullif(trim(b.partner_name), ''), 'Belegt')::text,
    b.user_id = auth.uid()
  from public.court_bookings b
  join public.courts c on c.id = b.court_id
  where b.status = 'confirmed'
    and b.starts_at < ((target_day + 1)::timestamp at time zone 'Europe/Berlin')
    and b.ends_at > (target_day::timestamp at time zone 'Europe/Berlin')
    and (requested_kind is null or c.kind = requested_kind)
  union all
  select x.court_id, x.starts_at, x.ends_at, 'block'::text, x.title, false
  from public.court_blocks x
  join public.courts c on c.id = x.court_id
  where x.starts_at < ((target_day + 1)::timestamp at time zone 'Europe/Berlin')
    and x.ends_at > (target_day::timestamp at time zone 'Europe/Berlin')
    and (requested_kind is null or c.kind = requested_kind);
$$;

revoke all on function public.get_court_schedule(date, public.court_kind) from public;
grant execute on function public.get_court_schedule(date, public.court_kind) to authenticated;
