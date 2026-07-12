-- Migration for existing databases (schema.sql already includes this for fresh installs).
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.

alter table places add column if not exists "date" date;
