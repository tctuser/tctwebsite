-- TCT change log and protected undo
-- Run once in Supabase Dashboard → SQL Editor after schema.sql.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null check (table_name in ('news', 'events', 'club_content')),
  row_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- Safe when upgrading an audit_log table created by an earlier version.
alter table public.audit_log add column if not exists actor_email text;

alter table public.audit_log enable row level security;
alter table public.audit_log drop constraint if exists audit_log_table_name_check;
alter table public.audit_log add constraint audit_log_table_name_check check (table_name in ('news', 'events', 'club_content', 'profiles', 'contact_messages'));

-- Only the nominated owner can even read the protocol via the public API.
drop policy if exists "owner reads audit log" on public.audit_log;
create policy "owner reads audit log" on public.audit_log for select
using (public.is_owner());

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  key_value text;
begin
  if current_setting('tct.skip_audit', true) = 'true' then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'club_content' then
    key_value := coalesce(new.key, old.key);
  else
    key_value := coalesce(new.id::text, old.id::text);
  end if;

  insert into public.audit_log (actor_id, action, table_name, row_id, actor_email, before_data, after_data)
  values (auth.uid(), tg_op, tg_table_name, key_value, auth.jwt() ->> 'email', to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_news on public.news;
create trigger audit_news after insert or update or delete on public.news
for each row execute function public.write_audit_log();
drop trigger if exists audit_events on public.events;
create trigger audit_events after insert or update or delete on public.events
for each row execute function public.write_audit_log();
drop trigger if exists audit_club_content on public.club_content;
create trigger audit_club_content after insert or update or delete on public.club_content
for each row execute function public.write_audit_log();
drop trigger if exists audit_contact_messages on public.contact_messages;
create trigger audit_contact_messages after insert or update or delete on public.contact_messages
for each row execute function public.write_audit_log();

-- Restores an entire previous record (or removes a newly-created one). The database,
-- not only the UI, blocks everybody except the nominated owner.
create or replace function public.undo_audit_change(change_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  change_row public.audit_log;
begin
  if not public.is_owner() then
    raise exception 'Not authorized to undo changes';
  end if;

  select * into change_row from public.audit_log where id = change_id;
  if not found then raise exception 'Change not found'; end if;

  perform set_config('tct.skip_audit', 'true', true);

  if change_row.table_name = 'news' then
    if change_row.action = 'INSERT' then
      delete from public.news where id = change_row.row_id::uuid;
    else
      delete from public.news where id = change_row.row_id::uuid;
      insert into public.news select * from jsonb_populate_record(null::public.news, change_row.before_data);
    end if;
  elsif change_row.table_name = 'events' then
    if change_row.action = 'INSERT' then
      delete from public.events where id = change_row.row_id::uuid;
    else
      delete from public.events where id = change_row.row_id::uuid;
      insert into public.events select * from jsonb_populate_record(null::public.events, change_row.before_data);
    end if;
  elsif change_row.table_name = 'club_content' then
    if change_row.action = 'INSERT' then
      delete from public.club_content where key = change_row.row_id;
    else
      delete from public.club_content where key = change_row.row_id;
      insert into public.club_content select * from jsonb_populate_record(null::public.club_content, change_row.before_data);
    end if;
  elsif change_row.table_name = 'profiles' or change_row.table_name = 'contact_messages' then
    raise exception 'User accounts and contact messages cannot be restored automatically';
  end if;
end;
$$;

revoke all on function public.undo_audit_change(uuid) from public;
grant execute on function public.undo_audit_change(uuid) to authenticated;
