-- ============================================================
-- DOR-AIOS-HBOG-CLEAN-STAGING-BOOTSTRAP-R1
--
-- Bootstrap every table required by the public site and staff flows, then
-- apply the verified inquiry/profile security gate. The migration is
-- intentionally safe to re-run and supports both an empty Supabase database
-- and the currently observed production-shaped schema.
--
-- Existing department rows are preserved. Because the observed production
-- table predates its content columns, newly added content fields remain
-- nullable there; a fresh database still requires department names.
-- ============================================================

begin;

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  preacher text not null,
  description text,
  video_url text,
  audio_url text,
  thumbnail_url text,
  category text default 'General',
  duration text,
  date_preached date default current_date,
  is_featured boolean default false,
  youtube_url text
);

alter table public.sermons add column if not exists id uuid default gen_random_uuid();
alter table public.sermons add column if not exists created_at timestamptz default now();
alter table public.sermons add column if not exists title text;
alter table public.sermons add column if not exists preacher text;
alter table public.sermons add column if not exists description text;
alter table public.sermons add column if not exists video_url text;
alter table public.sermons add column if not exists audio_url text;
alter table public.sermons add column if not exists thumbnail_url text;
alter table public.sermons add column if not exists category text default 'General';
alter table public.sermons add column if not exists duration text;
alter table public.sermons add column if not exists date_preached date default current_date;
alter table public.sermons add column if not exists is_featured boolean default false;
alter table public.sermons add column if not exists youtube_url text;
alter table public.sermons alter column id set default gen_random_uuid();
alter table public.sermons alter column created_at set default now();
alter table public.sermons alter column category set default 'General';
alter table public.sermons alter column date_preached set default current_date;
alter table public.sermons alter column is_featured set default false;

do $$
begin
  if exists (select 1 from public.sermons where title is null or preacher is null) then
    raise exception 'public.sermons contains rows incompatible with the required media contract';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sermons'::regclass and contype = 'p'
  ) then
    alter table public.sermons add primary key (id);
  end if;
end
$$;

alter table public.sermons alter column title set not null;
alter table public.sermons alter column preacher set not null;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  description text,
  event_date timestamptz not null,
  location text default 'Online / Main Sanctuary',
  image_url text,
  registration_link text,
  is_highlighted boolean default false,
  recurrence text default 'one-time',
  end_date timestamptz
);

alter table public.events add column if not exists id uuid default gen_random_uuid();
alter table public.events add column if not exists created_at timestamptz default now();
alter table public.events add column if not exists name text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists event_date timestamptz;
alter table public.events add column if not exists location text default 'Online / Main Sanctuary';
alter table public.events add column if not exists image_url text;
alter table public.events add column if not exists registration_link text;
alter table public.events add column if not exists is_highlighted boolean default false;
alter table public.events add column if not exists recurrence text default 'one-time';
alter table public.events add column if not exists end_date timestamptz;
alter table public.events alter column id set default gen_random_uuid();
alter table public.events alter column created_at set default now();
alter table public.events alter column location set default 'Online / Main Sanctuary';
alter table public.events alter column is_highlighted set default false;
alter table public.events alter column recurrence set default 'one-time';

