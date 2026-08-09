-- Fix: club_content has a primary key named "key", not "id".
-- This replacement keeps the audit trigger compatible with every audited table.
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
