-- Migration for existing databases (schema.sql already includes this for fresh installs).
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Adds the "next time" flag: places we wanted to do on a trip but didn't
-- manage. They keep no day, and can be carried over into a later trip.

alter table places add column if not exists leftover boolean not null default false;

-- The "from past trips" list reads every flagged place across all trips.
create index if not exists places_leftover_idx on places (leftover) where leftover;
