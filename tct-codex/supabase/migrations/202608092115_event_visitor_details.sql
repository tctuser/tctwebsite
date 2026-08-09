alter table public.events
  add column if not exists spectators_allowed boolean not null default false,
  add column if not exists admission_price_cents integer,
  add column if not exists venue_name text,
  add column if not exists venue_address text;

alter table public.events drop constraint if exists events_admission_price_cents_check;
alter table public.events add constraint events_admission_price_cents_check
  check (admission_price_cents is null or admission_price_cents >= 0);

comment on column public.events.spectators_allowed is
  'Whether visitors may attend the event.';
comment on column public.events.admission_price_cents is
  'Admission price in euro cents. Zero means free admission; null means no published price.';
comment on column public.events.venue_name is
  'Human-readable venue, for example TC Trier 1888 e.V.';
comment on column public.events.venue_address is
  'Full address used to build the public Google Maps navigation link.';

