-- Run this once before deploying member-registration.
-- Keep this migration separate: PostgreSQL commits new enum values only afterwards.
alter type public.editor_role add value if not exists 'member';
