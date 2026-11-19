-- Prayer Wall + Testimonies  (PENDING — needs Doroto's approval before it is run)
--
-- Visitors submit a prayer request or testimony from /prayer-wall.
-- Nothing is public until staff approve it in /admin?view=prayerwall.
--
--   anon / authenticated : INSERT only (always lands unapproved, count 0)
--   public SELECT        : only rows where approved = true AND share_publicly = true
--   staff (owner/pastor/manager): read all, approve/unapprove, delete
--   "We prayed"          : prayer_wall_pray(id) bumps the counter on approved rows only
--
-- Depends on public.hbg_has_staff_role(TEXT[]) from supabase/migration-2026-11-08-live.sql.
-- Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.prayer_wall_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind            TEXT        NOT NULL CHECK (kind IN ('prayer', 'testimony')),
  name            TEXT        CHECK (name IS NULL OR char_length(name) <= 80),           -- optional
  message         TEXT        NOT NULL CHECK (char_length(message) BETWEEN 3 AND 2000),
  share_publicly  BOOLEAN     NOT NULL DEFAULT false,
  approved        BOOLEAN     NOT NULL DEFAULT false,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  prayed_count    INTEGER     NOT NULL DEFAULT 0 CHECK (prayed_count >= 0)
);

CREATE INDEX IF NOT EXISTS prayer_wall_public_idx
  ON public.prayer_wall_entries (approved, share_publicly, created_at DESC);

ALTER TABLE public.prayer_wall_entries ENABLE ROW LEVEL SECURITY;

-- Anyone may submit; a submission can never approve itself or seed the counter.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prayer_wall_entries' AND policyname = 'Public submit prayer wall entries') THEN
    CREATE POLICY "Public submit prayer wall entries" ON public.prayer_wall_entries
      FOR INSERT TO anon, authenticated
      WITH CHECK (approved = false AND approved_at IS NULL AND approved_by IS NULL AND prayed_count = 0);
  END IF;
END $$;

-- Public sees only approved entries the submitter agreed to share.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prayer_wall_entries' AND policyname = 'Public read approved prayer wall entries') THEN
    CREATE POLICY "Public read approved prayer wall entries" ON public.prayer_wall_entries
      FOR SELECT TO anon, authenticated
      USING (approved = true AND share_publicly = true);
  END IF;
END $$;

-- Staff moderation.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prayer_wall_entries' AND policyname = 'Staff read all prayer wall entries') THEN
    CREATE POLICY "Staff read all prayer wall entries" ON public.prayer_wall_entries
      FOR SELECT TO authenticated
      USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prayer_wall_entries' AND policyname = 'Staff moderate prayer wall entries') THEN
    CREATE POLICY "Staff moderate prayer wall entries" ON public.prayer_wall_entries
      FOR UPDATE TO authenticated
      USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']))
      WITH CHECK (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prayer_wall_entries' AND policyname = 'Senior staff delete prayer wall entries') THEN
    CREATE POLICY "Senior staff delete prayer wall entries" ON public.prayer_wall_entries
      FOR DELETE TO authenticated
      USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));
  END IF;
END $$;

-- "We prayed" counter: the only way the public can change a row, and only +1
-- on an entry that is already approved and public.
CREATE OR REPLACE FUNCTION public.prayer_wall_pray(entry_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.prayer_wall_entries
     SET prayed_count = prayed_count + 1
   WHERE id = entry_id AND approved = true AND share_publicly = true
  RETURNING prayed_count INTO new_count;
  RETURN new_count;
END;
$$;
REVOKE ALL ON FUNCTION public.prayer_wall_pray(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prayer_wall_pray(UUID) TO anon, authenticated;

COMMIT;
