# Tokyo Chess Classes

Single-user dashboard for managing:

- students
- batches
- monthly class dates
- attendance
- payments
- finance summaries

## Production architecture

This version is designed for long-term Vercel use:

- static front-end: `index.html`, `styles.css`, `app.js`
- password-protected Vercel API routes
- Postgres-backed cloud storage through `/api/dashboard-data`
- local browser backup/export still kept as an extra safety layer

The deployed site stores your real business data in Postgres, not only in browser `localStorage`.

## Environment variables

Set these in Vercel:

- `DASHBOARD_PASSWORD`
- `SESSION_SECRET`
- `POSTGRES_URL`

`DATABASE_URL` also works if you prefer that name instead of `POSTGRES_URL`.

## How data works now

- On local file preview, the app still works from browser storage.
- On Vercel, the app loads data from Postgres after login.
- Browser storage is still kept as a mirror and for backup snapshots.
- `Export Backup` creates a JSON backup file you can keep outside the browser.

## First production launch

1. Export a backup from your current local version.
2. Push this repo to GitHub.
3. Import the repo into Vercel.
4. Add `DASHBOARD_PASSWORD`, `SESSION_SECRET`, and `POSTGRES_URL`.
5. Deploy.
6. Open the live site and log in.
7. Use `Import Backup` once on the live site to move your current real data into the cloud database.

After that, the live site becomes your main working version.

## Database

The app uses a single durable Postgres table to store the dashboard state document for this one-user workflow.

Schema reference:

- [database/schema.sql](C:/Users/70741577/OneDrive%20-%20Hitachi%20Group/Documents/New%20project/database/schema.sql)

## Local check

If Node is available:

```powershell
npm install
npm run check
```
