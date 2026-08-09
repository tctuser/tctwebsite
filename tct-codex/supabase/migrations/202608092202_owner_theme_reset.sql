-- The nominated owner can always restore the protected TCT design defaults,
-- even if their editable profile role changes later.  Authentication and the
-- exact e-mail check happen inside Postgres; RLS cannot be bypassed by clients.
create or replace function public.reset_site_theme_to_default()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  default_theme jsonb := jsonb_build_object(
    'headingFont', 'dm-serif',
    'bodyFont', 'manrope',
    'darkColor', '#112e25',
    'deepDarkColor', '#0b211a',
    'accentColor', '#cef166',
    'backgroundColor', '#f5f3ee'
  );
begin
  if actor_id is null or actor_email <> 'elfinko008@icloud.com' then
    raise exception 'Only the nominated owner can restore the TCT design defaults';
  end if;

  insert into public.club_content (key, value, updated_by, updated_at)
  values ('site_theme', jsonb_build_object('settings', default_theme), actor_id, now())
  on conflict (key) do update
  set value = excluded.value,
      updated_by = actor_id,
      updated_at = now();

  return default_theme;
end;
$$;

revoke all on function public.reset_site_theme_to_default() from public;
revoke all on function public.reset_site_theme_to_default() from anon;
grant execute on function public.reset_site_theme_to_default() to authenticated;
