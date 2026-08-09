-- Explicitly opt in to online registration for each admin-created event.
alter table public.events add column if not exists registration_enabled boolean not null default false;

comment on column public.events.registration_enabled is
  'Only events with true may present the online registration option; false leaves questions available.';
