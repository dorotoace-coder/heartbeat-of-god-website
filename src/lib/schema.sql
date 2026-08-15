-- Heartbeat of God Ministry - Database Schema

-- Staff authorization roles. Fail closed if an incompatible object already
-- owns this name rather than silently widening or converting its semantics.
DO $$
DECLARE
  role_labels TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('owner', 'pastor', 'manager', 'leader');
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'app_role'
      AND pg_type.typtype = 'e'
  ) THEN
    RAISE EXCEPTION 'public.app_role exists but is not an enum';
  ELSE
    SELECT array_agg(pg_enum.enumlabel ORDER BY pg_enum.enumsortorder)
      INTO role_labels
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'app_role';

    IF role_labels IS DISTINCT FROM ARRAY['owner', 'pastor', 'manager', 'leader']::TEXT[] THEN
      RAISE EXCEPTION 'public.app_role has incompatible labels: %', role_labels;
    END IF;
  END IF;
END
$$;

-- 1. Sermons/Media Table
CREATE TABLE IF NOT EXISTS sermons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  preacher TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  audio_url TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'General',
  duration TEXT,
  date_preached DATE DEFAULT CURRENT_DATE,
  is_featured BOOLEAN DEFAULT false
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT 'Online / Main Sanctuary',
  image_url TEXT,
  registration_link TEXT,
  is_highlighted BOOLEAN DEFAULT false
);

-- 3. Ministry Pulse (Live Status)
CREATE TABLE IF NOT EXISTS pulse (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row for global state
  is_live BOOLEAN DEFAULT false,
  active_event_id UUID REFERENCES events(id),
  sermon_of_the_day_id UUID REFERENCES sermons(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Inquiries & Applications (Connect Form)
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'General Inquiry', 'Prayer Request', 'Testimony', 'Department Application', 'Event Registration'
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'contacted'
  phone TEXT,
  category TEXT,
  confidential BOOLEAN DEFAULT false,
  area TEXT,
  visit_type TEXT,
  invited_by TEXT,
  prayer_need TEXT
);

-- 5. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  what_they_do TEXT,
  who_should_join TEXT,
  cta_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Staff profiles are owned by auth.users. Role assignment is managed only by
-- trusted server/service-role code; authenticated users receive no role write.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role app_role DEFAULT 'leader',
  department_id UUID REFERENCES departments(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compatibility bootstrap for the observed production-shaped schema, where
-- departments predates its content columns. Existing rows are preserved and
-- can be populated deliberately before a future NOT NULL tightening.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE departments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS what_they_do TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS who_should_join TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE departments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE departments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE departments ALTER COLUMN display_order SET DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.departments'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE departments ADD PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS departments_name_unique_idx
  ON departments (name) WHERE name IS NOT NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'leader';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'leader';
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE profiles ADD PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE profiles VALIDATE CONSTRAINT profiles_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_department_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES departments(id) NOT VALID;
    ALTER TABLE profiles VALIDATE CONSTRAINT profiles_department_id_fkey;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_department_id_idx ON profiles (department_id);

-- 6. Donations Table
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  currency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  reference TEXT
);

ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for sermons') THEN
    CREATE POLICY "Public read access for sermons" ON sermons FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for events') THEN
    CREATE POLICY "Public read access for events" ON events FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE pulse ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for pulse') THEN
    CREATE POLICY "Public read access for pulse" ON pulse FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Departments are viewable by authenticated users." ON departments;
DROP POLICY IF EXISTS "Public read access for departments" ON departments;
DROP POLICY IF EXISTS departments_public_select ON departments;
REVOKE ALL PRIVILEGES ON TABLE departments FROM public, anon, authenticated, service_role;
GRANT SELECT ON TABLE departments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE departments TO service_role;
CREATE POLICY departments_public_select
  ON departments FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert access for donations') THEN
    CREATE POLICY "Public insert access for donations" ON donations FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ─── Write Policies for Authenticated Users ───────────────

-- Sermons: authenticated users can insert, update, delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated write access for sermons') THEN
    CREATE POLICY "Authenticated write access for sermons" ON sermons FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update access for sermons') THEN
    CREATE POLICY "Authenticated update access for sermons" ON sermons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete access for sermons') THEN
    CREATE POLICY "Authenticated delete access for sermons" ON sermons FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Events: authenticated users can insert, update, delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated write access for events') THEN
    CREATE POLICY "Authenticated write access for events" ON events FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update access for events') THEN
    CREATE POLICY "Authenticated update access for events" ON events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete access for events') THEN
    CREATE POLICY "Authenticated delete access for events" ON events FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Insert Initial Pulse State
INSERT INTO pulse (id, is_live) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- MIGRATIONS (idempotent) — safe to re-run against any state.
-- This file is the SINGLE canonical schema. Run the whole file
-- in the Supabase SQL editor to bring the database up to date.
-- ═══════════════════════════════════════════════════════════

-- Sermons: YouTube URL powers the homepage Heartbeat Vlog player.
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Inquiries: richer intake fields for Prayer Request / First-Timer Card.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS category TEXT;      -- General, Healing, Family, Work / Business, Salvation, Testimony
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confidential BOOLEAN DEFAULT false;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS visit_type TEXT;    -- First time, Returning guest, New convert
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS prayer_need TEXT;
ALTER TABLE inquiries ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE inquiries ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE inquiries ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE inquiries ALTER COLUMN confidential SET DEFAULT false;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM inquiries
    WHERE full_name IS NULL OR email IS NULL OR type IS NULL OR status IS NULL
       OR status NOT IN ('pending', 'reviewed', 'contacted')
  ) THEN
    RAISE EXCEPTION 'public.inquiries contains rows incompatible with the required intake contract';
  END IF;
