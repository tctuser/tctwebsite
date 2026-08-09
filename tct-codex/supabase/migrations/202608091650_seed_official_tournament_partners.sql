-- Official sponsor strip shown on the TCT ITF tournament page in 2025.
-- The record is only seeded when the admin has not already created a partner list.
do $$
declare
  owner_id uuid;
  existing_items jsonb;
begin
  select id into owner_id
  from public.profiles
  where lower(login_email) = 'elfinko008@icloud.com'
  limit 1;

  select value -> 'items' into existing_items
  from public.club_content
  where key = 'partners';

  if existing_items is null or jsonb_typeof(existing_items) <> 'array' or jsonb_array_length(existing_items) = 0 then
    insert into public.club_content (key, value, updated_by)
    values (
      'partners',
      jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('id', 'etges-daechert', 'name', 'Etges & Dächert Baustoffe', 'website', 'https://etges-daechert.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'loehr-gruppe', 'name', 'LöhrGruppe', 'website', 'https://www.loehrgruppe.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'bitburger', 'name', 'Bitburger', 'website', 'https://www.bitburger.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'volksbank-trier-eifel', 'name', 'Volksbank Trier Eifel eG', 'website', 'https://www.volksbank-trier-eifel.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'moback', 'name', 'Bäckerei Moback', 'website', 'https://www.moback.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'swt', 'name', 'SWT Stadtwerke Trier', 'website', 'https://www.swt.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'tennisverband-rlp', 'name', 'Tennisverband Rheinland-Pfalz', 'website', 'https://www.rlp-tennis.de/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'wilson', 'name', 'Wilson', 'website', 'https://www.wilson.com/', 'logo', '', 'note', 'Turnierpartner 2025'),
        jsonb_build_object('id', 'augenarztpraxis-langefeld', 'name', 'Augenärzte Langefeld & Kollegen', 'website', 'https://www.augenarztpraxis-trier.de/', 'logo', '', 'note', 'Turnierpartner 2025')
      )),
      owner_id
    )
    on conflict (key) do update
      set value = excluded.value,
          updated_by = excluded.updated_by,
          updated_at = now();
  end if;
end $$;
