-- Run this AFTER user-roles-enum.sql. This defines the secure TCT role model.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists login_email text;
alter table public.profiles add column if not exists must_change_password boolean not null default true;
alter table public.profiles add column if not exists tutorial_completed boolean not null default false;
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select (auth.jwt() ->> 'email') = 'elfinko008@icloud.com'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'management');
$$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('management', 'admin', 'editor', 'tournament_manager', 'team_manager', 'content_manager'));
$$;

-- The owner can see all profiles; each person can only see their own profile.
drop policy if exists "profiles readable by self" on public.profiles;
drop policy if exists "profiles visible to owner or self" on public.profiles;
create policy "profiles visible to owner or self" on public.profiles for select
using (auth.uid() = id or public.is_owner());

-- Each authenticated person may clear only their own first-login marker.
create or replace function public.complete_initial_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set must_change_password = false where id = auth.uid();
end;
$$;
revoke all on function public.complete_initial_password_change() from public;
grant execute on function public.complete_initial_password_change() to authenticated;

create or replace function public.complete_platform_tutorial()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set tutorial_completed = true where id = auth.uid();
end;
$$;
revoke all on function public.complete_platform_tutorial() from public;
grant execute on function public.complete_platform_tutorial() to authenticated;

-- Keep the content permissions explicit. The browser alone cannot elevate a role.
drop policy if exists "editors manage news" on public.news;
drop policy if exists "news managed by editorial roles" on public.news;
create policy "news managed by editorial roles" on public.news for all
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('management', 'admin', 'editor', 'content_manager')))
with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('management', 'admin', 'editor', 'content_manager')));

drop policy if exists "editors manage events" on public.events;
drop policy if exists "events managed by event roles" on public.events;
create policy "events managed by event roles" on public.events for all
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('management', 'admin', 'editor', 'tournament_manager')))
with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('management', 'admin', 'editor', 'tournament_manager')));

drop policy if exists "editors manage club content" on public.club_content;
drop policy if exists "club content managed by permitted roles" on public.club_content;
create policy "club content managed by permitted roles" on public.club_content for all
using (exists (select 1 from public.profiles where id = auth.uid() and (role in ('management', 'admin', 'editor', 'content_manager') or (role = 'team_manager' and club_content.key = 'teams') or (role = 'programmer' and club_content.key = 'site_theme'))))
with check (exists (select 1 from public.profiles where id = auth.uid() and (role in ('management', 'admin', 'editor', 'content_manager') or (role = 'team_manager' and club_content.key = 'teams') or (role = 'programmer' and club_content.key = 'site_theme'))));
