# 🧳 Our Travel Planner

A cute, minimal travel planner for two — first stop: **Vietnam & Japan, Nov–Dec 2026** 🌏

- **Calendar view** (weeks run Monday–Sunday) where every day is coloured by
  where we're staying; travel days get a ✈️ / 🚆 / 🚌 badge.
- **Day details**: tap a day to see the stay, notes, travel legs and saved
  places with Google Maps links.
- **View & edit modes**: anyone with the link can look, only we can edit
  (Supabase magic-link login + row-level security).
- **Multi-trip**: built for future adventures too.
- Hosted free on **GitHub Pages**, data in **Supabase**, offline read cache
  for when we're actually travelling.

## Getting started

See [SETUP.md](SETUP.md) for the one-time Supabase + GitHub Pages setup.

```bash
npm install
npm run dev   # demo mode with sample data at http://localhost:5173
```

## Stack

Vite + React + TypeScript, plain CSS, Supabase (Postgres + auth),
GitHub Actions → GitHub Pages.

| Folder | What |
| --- | --- |
| `src/` | the app (components, data layer, styles) |
| `supabase/schema.sql` | database tables + security policies |
| `.github/workflows/` | Pages deploy + Supabase keepalive |
