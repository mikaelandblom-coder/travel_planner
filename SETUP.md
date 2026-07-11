# Setup guide 🧭

The app works in two modes:

- **Demo mode** — no configuration. Data lives in the browser's localStorage only.
  This is what you get running locally without a `.env.local`.
- **Cloud mode** — Supabase database + login. Everyone can view, only allowed
  emails can edit, and edits sync between devices.

Follow the three parts below once and you're done.

---

## Part 1 — Supabase (the database)

1. **Create an account** at [supabase.com](https://supabase.com) (free tier is plenty).
   Sign up with GitHub to keep things simple.
2. **Create a project** — name it e.g. `travel-planner`, pick a region near you
   (e.g. `eu-north-1` Stockholm), and let it generate a database password
   (you won't need it day-to-day).
3. **Create the tables**: in the left sidebar open **SQL Editor → New query**,
   paste the whole contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   ⚠️ Before running, edit the last lines: replace `mai@example.com` with Mai's
   real email. These two emails are the only ones allowed to edit.
4. **Check auth settings**: under **Authentication → Sign In / Up**, make sure the
   **Email** provider is enabled (it is by default). Magic links are used, so no
   passwords are needed.
5. **Collect your keys**: under **Project Settings → Data API** copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key**

   The anon key is safe to publish — all protection comes from the row-level
   security policies in the schema.

### Adding or removing editors later

SQL Editor → `insert into editors (email) values ('new@email.com');`
or delete the row to revoke access. Emails must match what the person signs in with.

---

## Part 2 — GitHub Pages (the hosting)

1. Push this repository to GitHub (public repo = free Pages).
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables tab**, add two
   **repository variables**:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually).
   Your planner appears at `https://<username>.github.io/<repo>/`.

### Tell Supabase about your site URL

Back in Supabase: **Authentication → URL Configuration**:

- **Site URL**: `https://<username>.github.io/<repo>/`
- **Redirect URLs**: add the same URL, and `http://localhost:5173` for local dev.

This is where the magic-link email sends you after clicking.

---

## Part 3 — Signing in & editing

1. Open the published site, tap **🖊️ Edit**.
2. Enter your email → you get a magic link → open it **on the same device** → you're in.
3. Sessions last a long time, so you'll rarely need to sign in again on the same device.

Anyone else visiting the page just sees the pretty read-only planner. If someone
signs in with an email that isn't in `editors`, they still can't change anything —
the database refuses every write.

---

## Good to know

- **Keepalive**: Supabase pauses free projects after ~1 week without traffic.
  The included `keepalive.yml` workflow pings it twice a week. GitHub pauses
  *that* after 60 days without repo activity, but emails you first — one click
  re-enables it. If the project ever does pause, restoring it from the Supabase
  dashboard takes a minute and loses nothing.
- **Magic-link emails**: Supabase's built-in email sender is rate-limited to a
  handful of emails per hour — fine for two people who rarely log in.
- **Offline**: the app caches the last-loaded itinerary, so view mode works on
  the train / plane. Editing needs a connection.

## Local development

```bash
npm install
cp .env.example .env.local   # optional: fill in Supabase keys for cloud mode
npm run dev                  # http://localhost:5173
```

Without `.env.local` the app runs in demo mode with sample data.
