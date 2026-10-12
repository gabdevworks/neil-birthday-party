# Neil Martin — Pull Up & Drink

Private party site for 48 guests. A guest searches for their name, opens their invite, and confirms they're coming.

The interface is a dark navy invitation for October 31, 2026, 9:00 PM Philippine Time at The Beech, Panay Avenue.

## Prerequisites

- Node.js 20 or newer
- npm

## Installation

```bash
npm install
```

## Local development

```bash
npm run dev
```

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, name search uses the bundled guest list and RSVP answers stay in that browser.

## Production build

```bash
npm run lint
npm run verify
npm run build
```

`npm run build` typechecks the project and writes the static site to `dist`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the public client values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Use only the Supabase anon key. Do not create a `VITE_` variable for the service-role key, and do not put that key in frontend code.

If either variable is missing, RSVP answers stay in the browser instead of the database.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run the files in `supabase/migrations` in order:
   - `20261012000000_invitation_rsvp.sql`
   - `20261012010000_reset_rsvps_and_admin.sql`
3. In Netlify, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy. Vite inlines those values during `npm run build`.
4. Confirm the site can search a guest, save an RSVP, and show that guest on the bar page.

The second migration clears every RSVP, renames guest `G048` to Nico, and adds `list_guests` and `add_guest` for the admin page at `/admin`.

The migrations create:

- `guests`: `id`, `full_name`, optional `invitation_token_hash`, `created_at`
- `rsvps`: `id`, `guest_id` (unique), `status` (`confirmed` for in, `declined` for out), `created_at`, `updated_at`
- `invitation_sessions`: short-lived tokens issued after a name match or a valid invite link

Row Level Security is enabled and direct table access is revoked for the anon and authenticated roles. The browser can call only these functions:

- `search_guests` returns matching `id` and `full_name` values
- `open_invitation` checks an exact name and returns one session
- `open_invitation_link` checks a pre-issued token against `invitation_token_hash`
- `get_invitation` restores a session
- `confirm_rsvp` saves one answer per guest. `confirmed` means I'm Down. `declined` means my parents won't let me. Repeating the same answer does not create another row.
- `list_confirmed_guests` returns people who are in
- `list_guests` returns the full roster for the admin page
- `add_guest` adds one new name with the next `G` id

Name search identifies someone on the list. It does not prove that the person at the keyboard is that guest. For a stronger check, store a SHA-256 hex digest of a long random token in `invitation_token_hash` and send the guest a link such as `https://your-domain/?invite=THE_RAW_TOKEN`. The raw token is removed from the address bar after it is exchanged for a session.

## Guest list

The bundled roster lives in `src/data/guests.ts`. `G048` is Nico. New names added on `/admin` are stored in the database when Supabase is configured, and in this browser otherwise.

## Deployment

### Netlify

`netlify.toml` sets the build command to `npm run build`, publishes `dist`, and sends every path (including `/admin`) back to `index.html`.

In the Netlify site settings, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the anon key only. Redeploy after changing them so the production build talks to the database.

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: the same two public variables

Redeploy after changing environment variables so Vite can inline them.
