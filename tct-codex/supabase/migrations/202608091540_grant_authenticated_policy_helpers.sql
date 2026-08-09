-- RLS policies evaluate these helpers in the caller context, so signed-in
-- users need EXECUTE. Anonymous visitors remain excluded.

grant execute on function public.is_booking_admin() to authenticated;
grant execute on function public.is_booking_privileged() to authenticated;
grant execute on function public.is_editor() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.is_tournament_inbox_manager() to authenticated;