do $$
begin
  if exists (select 1 from public.events where name is null or event_date is null) then
    raise exception 'public.events contains rows incompatible with the required calendar contract';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and contype = 'p'
  ) then
    alter table public.events add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_recurrence_check'
  ) then
    alter table public.events add constraint events_recurrence_check
      check (recurrence in ('one-time', 'weekly', 'monthly', 'quarterly', 'yearly'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'unique_event_name_date'
  ) then
    alter table public.events add constraint unique_event_name_date unique (name, event_date);
  end if;
end
$$;

alter table public.events alter column name set not null;
alter table public.events alter column event_date set not null;

create table if not exists public.pulse (
  id integer primary key check (id = 1),
  is_live boolean default false,
  active_event_id uuid references public.events(id),
  sermon_of_the_day_id uuid references public.sermons(id),
  updated_at timestamptz default now()
);

alter table public.pulse add column if not exists id integer;
alter table public.pulse add column if not exists is_live boolean default false;
alter table public.pulse add column if not exists active_event_id uuid;
alter table public.pulse add column if not exists sermon_of_the_day_id uuid;
alter table public.pulse add column if not exists updated_at timestamptz default now();
alter table public.pulse alter column is_live set default false;
alter table public.pulse alter column updated_at set default now();

do $$
begin
  if exists (select 1 from public.pulse where id <> 1 or id is null) then
    raise exception 'public.pulse contains rows incompatible with the singleton contract';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pulse'::regclass and contype = 'p'
  ) then
    alter table public.pulse add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pulse'::regclass and conname = 'pulse_id_check'
  ) then
    alter table public.pulse add constraint pulse_id_check check (id = 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pulse'::regclass and conname = 'pulse_active_event_id_fkey'
  ) then
    alter table public.pulse add constraint pulse_active_event_id_fkey
      foreign key (active_event_id) references public.events(id) not valid;
    alter table public.pulse validate constraint pulse_active_event_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pulse'::regclass and conname = 'pulse_sermon_of_the_day_id_fkey'
  ) then
    alter table public.pulse add constraint pulse_sermon_of_the_day_id_fkey
      foreign key (sermon_of_the_day_id) references public.sermons(id) not valid;
    alter table public.pulse validate constraint pulse_sermon_of_the_day_id_fkey;
  end if;
end
$$;

create index if not exists pulse_active_event_id_idx on public.pulse (active_event_id);
create index if not exists pulse_sermon_of_the_day_id_idx on public.pulse (sermon_of_the_day_id);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  currency text not null,
  amount numeric not null,
  frequency text not null,
  payment_method text not null,
  status text not null default 'completed',
  reference text,
  donor_email text,
  donor_name text
);

alter table public.donations add column if not exists id uuid default gen_random_uuid();
alter table public.donations add column if not exists created_at timestamptz default now();
alter table public.donations add column if not exists currency text;
alter table public.donations add column if not exists amount numeric;
alter table public.donations add column if not exists frequency text;
alter table public.donations add column if not exists payment_method text;
alter table public.donations add column if not exists status text default 'completed';
alter table public.donations add column if not exists reference text;
alter table public.donations add column if not exists donor_email text;
alter table public.donations add column if not exists donor_name text;
alter table public.donations alter column id set default gen_random_uuid();
alter table public.donations alter column created_at set default now();
alter table public.donations alter column status set default 'completed';

do $$
begin
  if exists (
    select 1 from public.donations
    where currency is null or btrim(currency) = ''
       or amount is null or amount <= 0
       or frequency is null or btrim(frequency) = ''
       or payment_method is null or btrim(payment_method) = ''
       or status is null or status not in ('pending', 'completed')
  ) then
    raise exception 'public.donations contains rows incompatible with the required giving contract';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donations'::regclass and contype = 'p'
  ) then
    alter table public.donations add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donations'::regclass and conname = 'donations_amount_check'
  ) then
    alter table public.donations add constraint donations_amount_check check (amount > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donations'::regclass and conname = 'donations_status_check'
  ) then
    alter table public.donations add constraint donations_status_check
      check (status in ('pending', 'completed'));
  end if;
end
$$;

alter table public.donations alter column currency set not null;
alter table public.donations alter column amount set not null;
alter table public.donations alter column frequency set not null;
alter table public.donations alter column payment_method set not null;
alter table public.donations alter column status set not null;

create unique index if not exists donations_reference_unique_idx
  on public.donations (reference)
  where reference is not null;

do $$
declare
  role_labels text[];
