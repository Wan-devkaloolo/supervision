# STHC Site Ops — setup (about 20 minutes)

Files: `index.html` (the app), `schema.sql` (database), `manifest.json` (lets phones install it).

## 1. Database
1. Supabase → create a new project (or use your existing one).
2. SQL Editor → paste all of `schema.sql` → Run.

## 2. Connect the app
1. Supabase → Project Settings → API. Copy the Project URL and the `anon public` key.
2. Open `index.html`, find the two lines near the top of the script, and paste them in.
   (The anon key is meant to be public. Security comes from the login rules in schema.sql.)

## 3. Create logins
1. Supabase → Authentication → Add user. Create yourself first, then each supervisor (email + password, tick "auto confirm").
2. Make yourself CEO: SQL Editor →
   `update profiles set role = 'ceo' where id = (select id from auth.users where email = 'YOUR_EMAIL');`
3. Supervisors stay as "supervisor" by default and only see the sites assigned to them.

## 4. Host it
Put `index.html` and `manifest.json` in a folder, deploy to Vercel (drag-and-drop or `vercel` CLI). Open the link on a phone → browser menu → "Add to Home Screen".

## 5. Use it
- You: Manage tab → add a site, assign a supervisor, paste the checklist.
- Supervisor: logs in, sees their sites, checks in, ticks tasks, sends updates and photos, reports issues.
- You: Live board updates by itself. Open issues show in red; "OVER" appears when a job passes its quoted days.

## Known limits of version 1
- Needs internet; no offline queue yet.
- Alerts are visual only (no WhatsApp/push yet).
- Photos are in a public bucket (links are hard to guess but not private).
