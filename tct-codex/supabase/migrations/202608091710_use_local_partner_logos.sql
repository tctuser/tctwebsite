-- Locally hosted logo files supplied or approved for the TCT partner section.
update public.club_content
set value = jsonb_build_object(
  'items',
  (
    select jsonb_agg(
      case item ->> 'id'
        when 'etges-daechert' then jsonb_set(item, '{logo}', to_jsonb('/partner-logos/etges-daechert.png'::text))
        when 'loehr-gruppe' then jsonb_set(item, '{logo}', to_jsonb('/partner-logos/loehr-gruppe.jpg'::text))
        when 'volksbank-trier-eifel' then jsonb_set(item, '{logo}', to_jsonb('/partner-logos/volksbank-trier-eifel.png'::text))
        when 'wilson' then jsonb_set(item, '{logo}', to_jsonb('/partner-logos/wilson.png'::text))
        else item
      end
    )
    from jsonb_array_elements(value -> 'items') as item
  )
)
where key = 'partners';
