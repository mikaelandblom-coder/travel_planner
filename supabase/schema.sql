-- Travel planner schema.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

-- ---------- tables ----------

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🧳',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create table stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  location_name text not null,
  start_date date not null,
  end_date date not null,
  color text not null default '#FFD9C7',
  map_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  date date not null,          -- departure day
  arrive_date date,            -- arrival day if different (overnight flights)
  from_name text not null,
  to_name text not null,
  mode text not null default 'flight',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  stay_id uuid references stays (id) on delete set null,
  name text not null,
  category text not null default 'other',
  map_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Who may edit. Add a row per allowed email (must match the email they sign in with).
create table editors (
  email text primary key
);

-- ---------- row level security ----------

alter table trips enable row level security;
alter table stays enable row level security;
alter table legs enable row level security;
alter table places enable row level security;
alter table editors enable row level security;

-- True when the signed-in user's email is in the editors table.
-- security definer so the check works even though editors is locked down.
create or replace function is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from editors where email = (auth.jwt() ->> 'email')
  );
$$;

-- Everyone (including anonymous visitors) can read the itinerary.
create policy "public read trips" on trips for select using (true);
create policy "public read stays" on stays for select using (true);
create policy "public read legs" on legs for select using (true);
create policy "public read places" on places for select using (true);

-- Only editors can write.
create policy "editors write trips" on trips
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "editors write stays" on stays
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "editors write legs" on legs
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "editors write places" on places
  for all to authenticated using (is_editor()) with check (is_editor());

-- Signed-in users can check their own editor status (the app uses this
-- to decide whether to show edit mode). Nobody can list other editors.
create policy "read own editor row" on editors
  for select to authenticated using (email = (auth.jwt() ->> 'email'));

-- ---------- allowed editors ----------
-- ⚠️ Replace / extend with the emails you and Mai will sign in with:

insert into editors (email) values
  ('mikaelandblom@gmail.com'),
  ('mai@example.com');  -- ← change this one!
