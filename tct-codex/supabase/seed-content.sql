-- Optional: run once to make the existing verified price cards editable in Supabase.
insert into public.club_content (key, value)
values (
  'membership',
  '{"items":[{"name":"Aktive Mitglieder","price":"295 €","monthly":"42,00 € / Monat*"},{"name":"Ehepaare · pro Person","price":"245 €","monthly":"35,00 € / Monat*"},{"name":"Studierende · 18–28 Jahre","price":"120 €","monthly":"17,00 € / Monat*"},{"name":"Jugendliche · bis 18 Jahre","price":"105 €","monthly":"15,00 € / Monat*"}]}'::jsonb
)
on conflict (key) do nothing;
