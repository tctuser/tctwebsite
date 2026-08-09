create or replace function public.cancel_own_booking_with_email(booking_id uuid)
returns public.court_bookings language plpgsql security definer set search_path = public as $$
declare rules public.booking_rules; booking public.court_bookings;
begin
  select * into rules from public.booking_rules where id = true;
  update public.court_bookings set status = 'cancelled', cancelled_at = now()
  where id = booking_id and user_id = auth.uid() and status = 'confirmed'
    and starts_at >= now() + make_interval(hours => rules.cancellation_hours)
  returning * into booking;
  if not found then raise exception 'Diese Buchung kann nicht mehr storniert werden.'; end if;
  return booking;
end;
$$;
revoke all on function public.cancel_own_booking_with_email(uuid) from public;
grant execute on function public.cancel_own_booking_with_email(uuid) to authenticated;
