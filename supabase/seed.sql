-- Synthetic, non-sensitive records for repeatable local development only.

insert into public.departments (
  id, name, description, what_they_do, who_should_join, cta_text, display_order
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'Media and Sound',
    'Supports worship and teaching through reliable media production.',
    'Audio, video, livestream and presentation support.',
    'People who enjoy technology, storytelling and service.',
    'Join the media team',
    1
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Hospitality',
    'Creates a warm and orderly welcome for every guest.',
    'Guest care, service support and follow-up.',
    'People who enjoy welcoming and helping others.',
    'Join hospitality',
    2
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  what_they_do = excluded.what_they_do,
  who_should_join = excluded.who_should_join,
  cta_text = excluded.cta_text,
  display_order = excluded.display_order;

insert into public.sermons (
  id, title, preacher, description, category, duration, date_preached,
  is_featured, youtube_url
) values (
  '20000000-0000-4000-8000-000000000001',
  'Local Foundation Message',
  'HBOG Local Test',
  'Synthetic content used only to verify the local media contract.',
  'Spiritual Growth',
  '12:00',
  current_date,
  true,
  'https://www.youtube.com/watch?v=localtest01'
)
on conflict (id) do update set
  title = excluded.title,
  preacher = excluded.preacher,
  description = excluded.description,
  category = excluded.category,
  duration = excluded.duration,
  date_preached = excluded.date_preached,
  is_featured = excluded.is_featured,
  youtube_url = excluded.youtube_url;

insert into public.events (
  id, name, description, event_date, location, is_highlighted, recurrence
) values (
  '30000000-0000-4000-8000-000000000001',
  'Local Sunday Celebration',
  'Synthetic event used only to verify the local programs contract.',
  date_trunc('day', now()) + interval '7 days 9 hours',
  'Local test sanctuary',
  true,
  'weekly'
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  event_date = excluded.event_date,
  location = excluded.location,
  is_highlighted = excluded.is_highlighted,
  recurrence = excluded.recurrence;

insert into public.pulse (
  id, is_live, active_event_id, sermon_of_the_day_id, updated_at
) values (
  1,
  false,
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  now()
)
on conflict (id) do update set
  is_live = excluded.is_live,
  active_event_id = excluded.active_event_id,
  sermon_of_the_day_id = excluded.sermon_of_the_day_id,
  updated_at = excluded.updated_at;
