-- Padel is a separate bookable court, shown in its own category.
insert into public.courts (name, kind, area, sort_order, active)
values ('Padelplatz', 'padel', 'outdoor', 16, true)
on conflict (name) do update set active = true, kind = excluded.kind, area = excluded.area, sort_order = excluded.sort_order;
