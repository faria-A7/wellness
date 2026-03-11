# WELLNESS

Full-stack mood & wellness tracking application (personal learning project 2026)
Learning modern Next.js, Clerk auth, Prisma + Supabase (PostgreSQL)

## Current status (March 2026)

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Clerk Authentication** (sign-up, login, protected routes, UserButton)
- **Dashboard** with interactive mood logging form (emoji selector + note)
- **API route** `/api/log-mood` to save mood entries to database
- **Prisma** ORM + **Supabase** PostgreSQL (cloud-hosted)
- Mood data saving works (user-specific, with timestamp)
- Responsive design basics

## Features implemented

- Public landing page with mood picker
- Secure user authentication & session management (Clerk)
- Protected `/dashboard` route (redirects to sign-in if not logged in)
- Client-side mood selection + optional note input
- Server-side saving of moods to Supabase (with userId verification)
- Basic success/error feedback on logging

## Planned next steps

- Display list of recent moods on dashboard (fetch from DB)
- Simple stats (most common mood, mood trend over time)
- One mood per day restriction (optional)
- Habit tracker section
- Dark mode toggle
- Deployment to Vercel
- Polish UI/UX (colors per mood, calendar view, etc.)

## How to run locally

```bash
git clone https://github.com/faria-A7/wellness.git
cd wellness
npm install
npm run dev
