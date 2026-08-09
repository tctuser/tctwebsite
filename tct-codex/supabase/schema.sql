-- Run this once in Supabase Dashboard → SQL Editor.
-- It keeps public club content readable, while content changes require an admin/editor account.

create type public.editor_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.editor_role not null default 'editor',
  display_name text,
  created_at timestamptz not null default now()
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  excerpt text,
  body text,
  category text,
  image_path text,
  source_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  category text,
  description text,
  image_path text,
  external_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor'));
$$;

alter table public.profiles enable row level security;
alter table public.news enable row level security;
alter table public.club_content enable row level security;
alter table public.events enable row level security;

create policy "profiles readable by self" on public.profiles for select using (auth.uid() = id);
create policy "public sees published news" on public.news for select using (status = 'published');
create policy "editors manage news" on public.news for all using (public.is_editor()) with check (public.is_editor());
create policy "public reads club content" on public.club_content for select using (true);
create policy "editors manage club content" on public.club_content for all using (public.is_editor()) with check (public.is_editor());
create policy "public sees published events" on public.events for select using (status = 'published');
create policy "editors manage events" on public.events for all using (public.is_editor()) with check (public.is_editor());

-- Create this bucket in Storage as "club-media". Use Storage policies that allow public read
-- only if you want public images, and editor-only upload/delete. Do not use a secret key in the browser.
