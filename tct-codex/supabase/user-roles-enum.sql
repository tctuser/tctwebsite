-- Run this query FIRST and wait until it completed successfully.
-- PostgreSQL requires new enum values to be committed before policies may use them.
alter type public.editor_role add value if not exists 'tournament_manager';
alter type public.editor_role add value if not exists 'team_manager';
alter type public.editor_role add value if not exists 'content_manager';
alter type public.editor_role add value if not exists 'management';