begin
  if not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'app_role'
  ) then
    create type public.app_role as enum ('owner', 'pastor', 'manager', 'leader');
  elsif not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'app_role'
      and pg_type.typtype = 'e'
  ) then
    raise exception 'public.app_role exists but is not an enum';
  else
    select array_agg(pg_enum.enumlabel order by pg_enum.enumsortorder)
      into role_labels
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'app_role';

    if role_labels is distinct from array['owner', 'pastor', 'manager', 'leader']::text[] then
      raise exception 'public.app_role has incompatible labels: %', role_labels;
    end if;
  end if;
end
$$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  description text,
  what_they_do text,
  who_should_join text,
  cta_text text,
  display_order integer not null default 0
);

alter table public.departments add column if not exists id uuid default gen_random_uuid();
alter table public.departments add column if not exists created_at timestamptz default now();
alter table public.departments add column if not exists name text;
alter table public.departments add column if not exists description text;
alter table public.departments add column if not exists what_they_do text;
alter table public.departments add column if not exists who_should_join text;
alter table public.departments add column if not exists cta_text text;
alter table public.departments add column if not exists display_order integer not null default 0;
alter table public.departments alter column id set default gen_random_uuid();
alter table public.departments alter column created_at set default now();
alter table public.departments alter column display_order set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.departments'::regclass and contype = 'p'
  ) then
    alter table public.departments add primary key (id);
  end if;
end
$$;

create unique index if not exists departments_name_unique_idx
  on public.departments (name)
  where name is not null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role default 'leader',
  department_id uuid references public.departments(id),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role public.app_role default 'leader';
alter table public.profiles add column if not exists department_id uuid;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles alter column role set default 'leader';
alter table public.profiles alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'p'
  ) then
    alter table public.profiles add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
    alter table public.profiles validate constraint profiles_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_department_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_department_id_fkey
      foreign key (department_id) references public.departments(id) not valid;
    alter table public.profiles validate constraint profiles_department_id_fkey;
  end if;
end
$$;

create index if not exists profiles_department_id_idx
  on public.profiles (department_id);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  full_name text not null,
  email text not null,
  type text not null,
  message text,
  status text not null default 'pending',
  phone text,
  category text,
  confidential boolean default false,
  area text,
  visit_type text,
  invited_by text,
  prayer_need text
);

alter table public.inquiries add column if not exists id uuid default gen_random_uuid();
alter table public.inquiries add column if not exists created_at timestamptz default now();
alter table public.inquiries add column if not exists full_name text;
alter table public.inquiries add column if not exists email text;
alter table public.inquiries add column if not exists type text;
alter table public.inquiries add column if not exists message text;
alter table public.inquiries add column if not exists status text default 'pending';
alter table public.inquiries add column if not exists phone text;
alter table public.inquiries add column if not exists category text;
alter table public.inquiries add column if not exists confidential boolean default false;
alter table public.inquiries add column if not exists area text;
alter table public.inquiries add column if not exists visit_type text;
alter table public.inquiries add column if not exists invited_by text;
alter table public.inquiries add column if not exists prayer_need text;
alter table public.inquiries alter column id set default gen_random_uuid();
alter table public.inquiries alter column created_at set default now();
alter table public.inquiries alter column status set default 'pending';
alter table public.inquiries alter column confidential set default false;

do $$
begin
  if exists (
    select 1 from public.inquiries
    where full_name is null or email is null or type is null or status is null
       or status not in ('pending', 'reviewed', 'contacted')
  ) then
    raise exception 'public.inquiries contains rows incompatible with the required intake contract';
  end if;
end
$$;

