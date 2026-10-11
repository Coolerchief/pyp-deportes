-- Smoke test: pgTAP runs against the target database. Security tests 1–8 arrive in T1.3–T1.4.
begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

select has_schema('public', 'public schema exists');
select ok(current_setting('server_version_num')::int >= 150000, 'Postgres 15 or newer');

select * from finish();
rollback;
