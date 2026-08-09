select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'club_content'
order by ordinal_position;