alter table public.inquiries alter column full_name set not null;
alter table public.inquiries alter column email set not null;
alter table public.inquiries alter column type set not null;
alter table public.inquiries alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.inquiries'::regclass and contype = 'p'
  ) then
    alter table public.inquiries add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.inquiries'::regclass and conname = 'inquiries_status_check'
  ) then
    alter table public.inquiries
      add constraint inquiries_status_check
      check (status in ('pending', 'reviewed', 'contacted'));
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from (values
      ('sermons', 'id', 'uuid'),
      ('sermons', 'created_at', 'timestamptz'),
      ('sermons', 'title', 'text'),
      ('sermons', 'preacher', 'text'),
      ('sermons', 'description', 'text'),
      ('sermons', 'video_url', 'text'),
      ('sermons', 'audio_url', 'text'),
      ('sermons', 'thumbnail_url', 'text'),
      ('sermons', 'category', 'text'),
      ('sermons', 'duration', 'text'),
      ('sermons', 'date_preached', 'date'),
      ('sermons', 'is_featured', 'bool'),
      ('sermons', 'youtube_url', 'text'),
      ('events', 'id', 'uuid'),
      ('events', 'created_at', 'timestamptz'),
      ('events', 'name', 'text'),
      ('events', 'description', 'text'),
      ('events', 'event_date', 'timestamptz'),
      ('events', 'location', 'text'),
      ('events', 'image_url', 'text'),
      ('events', 'registration_link', 'text'),
      ('events', 'is_highlighted', 'bool'),
      ('events', 'recurrence', 'text'),
      ('events', 'end_date', 'timestamptz'),
      ('pulse', 'id', 'int4'),
      ('pulse', 'is_live', 'bool'),
      ('pulse', 'active_event_id', 'uuid'),
      ('pulse', 'sermon_of_the_day_id', 'uuid'),
      ('pulse', 'updated_at', 'timestamptz'),
      ('departments', 'id', 'uuid'),
      ('departments', 'created_at', 'timestamptz'),
      ('departments', 'name', 'text'),
      ('departments', 'description', 'text'),
      ('departments', 'what_they_do', 'text'),
      ('departments', 'who_should_join', 'text'),
      ('departments', 'cta_text', 'text'),
      ('departments', 'display_order', 'int4'),
      ('profiles', 'id', 'uuid'),
      ('profiles', 'full_name', 'text'),
      ('profiles', 'role', 'app_role'),
      ('profiles', 'department_id', 'uuid'),
      ('profiles', 'updated_at', 'timestamptz'),
      ('inquiries', 'id', 'uuid'),
      ('inquiries', 'created_at', 'timestamptz'),
      ('inquiries', 'full_name', 'text'),
      ('inquiries', 'email', 'text'),
      ('inquiries', 'type', 'text'),
      ('inquiries', 'message', 'text'),
      ('inquiries', 'status', 'text'),
      ('inquiries', 'phone', 'text'),
      ('inquiries', 'category', 'text'),
      ('inquiries', 'confidential', 'bool'),
      ('inquiries', 'area', 'text'),
      ('inquiries', 'visit_type', 'text'),
      ('inquiries', 'invited_by', 'text'),
      ('inquiries', 'prayer_need', 'text'),
      ('donations', 'id', 'uuid'),
      ('donations', 'created_at', 'timestamptz'),
      ('donations', 'currency', 'text'),
      ('donations', 'amount', 'numeric'),
      ('donations', 'frequency', 'text'),
      ('donations', 'payment_method', 'text'),
      ('donations', 'status', 'text'),
      ('donations', 'reference', 'text'),
      ('donations', 'donor_email', 'text'),
      ('donations', 'donor_name', 'text')
    ) as expected(table_name, column_name, udt_name)
    left join information_schema.columns as actual
      on actual.table_schema = 'public'
     and actual.table_name = expected.table_name
     and actual.column_name = expected.column_name
     and actual.udt_name = expected.udt_name
    where actual.column_name is null
  ) then
    raise exception 'protected table column types are incompatible with the required application contract';
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

alter table public.sermons enable row level security;
drop policy if exists "Public read access for sermons" on public.sermons;
drop policy if exists "Authenticated write access for sermons" on public.sermons;
drop policy if exists "Authenticated update access for sermons" on public.sermons;
drop policy if exists "Authenticated delete access for sermons" on public.sermons;
drop policy if exists sermons_public_select on public.sermons;
revoke all privileges on table public.sermons from public, anon, authenticated, service_role;
grant select on table public.sermons to anon, authenticated;
grant select, insert, update, delete on table public.sermons to service_role;
create policy sermons_public_select
  on public.sermons for select to anon, authenticated using (true);

