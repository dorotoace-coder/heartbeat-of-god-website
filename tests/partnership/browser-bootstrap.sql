create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create or replace function public.staff_workspace() returns text language sql stable as $$select coalesce(nullif(current_setting('test.workspace',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->'app_metadata'->>'workspace')$$;
grant usage on schema public to anon,authenticated,service_role;
