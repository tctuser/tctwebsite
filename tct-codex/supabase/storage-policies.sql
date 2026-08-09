-- Run this once AFTER the bucket "club-media" exists.
-- Public visitors can view images; only authenticated TCT editors/admins can upload or delete.

create policy "public reads club media"
on storage.objects for select
using (bucket_id = 'club-media');

create policy "editors upload club media"
on storage.objects for insert to authenticated
with check (bucket_id = 'club-media' and public.is_editor());

create policy "editors update club media"
on storage.objects for update to authenticated
using (bucket_id = 'club-media' and public.is_editor())
with check (bucket_id = 'club-media' and public.is_editor());

create policy "editors delete club media"
on storage.objects for delete to authenticated
using (bucket_id = 'club-media' and public.is_editor());
