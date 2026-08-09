-- A waitlist entry always notifies the account owner.  This prevents one member
-- from subscribing an arbitrary third-party email address to cancellation mail.
drop policy if exists "members manage own court waitlist" on public.court_waitlist;

create policy "members manage own court waitlist"
on public.court_waitlist
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and lower(booking_email) = lower(coalesce((select login_email from public.profiles where id = auth.uid()), ''))
);
