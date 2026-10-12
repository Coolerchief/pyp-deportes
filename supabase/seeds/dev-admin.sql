-- Development admin (docs/05-BACKEND-SCHEMA.md §11, item 6): only pyp-dev and the CI database load
-- this file (config.toml); production never does. Its first admin comes from db-production.yml.
-- No password here: the repository is public. `pnpm db:reset` sets it afterwards from
-- SUPABASE_DEV_ADMIN_PASSWORD in .env.local; without it the user exists but cannot sign in.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000ad01',
  'authenticated', 'authenticated', 'admin@pyp.test', '', now(),
  '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin de desarrollo"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
values (
  gen_random_uuid(), '00000000-0000-4000-8000-00000000ad01', '00000000-0000-4000-8000-00000000ad01',
  'email',
  '{"sub": "00000000-0000-4000-8000-00000000ad01", "email": "admin@pyp.test", "email_verified": true}',
  now(), now()
);

insert into public.staff_members (user_id, role, full_name)
values ('00000000-0000-4000-8000-00000000ad01', 'admin', 'Admin de desarrollo');