END $$;

ALTER TABLE inquiries ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE inquiries ALTER COLUMN email SET NOT NULL;
ALTER TABLE inquiries ALTER COLUMN type SET NOT NULL;
ALTER TABLE inquiries ALTER COLUMN status SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inquiries'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE inquiries ADD PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inquiries'::regclass AND conname = 'inquiries_status_check'
  ) THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
      CHECK (status IN ('pending', 'reviewed', 'contacted'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
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
      ('inquiries', 'prayer_need', 'text')
    ) AS expected(table_name, column_name, udt_name)
    LEFT JOIN information_schema.columns AS actual
      ON actual.table_schema = 'public'
     AND actual.table_name = expected.table_name
     AND actual.column_name = expected.column_name
     AND actual.udt_name = expected.udt_name
    WHERE actual.column_name IS NULL
  ) THEN
    RAISE EXCEPTION 'protected table column types are incompatible with the required application contract';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Profile authorization: authenticated staff may read only their own profile.
-- Role assignment remains server/service-role managed so users cannot promote
-- themselves into a privileged inquiry-reading role.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles." ON profiles;
DROP POLICY IF EXISTS profiles_authenticated_select_own ON profiles;
REVOKE ALL PRIVILEGES ON TABLE profiles FROM public, anon, authenticated, service_role;
GRANT SELECT (id, full_name, role, department_id, updated_at)
  ON TABLE profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profiles TO service_role;
CREATE POLICY profiles_authenticated_select_own
  ON profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Inquiries RLS: anyone may submit through the public form. Only manager,
-- pastor, and owner profiles may read submissions or change their status.
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert access for inquiries" ON inquiries;
DROP POLICY IF EXISTS "Authenticated read access for inquiries" ON inquiries;
DROP POLICY IF EXISTS inquiries_public_insert ON inquiries;
DROP POLICY IF EXISTS inquiries_manager_select ON inquiries;
DROP POLICY IF EXISTS inquiries_manager_update_status ON inquiries;

REVOKE ALL PRIVILEGES ON TABLE inquiries FROM public, anon, authenticated, service_role;
GRANT INSERT (
  full_name,
  email,
  type,
  message,
  phone,
  category,
  confidential,
  area,
  visit_type,
  invited_by,
  prayer_need
) ON TABLE inquiries TO anon, authenticated;
GRANT SELECT ON TABLE inquiries TO authenticated;
GRANT UPDATE (status) ON TABLE inquiries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inquiries TO service_role;

CREATE POLICY inquiries_public_insert
  ON inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (
    btrim(full_name) <> ''
    AND btrim(email) <> ''
    AND btrim(type) <> ''
    AND status = 'pending'
  );

CREATE POLICY inquiries_manager_select
  ON inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('owner', 'pastor', 'manager')
    )
  );

CREATE POLICY inquiries_manager_update_status
  ON inquiries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('owner', 'pastor', 'manager')
    )
  )
  WITH CHECK (
    status IN ('pending', 'reviewed', 'contacted')
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('owner', 'pastor', 'manager')
    )
  );
