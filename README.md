# WELLNESS

Full-stack mood & wellness tracking application (personal learning project, 2026).
Learning modern Next.js, Clerk auth, Prisma + Supabase (PostgreSQL).

## Current status (May 2026)

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Clerk Authentication** (sign-up, sign-in, protected routes, UserButton)
- **Prisma ORM** + **Supabase** PostgreSQL (cloud-hosted)
- Mood logging with optional notes (user-scoped)
- Dashboard with mood history pagination
- Mood statistics dashboard with weekly/monthly trends, averages, and distribution
- API routes for mood logging and statistics
- Deployed to Vercel

## Features implemented

- Public landing page with quick mood picker
- Secure authentication & session management with Clerk
- Protected `/dashboard` route for logging moods
- Client-side mood selection + optional note input
- Server-side saving of moods with Clerk-verified user ID
- Mood history list with pagination
- Statistics page with:
  - Average mood scores (overall + this month)
  - Most common mood and full distribution
  - Best day this week insight
  - Weekly and monthly trend charts (Recharts)
- API endpoints:
  - `POST /api/log-mood` (create mood)
  - `GET /api/log-mood?page=1&limit=5` (paginate mood history)
  - `GET /api/mood-stats` (aggregated stats + trends)

## Data model

- Mood: `id`, `userId`, `mood`, `note`, `createdAt`

## Planned next steps

- Habit tracker section
- Dark mode toggle
- Weekly email summaries
- Calendar view + UI polish
- Advanced log interactions (edit/delete)
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
