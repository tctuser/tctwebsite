insert into public.club_content (key, value)
values (
  'site_theme',
  jsonb_build_object(
    'settings',
    jsonb_build_object(
      'headingFont', 'dm-serif',
      'bodyFont', 'manrope',
      'darkColor', '#112e25',
      'deepDarkColor', '#0b211a',
      'accentColor', '#cef166',
      'backgroundColor', '#f5f3ee'
    )
  )
)
on conflict (key) do nothing;

drop policy if exists "club content managed by permitted roles" on public.club_content;
create policy "club content managed by permitted roles"
on public.club_content
for all
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role in ('management', 'admin', 'editor', 'content_manager')
        or (role = 'team_manager' and club_content.key = 'teams')
        or (role = 'programmer' and club_content.key = 'site_theme')
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role in ('management', 'admin', 'editor', 'content_manager')
        or (role = 'team_manager' and club_content.key = 'teams')
        or (role = 'programmer' and club_content.key = 'site_theme')
      )
  )
);
