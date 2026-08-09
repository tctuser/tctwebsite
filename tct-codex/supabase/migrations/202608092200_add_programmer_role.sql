-- Keep enum expansion in its own transaction. PostgreSQL requires the new
-- value to be committed before policies can reference it.
alter type public.editor_role add value if not exists 'programmer';
