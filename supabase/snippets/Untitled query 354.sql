select 
  email,
  is_sso_user,
  encrypted_password is not null as has_password,
  email_confirmed_at is not null as email_confirmed
from auth.users 
where email = 'tanpura.pavi@gmail.com';