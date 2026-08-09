select p.id, p.role
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'elfinko008@icloud.com';
