# 🧳 Our Travel Planner

A cute, minimal travel planner for two — first stop: **Vietnam & Japan, Nov–Dec 2026** 🌏

- **Calendar view** (weeks run Monday–Sunday) where every day is coloured by
  where we're staying; travel days get a ✈️ / 🚆 / 🚌 badge.
- **Day details**: tap a day to see the stay, notes, travel legs and saved
  places with Google Maps links.
- **City list** on the start page: stays pick their city (and colour) from it,
  and each trip's header sums up its cities.
- **City bands**: a day in more than one city is split top-to-bottom, each
  band as tall as the time spent there (from the travel's departure / arrival
  times, if filled in).
- **To-do list** per trip for things to tick off (book tickets, buy a SIM…);
  a backup idea that's really a chore moves there with ☑️.
- **Planned days**: mark a day as fully planned from its popup — the calendar
  shows a small ✓ in the corner.
- **Column widths**: in edit mode, drag the edges between the weekday headers
  to resize a month's columns (↺ next to the month name goes back to automatic).
- **Next time list**: mark what we didn't manage on a trip (🌱), then bring
  those ideas along when a later trip goes to the same city.
- **View & edit modes**: anyone with the link can look, only we can edit
  (Supabase password login + row-level security).
- **Multi-trip**: built for future adventures too.
- Hosted free on **GitHub Pages**, data in **Supabase**, offline read cache
  for when we're actually travelling.

## Getting started

See [SETUP.md](SETUP.md) for the one-time Supabase + GitHub Pages setup.

```bash
npm install
npm run dev   # demo mode with sample data at http://localhost:5173
```

### Open it without a server

```bash
npm run build:file
```

Builds `dist-file/travel-planner.html` — one self-contained file (JS + CSS
inlined as a classic script at the end of `<body>`, since `file://` blocks
module scripts). Double-click it to open the planner straight from disk.

Use `npm run watch:file` while working: it rebuilds the file on every save, so
testing a change is just a refresh of the tab (no hot reload — that needs
`npm run dev`).

It reads live Supabase data if `.env` holds `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` at build time, otherwise it runs in demo mode. The
Nunito font still comes from Google Fonts, so offline it falls back to a system
font.

## Stack

Vite + React + TypeScript, plain CSS, Supabase (Postgres + auth),
GitHub Actions → GitHub Pages.

| Folder | What |
| --- | --- |
| `src/` | the app (components, data layer, styles) |
| `supabase/schema.sql` | database tables + security policies |
| `.github/workflows/` | Pages deploy + Supabase keepalive |
