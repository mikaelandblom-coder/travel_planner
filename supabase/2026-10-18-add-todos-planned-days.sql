-- Migration for existing databases (schema.sql already includes this for fresh installs).
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Adds:
--  * a to-do list per trip (things to tick off, like pre-booking tickets),
--  * the days whose planning is done, and hand-set calendar column widths,
--  * optional departure / arrival times on travel, which size the city bands
--    on days spent in more than one city.

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  text text not null,
  notes text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table todos enable row level security;

drop policy if exists "public read todos" on todos;
create policy "public read todos" on todos for select using (true);
drop policy if exists "editors write todos" on todos;
create policy "editors write todos" on todos
  for all to authenticated using (is_editor()) with check (is_editor());

-- Days we've finished planning ('YYYY-MM-DD').
alter table trips add column if not exists planned_days date[] not null default '{}';
-- Calendar column widths set by hand, per month: { "2026-11": [1, 1.4, …] }.
alter table trips add column if not exists col_widths jsonb not null default '{}';

alter table legs add column if not exists depart_time time;
alter table legs add column if not exists arrive_time time;
