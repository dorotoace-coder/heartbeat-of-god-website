-- Adds Intimacy (the HBG choir) to the live Departments list, second after Pastoral Team. Safe to re-run.
UPDATE departments SET display_order = display_order + 1
  WHERE display_order >= 2 AND NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Intimacy (Choir)');
INSERT INTO departments (name, description, what_they_do, who_should_join, cta_text, display_order)
SELECT 'Intimacy (Choir)', 'The choir of Heartbeat of God, leading the house in worship.',
       'Leads worship at our services and gatherings, and hosts TRIBE X.',
       'Singers with a heart for worship and the presence of God.', 'Join Intimacy', 2
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Intimacy (Choir)');
