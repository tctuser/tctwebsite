-- Some older setup scripts had explicit grants for anon/authenticated.
-- Reset those grants and add back only the RPCs called by the signed-in UI.

revoke all on function public.book_court(uuid, timestamptz, integer, text) from anon, authenticated;
revoke all on function public.book_court(uuid, timestamptz, integer, text, text) from anon, authenticated;
revoke all on function public.book_multiple_courts(uuid[], timestamptz, integer, text, text) from anon, authenticated;
revoke all on function public.cancel_own_booking(uuid) from anon, authenticated;
revoke all on function public.cancel_own_booking_with_email(uuid) from anon, authenticated;
revoke all on function public.complete_initial_password_change() from anon, authenticated;
revoke all on function public.complete_platform_tutorial() from anon, authenticated;
revoke all on function public.create_court_block(uuid, timestamptz, timestamptz, text, text, integer) from anon, authenticated;
revoke all on function public.create_court_blocks(uuid[], timestamptz, timestamptz, text, text, integer) from anon, authenticated;
revoke all on function public.get_court_schedule(date, public.court_kind) from anon, authenticated;
revoke all on function public.is_booking_admin() from anon, authenticated;
revoke all on function public.is_booking_privileged() from anon, authenticated;
revoke all on function public.is_editor() from anon, authenticated;
revoke all on function public.is_owner() from anon, authenticated;
revoke all on function public.is_tournament_inbox_manager() from anon, authenticated;
revoke all on function public.require_verified_member_booking() from anon, authenticated;
revoke all on function public.undo_audit_change(uuid) from anon, authenticated;
revoke all on function public.write_audit_log() from anon, authenticated;

grant execute on function public.book_court(uuid, timestamptz, integer, text, text) to authenticated;
grant execute on function public.book_multiple_courts(uuid[], timestamptz, integer, text, text) to authenticated;
grant execute on function public.cancel_own_booking_with_email(uuid) to authenticated;
grant execute on function public.complete_initial_password_change() to authenticated;
grant execute on function public.complete_platform_tutorial() to authenticated;
grant execute on function public.create_court_blocks(uuid[], timestamptz, timestamptz, text, text, integer) to authenticated;
grant execute on function public.get_court_schedule(date, public.court_kind) to authenticated;
grant execute on function public.undo_audit_change(uuid) to authenticated;
