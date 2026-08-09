begin;
insert into public.club_content (key, value)
values ('_tct_audit_trigger_check', '{"ok":true}'::jsonb)
on conflict (key) do update set value = excluded.value;
rollback;
