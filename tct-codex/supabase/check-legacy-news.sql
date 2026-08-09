select
  count(*) as total_news,
  count(*) filter (where source_url like 'legacy-wordpress:%') as imported_legacy_news
from public.news;

select count(*) as legacy_articles_with_galleries
from public.club_content,
  jsonb_object_keys(coalesce(value -> 'items', '{}'::jsonb))
where key = 'legacy_news_images';
