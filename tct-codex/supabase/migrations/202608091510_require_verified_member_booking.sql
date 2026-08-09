-- Never rely solely on the browser to enforce e-mail verification.
-- Public member accounts must confirm their e-mail before creating a booking.

create or replace function public.require_verified_member_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role public.editor_role;
  is_verified boolean;
begin
  select role, email_verified
    into account_role, is_verified
  from public.profiles
  where id = auth.uid();

  if account_role = 'member' and coalesce(is_verified, false) is not true then
    raise exception 'Bitte bestätige zuerst deine E-Mail-Adresse, bevor du einen Platz buchst.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists require_verified_member_booking on public.court_bookings;
create trigger require_verified_member_booking
before insert on public.court_bookings
for each row
execute function public.require_verified_member_booking();
