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
