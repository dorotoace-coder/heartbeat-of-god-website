-- Enable the uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create an enum for application roles safely
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('owner', 'pastor', 'manager', 'leader');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create a table for departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table for profiles linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  role app_role DEFAULT 'leader',
  department_id UUID REFERENCES departments(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles." ON profiles;
DROP POLICY IF EXISTS "Departments are viewable by authenticated users." ON departments;

-- Re-create Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profiles." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Re-create Policies for Departments
CREATE POLICY "Departments are viewable by authenticated users." ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Example Insert for Initial Testing (Optional)
-- INSERT INTO departments (name, description) VALUES ('Media', 'Photography, Video and Sound');
-- INSERT INTO departments (name, description) VALUES ('Music', 'Worship and Praise Team');

-- ─────────────────────────────────────────
-- DONATIONS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency TEXT NOT NULL DEFAULT 'NGN',
  amount NUMERIC(12,2) NOT NULL,
  frequency TEXT DEFAULT 'One Time',
  payment_method TEXT DEFAULT 'Card',
  status TEXT DEFAULT 'completed',
  reference TEXT,
  donor_email TEXT,
  donor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donations insert open" ON donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Donations admin read" ON donations FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- INQUIRIES TABLE (Connect page)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT DEFAULT 'General Inquiry',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inquiries insert open" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Inquiries admin read" ON inquiries FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- EVENTS TABLE (Upcoming Encounters section)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events public read" ON events FOR SELECT USING (true);

-- Seed ILPC 2026
INSERT INTO events (name, description, event_date, location)
VALUES (
  'ILPC 2026 — Fresh Oil for a New Season',
  'International Leaders & Pastors Conference hosted by Pastor Amos Unogwu. Three days of prophetic impartation, apostolic teaching, and divine visitation.',
  '2026-06-05 09:00:00+01',
  '200 Akute Rd, opp. Royal Prince Supermarket, Akute, Nigeria'
) ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- SERMONS TABLE (Media page)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sermons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  preacher TEXT DEFAULT 'Pastor Amos Unogwu',
  category TEXT DEFAULT 'Spiritual Growth',
  date_preached DATE,
  duration TEXT,
  thumbnail_url TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sermons public read" ON sermons FOR SELECT USING (true);

-- ─────────────────────────────────────────
-- PULSE TABLE (Live state)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse (
  id INT PRIMARY KEY DEFAULT 1,
  is_live BOOLEAN DEFAULT false,
  active_event_id UUID REFERENCES events(id),
  sermon_of_the_day_id UUID REFERENCES sermons(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pulse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pulse public read" ON pulse FOR SELECT USING (true);
INSERT INTO pulse (id, is_live) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
