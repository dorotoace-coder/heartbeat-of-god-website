-- Seed Data for Heartbeat of God Ministry

-- 1. Departments
INSERT INTO departments (name, description, what_they_do, who_should_join, cta_text, display_order)
VALUES 
('Pastoral Team', 'The spiritual foundation of the ministry.', 'Counseling, discipleship, and spiritual oversight of the congregation.', 'Individuals with a heart for people, strong biblical foundation, and a call to ministry.', 'Apply to Serve', 1),
('Media & Creative', 'Amplifying the voice of the Spirit.', 'Live streaming, content creation, social media management, and technical production.', 'Creatives, tech enthusiasts, photographers, and editors.', 'Join the Crew', 2),
('Prayer Department', 'The engine room of the ministry.', 'Continuous intercession for the ministry, the members, and the global body of Christ.', 'Deeply committed intercessors and those with a passion for spiritual warfare.', 'Join Intercession', 3),
('Outreach & Evangelism', 'Winning souls for the Kingdom.', 'Local outreaches, hospital visitations, and missions to unreached areas.', 'Bold believers with a passion for souls and community impact.', 'Join Outreach', 4)
ON CONFLICT DO NOTHING;

-- 2. Sermons
INSERT INTO sermons (title, preacher, description, category, thumbnail_url, is_featured)
VALUES 
('The Dimension of Eternal Rest', 'Pastor Amos Unogwu', 'Exploring the depths of God''s peace that passes all understanding.', 'Spiritual Growth', 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=2070&auto=format&fit=crop', true),
('Walking in Divine Authority', 'Pastor Amos Unogwu', 'A teaching on the legal rights of the believer in Christ.', 'Kingdom Power', 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2073&auto=format&fit=crop', false),
('The Power of the Secret Place', 'Pastor Amos Unogwu', 'Understanding the necessity of intimacy with the Holy Spirit.', 'Prayer', 'https://images.unsplash.com/photo-1444464666168-49d633b867ad?q=80&w=2069&auto=format&fit=crop', false)
ON CONFLICT DO NOTHING;

-- 3. Events
INSERT INTO events (name, description, event_date, location, image_url, is_highlighted)
VALUES 
('Sunday Glory Service', 'Our main weekly gathering focusing on the Word and the Spirit.', '2026-03-22 09:00:00+00', 'Main Sanctuary & Online', 'https://images.unsplash.com/photo-1437603565262-7bf121c4245e?q=80&w=2070&auto=format&fit=crop', true),
('Salvation Challenge', 'A dedicated time of intense prayer and soul winning.', '2026-04-10 18:00:00+00', 'City Center Stadium', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop', false)
ON CONFLICT DO NOTHING;
