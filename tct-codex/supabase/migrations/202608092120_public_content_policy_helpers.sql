-- Public SELECT policies for published news/events coexist with management
-- policies that call these boolean helpers. PostgreSQL must be allowed to
-- evaluate every referenced policy function, even though both helpers return
-- false for an anonymous request. This grants evaluation only, never write
-- access or an authenticated role.
grant execute on function public.is_owner() to anon;
grant execute on function public.is_editor() to anon;

