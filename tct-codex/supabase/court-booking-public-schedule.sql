-- The public calendar reveals only occupied times, never names or contact data.
grant execute on function public.get_court_schedule(date, public.court_kind) to anon;
