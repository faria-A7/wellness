# WELLNESS

Full-stack mood & wellness tracking application (personal learning project, 2026).
Learning modern Next.js, Clerk auth, Prisma + Supabase (PostgreSQL).

## Preview

![Homepage](public/screenshots/homepage.png)

This is a preview of the Homepage of WELLNESS.

## Current status (June 2026)

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Clerk Authentication** (sign-up, sign-in, protected routes, profile updates)
- **Prisma ORM** + **Supabase** PostgreSQL (cloud-hosted)
- Mood logging with optional notes (user-scoped)
- Dashboard with mood history pagination, edit, and delete
- Mood statistics dashboard with weekly/monthly trends, averages, and distribution
- CSV export for mood history
- Settings page with local dark mode toggle, profile info, and profile picture upload
- API routes for mood logging, statistics, and export
- Deployed to Vercel

## Features implemented

- Public landing page with quick mood picker and auth CTA
- Secure authentication & session management with Clerk
- Protected `/dashboard` route for logging moods
- Client-side mood selection + optional note input
- Server-side saving of moods with Clerk-verified user ID
- Mood history list with pagination, edit note, and delete log actions
- Statistics page with:
  - Average mood scores (overall + this month)
  - Most common mood and full distribution
  - Best day this week insight
  - Weekly and monthly trend charts (Recharts)
- CSV export of mood history from the statistics page
- Settings page with:
  - Local dark mode toggle (persisted in local storage)
  - Profile name update and profile picture upload via Clerk
- API endpoints:
  - `POST /api/log-mood` (create mood)
  - `GET /api/log-mood?page=1&limit=5` (paginate mood history)
  - `PATCH /api/log-mood` (update mood note)
  - `DELETE /api/log-mood` (delete mood log)
  - `GET /api/mood-stats` (aggregated stats + trends)
  - `GET /api/export-moods` (download CSV)

## Data model

- Mood: `id`, `userId`, `mood`, `note`, `createdAt`

## Planned next steps

- Word limits for mood notes
- Habit tracker section (daily habits, completion tracking)
- Weekly email summaries
- Calendar view + UI polish
- AI insights

## How to run locally

```bash
git clone https://github.com/faria-A7/wellness.git
cd wellness
npm install
```

Create a `.env` file with:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
DATABASE_URL=...
DIRECT_URL=...
```

Then start the dev server:

```bash
npm run dev
```
