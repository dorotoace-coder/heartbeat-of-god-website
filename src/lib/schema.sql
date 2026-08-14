-- Heartbeat of God Ministry - Database Schema

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
  status TEXT DEFAULT 'pending' -- 'pending', 'reviewed', 'contacted'
);

-- 5. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  what_they_do TEXT NOT NULL,
  who_should_join TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for departments') THEN
    CREATE POLICY "Public read access for departments" ON departments FOR SELECT USING (true);
  END IF;
END $$;

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
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS category TEXT;      -- General, Healing, Family, Work / Business, Salvation, Testimony
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confidential BOOLEAN DEFAULT false;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS visit_type TEXT;    -- First time, Returning guest, New convert
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS prayer_need TEXT;

-- Profile authorization: authenticated staff may read only their own profile.
-- Role assignment remains server/service-role managed so users cannot promote
-- themselves into a privileged inquiry-reading role.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles." ON profiles;
DROP POLICY IF EXISTS profiles_authenticated_select_own ON profiles;
REVOKE ALL PRIVILEGES ON TABLE profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, role, department_id, updated_at)
  ON TABLE profiles TO authenticated;
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

REVOKE ALL PRIVILEGES ON TABLE inquiries FROM anon, authenticated;
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
