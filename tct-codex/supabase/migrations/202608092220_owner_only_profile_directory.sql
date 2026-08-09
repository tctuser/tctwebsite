-- Personal member data is visible to the account itself and to the nominated
-- TCT owner only. Management keeps its content permissions, but it cannot use
-- the profiles table as a member directory.
drop policy if exists "profiles readable by self" on public.profiles;
drop policy if exists "profiles visible to owner or self" on public.profiles;
drop policy if exists "profiles visible to nominated owner or self" on public.profiles;

create policy "profiles visible to nominated owner or self"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'elfinko008@icloud.com'
);