alter table public.events enable row level security;
drop policy if exists "Public read access for events" on public.events;
drop policy if exists "Authenticated write access for events" on public.events;
drop policy if exists "Authenticated update access for events" on public.events;
drop policy if exists "Authenticated delete access for events" on public.events;
drop policy if exists events_public_select on public.events;
revoke all privileges on table public.events from public, anon, authenticated, service_role;
grant select on table public.events to anon, authenticated;
grant select, insert, update, delete on table public.events to service_role;
create policy events_public_select
  on public.events for select to anon, authenticated using (true);

alter table public.pulse enable row level security;
drop policy if exists "Public read access for pulse" on public.pulse;
drop policy if exists pulse_public_select on public.pulse;
revoke all privileges on table public.pulse from public, anon, authenticated, service_role;
grant select on table public.pulse to anon, authenticated;
grant select, insert, update, delete on table public.pulse to service_role;
create policy pulse_public_select
  on public.pulse for select to anon, authenticated using (true);

alter table public.donations enable row level security;
drop policy if exists "Public insert access for donations" on public.donations;
drop policy if exists donations_public_insert on public.donations;
revoke all privileges on table public.donations from public, anon, authenticated, service_role;
grant insert (
  currency, amount, frequency, payment_method, status,
  reference, donor_email, donor_name
) on table public.donations to anon, authenticated;
grant select, insert, update, delete on table public.donations to service_role;
create policy donations_public_insert
  on public.donations for insert to anon, authenticated
  with check (
    btrim(currency) <> ''
    and amount > 0
    and btrim(frequency) <> ''
    and btrim(payment_method) <> ''
    and status in ('pending', 'completed')
  );

alter table public.departments enable row level security;
drop policy if exists "Departments are viewable by authenticated users." on public.departments;
drop policy if exists "Public read access for departments" on public.departments;
drop policy if exists departments_public_select on public.departments;
revoke all privileges on table public.departments from public, anon, authenticated, service_role;
grant select on table public.departments to anon, authenticated;
grant select, insert, update, delete on table public.departments to service_role;
create policy departments_public_select
  on public.departments for select to anon, authenticated using (true);

alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can update their own profiles." on public.profiles;
drop policy if exists profiles_authenticated_select_own on public.profiles;
revoke all privileges on table public.profiles from public, anon, authenticated, service_role;
grant select (id, full_name, role, department_id, updated_at)
  on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;
create policy profiles_authenticated_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

alter table public.inquiries enable row level security;
drop policy if exists "Public insert access for inquiries" on public.inquiries;
drop policy if exists "Authenticated read access for inquiries" on public.inquiries;
drop policy if exists inquiries_public_insert on public.inquiries;
drop policy if exists inquiries_manager_select on public.inquiries;
drop policy if exists inquiries_manager_update_status on public.inquiries;
revoke all privileges on table public.inquiries from public, anon, authenticated, service_role;
grant insert (
  full_name, email, type, message, phone, category, confidential,
  area, visit_type, invited_by, prayer_need
) on table public.inquiries to anon, authenticated;
grant select on table public.inquiries to authenticated;
grant update (status) on table public.inquiries to authenticated;
grant select, insert, update, delete on table public.inquiries to service_role;

create policy inquiries_public_insert
  on public.inquiries for insert to anon, authenticated
  with check (
    btrim(full_name) <> '' and btrim(email) <> '' and btrim(type) <> ''
    and status = 'pending'
  );

create policy inquiries_manager_select
  on public.inquiries for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy inquiries_manager_update_status
  on public.inquiries for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  )
  with check (
    status in ('pending', 'reviewed', 'contacted')
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

commit;
