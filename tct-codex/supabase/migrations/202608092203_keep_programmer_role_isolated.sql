-- Programmer is a dashboard role, but deliberately not a general editor.
-- Its only database write permission is the site_theme row policy above.
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('management', 'admin', 'editor', 'tournament_manager', 'team_manager', 'content_manager')
  );
$$;
