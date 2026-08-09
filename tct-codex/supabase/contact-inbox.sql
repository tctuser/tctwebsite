-- Run once in Supabase Dashboard → SQL Editor.
-- Public visitors may submit an inquiry; only TCT editors/admins can read or manage it.

create type public.contact_message_status as enum ('new', 'read', 'archived');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 254),
  message text check (char_length(coalesce(message, '')) <= 4000),
  status public.contact_message_status not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "visitors submit contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (
  status = 'new'
  and char_length(trim(name)) between 2 and 120
  and char_length(trim(email)) between 5 and 254
  and char_length(coalesce(message, '')) <= 4000
);

create policy "editors manage contact messages"
on public.contact_messages for all
to authenticated
using (public.is_editor())
with check (public.is_editor());

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
