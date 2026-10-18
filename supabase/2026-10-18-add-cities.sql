-- Migration for existing databases (schema.sql already includes this for fresh installs).
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Adds the shared city list (start page) that stays pick from, and a city on
-- places, so "saved from earlier trips" only suggests ideas for cities the
-- current trip goes to.

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#FFD9C7', -- used by every stay in this city
  created_at timestamptz not null default now()
);

alter table cities enable row level security;

drop policy if exists "public read cities" on cities;
create policy "public read cities" on cities for select using (true);
drop policy if exists "editors write cities" on cities;
create policy "editors write cities" on cities
  for all to authenticated using (is_editor()) with check (is_editor());

-- City of a place without a stay ('' = anywhere). A stay's city wins.
alter table places add column if not exists city text not null default '';

-- Start the list with every city the planner already uses: each stay
-- location in the colour of its first stay, then travel stops that aren't
-- stays (skipping 'Home').
insert into cities (name, color)
select distinct on (location_name) location_name, color
from stays
order by location_name, start_date
on conflict (name) do nothing;

insert into cities (name, color)
select distinct name, '#F3E0CE'
from (select from_name as name from legs union select to_name from legs) stops
where name <> '' and lower(name) <> 'home'
on conflict (name) do nothing;

-- Places in a stay remember its city.
update places p set city = s.location_name
from stays s
where p.stay_id = s.id and p.city = '';

-- A trip with a single city: its stay-less ideas belong there too (e.g. a
-- city break planned without stays). The city is the trip's one stay
-- location, or else the one place its travel goes to that isn't home
-- (home = where the trip's first leg sets off from).
with home as (
  select distinct on (trip_id) trip_id, from_name as name
  from legs
  order by trip_id, date
),
dest as (
  select trip_id, location_name as name from stays
  union
  select l.trip_id, l.to_name from legs l
  where not exists (select 1 from home h where h.trip_id = l.trip_id and h.name = l.to_name)
    and lower(l.to_name) <> 'home'
)
update places p set city = d.city
from (
  select trip_id, min(name) as city
  from dest
  group by trip_id
  having count(distinct name) = 1
) d
where p.trip_id = d.trip_id and p.stay_id is null and p.city = '';
