-- Prefer original files from the respective partner sites where a stable public
-- logo asset is available. Remaining entries continue to use the official TCT
-- sponsor strip as their visual fallback and can be replaced in the admin area.
update public.club_content
set value = jsonb_build_object(
  'items',
  (
    select jsonb_agg(
      case item ->> 'id'
        when 'bitburger' then jsonb_set(item, '{logo}', to_jsonb('https://bitburger-group.bynder.com/transform/3a71b013-d295-4f7f-9785-16e8a2dbbc44/BIT_Markenlogo_Kompact_4cS'::text))
        when 'moback' then jsonb_set(item, '{logo}', to_jsonb('https://www.moback.de/s/cc_images/teaserbox_2419771422.jpg?t=1679652960'::text))
        when 'swt' then jsonb_set(item, '{logo}', to_jsonb('https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/SWT_Logo.svg/3840px-SWT_Logo.svg.png'::text))
        when 'tennisverband-rlp' then jsonb_set(item, '{logo}', to_jsonb('https://www.rlp-tennis.de/typo3conf/ext/rlp/Resources/Public/Images/rlp-tennis.svg'::text))
        when 'augenarztpraxis-langefeld' then jsonb_set(item, '{logo}', to_jsonb('https://www.augenarztpraxis-trier.de/wp-content/uploads/2026/04/csm_logo-augenaerzte_139d1e9dfb.png'::text))
        else item
      end
    )
    from jsonb_array_elements(value -> 'items') as item
  )
)
where key = 'partners';
