-- Optional starter data: the sample Vietnam & Japan itinerary from demo mode.
-- Run in Supabase SQL Editor if you'd like to start from this instead of a
-- blank planner, then edit everything in the app. Safe to run once only.

insert into trips (id, name, emoji, start_date, end_date) values
  ('a0000000-0000-4000-8000-000000000001', 'Vietnam & Japan', '🌏', '2026-11-12', '2026-12-20');

insert into stays (id, trip_id, location_name, start_date, end_date, color, map_url, notes) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Hanoi',            '2026-11-13', '2026-11-17', '#FFD9C7', 'https://maps.google.com/?q=Hanoi+Old+Quarter',      'Stay in the Old Quarter'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Ha Long Bay',      '2026-11-17', '2026-11-19', '#C9E8D2', 'https://maps.google.com/?q=Ha+Long+Bay',            'Overnight cruise?'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Hoi An',           '2026-11-19', '2026-11-24', '#FBEFC3', 'https://maps.google.com/?q=Hoi+An+Ancient+Town',    'Lantern town 🏮 tailor shops'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Ho Chi Minh City', '2026-11-24', '2026-11-28', '#F9D3E1', 'https://maps.google.com/?q=Ho+Chi+Minh+City+District+1', ''),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Tokyo',            '2026-11-28', '2026-12-04', '#CBE4F6', 'https://maps.google.com/?q=Shibuya+Tokyo',          ''),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Hakone',           '2026-12-04', '2026-12-06', '#D5EDE8', 'https://maps.google.com/?q=Hakone',                 'Onsen ryokan night ♨️'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Kyoto',            '2026-12-06', '2026-12-11', '#E6D9F7', 'https://maps.google.com/?q=Kyoto',                  ''),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'Osaka',            '2026-12-11', '2026-12-15', '#F3E0CE', 'https://maps.google.com/?q=Osaka+Namba',            ''),
  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'Tokyo',            '2026-12-15', '2026-12-20', '#CBE4F6', 'https://maps.google.com/?q=Tokyo+Station',          '');

insert into legs (trip_id, date, from_name, to_name, mode, notes) values
  ('a0000000-0000-4000-8000-000000000001', '2026-11-12', 'Home',             'Hanoi',            'flight', 'Overnight flight, arrive on the 13th'),
  ('a0000000-0000-4000-8000-000000000001', '2026-11-17', 'Hanoi',            'Ha Long Bay',      'bus',    '~2.5 h shuttle'),
  ('a0000000-0000-4000-8000-000000000001', '2026-11-19', 'Ha Long Bay',      'Hoi An',           'flight', 'Via Da Nang'),
  ('a0000000-0000-4000-8000-000000000001', '2026-11-24', 'Hoi An',           'Ho Chi Minh City', 'flight', ''),
  ('a0000000-0000-4000-8000-000000000001', '2026-11-28', 'Ho Chi Minh City', 'Tokyo',            'flight', ''),
  ('a0000000-0000-4000-8000-000000000001', '2026-12-04', 'Tokyo',            'Hakone',           'train',  'Romancecar from Shinjuku'),
  ('a0000000-0000-4000-8000-000000000001', '2026-12-06', 'Hakone',           'Kyoto',            'train',  'Shinkansen from Odawara'),
  ('a0000000-0000-4000-8000-000000000001', '2026-12-11', 'Kyoto',            'Osaka',            'train',  ''),
  ('a0000000-0000-4000-8000-000000000001', '2026-12-15', 'Osaka',            'Tokyo',            'train',  'Shinkansen'),
  ('a0000000-0000-4000-8000-000000000001', '2026-12-20', 'Tokyo',            'Home',             'flight', '');

insert into places (trip_id, stay_id, name, category, map_url, notes) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Hoan Kiem Lake',          'sight',  'https://maps.google.com/?q=Hoan+Kiem+Lake', ''),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Bún chả Hương Liên',      'food',   'https://maps.google.com/?q=Bun+Cha+Huong+Lien+Hanoi', 'The Obama one'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'An Bang Beach',           'nature', 'https://maps.google.com/?q=An+Bang+Beach', ''),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005', 'teamLab Planets',         'sight',  'https://maps.google.com/?q=teamLab+Planets+Tokyo', 'Book ahead!'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007', 'Fushimi Inari',           'sight',  'https://maps.google.com/?q=Fushimi+Inari+Taisha', 'Go early morning'),
  ('a0000000-0000-4000-8000-000000000001', null,                                    'Try a konbini egg sando', 'food',   '', 'Any 7-Eleven 🥪');
