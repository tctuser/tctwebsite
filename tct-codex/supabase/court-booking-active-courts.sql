-- Replace the provisional court list with the courts shown in the previous TCT system.
update public.courts set active = false, sort_order = sort_order + 1000;
insert into public.courts (name, kind, area, sort_order, active) values
  ('Außenplatz CC', 'tennis', 'outdoor', 1, true),
  ('Außenplatz 1', 'tennis', 'outdoor', 2, true),
  ('Außenplatz 2', 'tennis', 'outdoor', 3, true),
  ('Außenplatz 3', 'tennis', 'outdoor', 4, true),
  ('Außenplatz 4', 'tennis', 'outdoor', 5, true),
  ('Außenplatz 5', 'tennis', 'outdoor', 6, true),
  ('Außenplatz 10', 'tennis', 'outdoor', 7, true),
  ('Außenplatz 11', 'tennis', 'outdoor', 8, true),
  ('Außenplatz 16', 'tennis', 'outdoor', 9, true),
  ('Außenplatz 17', 'tennis', 'outdoor', 10, true),
  ('Außenplatz 18', 'tennis', 'outdoor', 11, true),
  ('Außenplatz 19', 'tennis', 'outdoor', 12, true),
  ('Außenplatz 20', 'tennis', 'outdoor', 13, true),
  ('Außenplatz 21', 'tennis', 'outdoor', 14, true),
  ('Außenplatz 22', 'tennis', 'outdoor', 15, true),
  ('Padelplatz', 'padel', 'outdoor', 16, true)
on conflict (name) do update set active = excluded.active, sort_order = excluded.sort_order, kind = excluded.kind, area = excluded.area;
