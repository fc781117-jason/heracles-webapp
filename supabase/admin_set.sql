-- Run AFTER the admin email has logged in at least once
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = 'fc781117@gmail.com';
