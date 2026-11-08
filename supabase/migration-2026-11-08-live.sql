BEGIN;
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

-- Departments: live table only had id/created_at. Add the content columns.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS what_they_do TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS who_should_join TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
INSERT INTO departments (name, description, what_they_do, who_should_join, cta_text, display_order)
SELECT v.* FROM (VALUES
('Pastoral Team', 'The spiritual foundation of the ministry.', 'Counseling, discipleship, and spiritual oversight of the congregation.', 'Individuals with a heart for people, strong biblical foundation, and a call to ministry.', 'Apply to Serve', 1),
('Intimacy (Choir)', 'The choir of Heartbeat of God, leading the house in worship.', 'Leads worship at our services and gatherings, and hosts TRIBE X.', 'Singers with a heart for worship and the presence of God.', 'Join Intimacy', 2),
('Media & Creative', 'Amplifying the voice of the Spirit.', 'Live streaming, content creation, social media management, and technical production.', 'Creatives, tech enthusiasts, photographers, and editors.', 'Join the Crew', 3),
('Prayer Department', 'The engine room of the ministry.', 'Continuous intercession for the ministry, the members, and the global body of Christ.', 'Deeply committed intercessors and those with a passion for spiritual warfare.', 'Join Intercession', 4),
('Outreach & Evangelism', 'Winning souls for the Kingdom.', 'Local outreaches, hospital visitations, and missions to unreached areas.', 'Bold believers with a passion for souls and community impact.', 'Join Outreach', 5)
) AS v(name, description, what_they_do, who_should_join, cta_text, display_order)
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.name = v.name);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_email TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_name TEXT;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='donations' AND policyname='Public insert access for donations') THEN
  CREATE POLICY "Public insert access for donations" ON donations FOR INSERT WITH CHECK (true); END IF; END $$;

-- Inquiries: let the public submit forms (no public read).
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inquiries' AND policyname='Public insert access for inquiries') THEN
  CREATE POLICY "Public insert access for inquiries" ON inquiries FOR INSERT TO anon, authenticated WITH CHECK (true); END IF; END $$;
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
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feed_the_future_reports' AND policyname='Public read published feed reports') THEN CREATE POLICY "Public read published feed reports" ON feed_the_future_reports FOR SELECT USING (published = true); END IF; END $$;
CREATE TABLE IF NOT EXISTS daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  scripture_ref TEXT NOT NULL,          -- e.g. 'Psalm 46:10'
  scripture_text TEXT NOT NULL,         -- King James Version text
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
-- Staff-only (role-checked) access for inquiries and feed reports.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inquiries' AND policyname='Staff read inquiries') THEN
  CREATE POLICY "Staff read inquiries" ON inquiries FOR SELECT TO authenticated USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager'])); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feed_the_future_reports' AND policyname='Staff write feed reports') THEN
  CREATE POLICY "Staff write feed reports" ON feed_the_future_reports FOR ALL TO authenticated USING (public.hbg_has_staff_role(ARRAY['owner','pastor','manager'])) WITH CHECK (public.hbg_has_staff_role(ARRAY['owner','pastor','manager'])); END IF; END $$;
INSERT INTO daily_words (slug, publish_date, title, scripture_ref, scripture_text, devotional, youtube_url, published) VALUES
('2026-10-17-the-joy-that-keeps-the-harvest', '2026-10-17', 'The Joy That Keeps the Harvest', 'John 4:36',
 $t$And he that reapeth receiveth wages, and gathereth fruit unto life eternal: that both he that soweth and he that reapeth may rejoice together.$t$,
 $d$**Joy is the seal of the harvest — what you celebrate, you keep.**

From the Heartbeat of God Ministry — Pastor Amos Unogwu. A Reason to Live.$d$,
 'https://www.youtube.com/shorts/ZBUASZyEiPg', true),
('2026-10-18-the-harvest-must-be-kept', '2026-10-18', 'The Harvest Must Be Kept', 'Acts 8:14–15',
 $t$Now when the apostles which were at Jerusalem heard that Samaria had received the word of God, they sent unto them Peter and John: Who, when they were come down, prayed for them, that they might receive the Holy Ghost:$t$,
 $d$## Key Word
**Follow-up is the guard of the harvest — what you keep, multiplies.**

## Word Focus
Philip preached Christ in Samaria, miracles broke out, and the whole city rejoiced — but the story did not end there. When the apostles at Jerusalem heard that Samaria had received the Word of God, they sent Peter and John to the new believers. A wise harvester does not walk away after the gathering; he secures what was gathered.

New believers are like newborns — they need feeding, warmth, and watching. The enemy fights hardest at the beginning of a person's faith, because he knows a new convert today is a labourer tomorrow. Follow-up is standing guard over young faith until it can stand on its own.

When the Samaritan woman ran into the city with her testimony, many believed — and Jesus did not rush away from them. "He abode there two days" (John 4:40). The Lord Himself stayed with new believers. Presence establishes what preaching began.

Follow-up is the love of God wearing work clothes. Call the one who came to church last Sunday. Visit the one who gave his life at the last outreach. Pray for the new believer by name. Heaven counts the harvest; it is our assignment to keep it.

## Bible Story Tie-In — Samaria (Acts 8:14–17)
After Philip's preaching filled Samaria with joy, Peter and John arrived and prayed for the new converts, laying hands on them that they might receive the Holy Ghost. The harvest Philip gathered was sealed by apostolic follow-up — heaven sent more laborers, not just more meetings.

## Prayer
Father, give me the heart of a keeper. Let me follow up in love until every new believer You entrust to me is rooted and established in You. In Jesus' name, Amen.

## Confession
- I am not only a soul-winner; I am a soul-keeper.
- What God gathers through me, I will guard in prayer and follow-up.
- No new believer connected to me will be abandoned to the enemy.
- The harvest is kept — and what is kept, multiplies.

## Action Point
Reach out today to one person who is new in the faith — call, visit, or send a word of encouragement.

## Quiz
- When Jerusalem heard Samaria had received the Word, whom did they send?
- What did Peter and John pray for the Samaritans to receive?
- Why must a gathered harvest be followed up?

— Pastor Amos$d$,
 'https://www.youtube.com/shorts/h0riWjJIFho', true),
('2026-10-23-the-harvest-that-heard-him', '2026-10-23', 'The Harvest That Heard Him', 'John 4:42',
 $t$And said unto the woman, Now we believe, not because of thy saying: for we have heard him ourselves, and know that this is indeed the Christ, the Saviour of the world.$t$,
 $d$## Key Word
**Your testimony opens the door, but a personal encounter with Jesus keeps the harvest — bring them to Him Himself.**

The woman of Samaria said, "Come, see a man, which told me all things that ever I did" (John 4:29). Her testimony was the doorway, not the destination — she pointed them to the Person. They came, heard His own word, and declared: "Now we believe, not because of thy saying: for we have heard him ourselves" (John 4:42).

Bring someone to Jesus Himself today.

— Pastor Amos$d$,
 'https://www.youtube.com/shorts/GViC8e1-wPo', true)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
