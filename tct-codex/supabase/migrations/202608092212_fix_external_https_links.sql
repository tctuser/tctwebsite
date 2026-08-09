-- Safari rejects the bare Etges & Daechert host during TLS negotiation. The
-- canonical www host has a valid certificate and serves the same official site.
update public.club_content
set value = jsonb_set(
  value,
  '{items}',
  coalesce(
    (
      select jsonb_agg(
        case
          when lower(item ->> 'name') like 'etges%'
            then jsonb_set(item, '{website}', to_jsonb('https://www.etges-daechert.de/'::text), true)
          else item
        end
      )
      from jsonb_array_elements(value -> 'items') as item
    ),
    '[]'::jsonb
  ),
  true
)
where key = 'partners'
  and jsonb_typeof(value -> 'items') = 'array';
