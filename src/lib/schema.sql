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

-- Inquiries RLS: anyone may submit; only authenticated staff may read.
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert access for inquiries') THEN
    CREATE POLICY "Public insert access for inquiries" ON inquiries FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read access for inquiries') THEN
    CREATE POLICY "Authenticated read access for inquiries" ON inquiries FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Donations: who gave (needed by the Interac / bank-transfer "I've sent it"
-- notifications and the Paystack callback on /give).
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_email TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_name TEXT;

-- Feed the Future: monthly public impact report. The /feed-the-future stats
-- block only renders once a row with published = true exists.
CREATE TABLE IF NOT EXISTS feed_the_future_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  period_start DATE NOT NULL,          -- first day of the outreach month
  period_label TEXT NOT NULL,          -- e.g. 'October 2026'
  families_fed INTEGER,
  individuals_reached INTEGER,
  partners_involved INTEGER,
  published BOOLEAN DEFAULT false
);
ALTER TABLE feed_the_future_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read published feed reports') THEN
    CREATE POLICY "Public read published feed reports" ON feed_the_future_reports FOR SELECT USING (published = true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated write feed reports') THEN
    CREATE POLICY "Authenticated write feed reports" ON feed_the_future_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- DAILY WORD LIBRARY (/daily-word, home "Word of the Day")
-- Anyone may read PUBLISHED rows. Only staff whose profiles.role is
-- owner, pastor or manager may create / edit / publish; deleting needs
-- owner or pastor. These match the admin dashboard's role levels
-- (src/lib/permissions.ts). Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════

-- Role check used by RLS. SECURITY DEFINER so it can read profiles even
-- when profiles has its own RLS; plpgsql so it is only resolved at call time.
CREATE OR REPLACE FUNCTION public.hbg_has_staff_role(allowed TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = ANY (allowed)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.hbg_has_staff_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hbg_has_staff_role(TEXT[]) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  scripture_ref TEXT NOT NULL,          -- e.g. 'Psalm 46:10'
  scripture_text TEXT NOT NULL,         -- scripture text (KJV or NKJV; version follows the reference suffix, see translationOf in src/lib/dailyWord.ts)
  devotional TEXT NOT NULL DEFAULT '',  -- markdown: paragraphs, ##, >, -, **bold**, *italic*, [links](https://…)
  image_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS daily_words_published_date_idx ON daily_words (published, publish_date DESC);

ALTER TABLE daily_words ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_words' AND policyname = 'Public read published daily words') THEN
    CREATE POLICY "Public read published daily words" ON daily_words FOR SELECT USING (published = true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_words' AND policyname = 'Staff read all daily words') THEN
    CREATE POLICY "Staff read all daily words" ON daily_words FOR SELECT TO authenticated
      USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_words' AND policyname = 'Staff insert daily words') THEN
    CREATE POLICY "Staff insert daily words" ON daily_words FOR INSERT TO authenticated
      WITH CHECK (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_words' AND policyname = 'Staff update daily words') THEN
    CREATE POLICY "Staff update daily words" ON daily_words FOR UPDATE TO authenticated
      USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']))
      WITH CHECK (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_words' AND policyname = 'Senior staff delete daily words') THEN
    CREATE POLICY "Senior staff delete daily words" ON daily_words FOR DELETE TO authenticated
      USING (public.hbg_has_staff_role(ARRAY['owner','pastor']));
  END IF;
END $$;
