# Database Notes

This production version uses one Postgres table:

- `dashboard_state`

Why this design:

- the dashboard is single-user
- your entire dashboard state is small
- it lets us move your current real local data into the cloud with minimal migration risk
- it keeps the front-end logic stable

## What is stored

The JSON payload contains:

- batches
- students
- payments
- class schedules
- attendance records

## Cloud flow

1. Browser logs in through the Vercel password gate.
2. Browser calls `/api/dashboard-data`.
3. Vercel API route reads or writes the JSON state in Postgres.
4. Browser also keeps local backup snapshots for extra safety.

## Table creation

The API route creates the table automatically if it does not exist.

Manual reference SQL:

- [schema.sql](C:/Users/70741577/OneDrive%20-%20Hitachi%20Group/Documents/New%20project/database/schema.sql)
