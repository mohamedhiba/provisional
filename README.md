# Proof

Proof is a web-based execution accountability system for ambitious people who know what they want but struggle to execute consistently.

This repository starts with product definition, not code. The goal is to build the smallest version that measurably improves discipline, deep work, and consistency over 30 days.

## Current phase

Stage 4: MVP feature build

Files to use:

- `docs/01-product-brief.md`
- `docs/02-mvp-spec.md`
- `docs/03-build-roadmap.md`
- `docs/04-wireframe-outline.md`

## App foundation

Stage 3 foundation is now in place:

- Next.js app router
- MVP route shells
- shared app shell and navigation
- Tailwind-based theme foundation
- Supabase schema and client helpers

Stage 4.1 has started:

- multi-step onboarding flow
- local persistence for setup data
- dashboard personalization from onboarding output

Stage 4.2 foundation is now in place:

- shared onboarding/profile provider
- `/api/profile` persistence route
- Supabase-first save/load path
- local fallback when Supabase is not configured

Stage 4.3 has started:

- real daily plan model
- `/api/daily-plan` persistence route
- editable Today command center
- live daily score and anti-drift feedback

Stage 4.4 has started:

- real focus session model
- `/api/focus-sessions` persistence route
- working session logger
- real session evidence on the Today dashboard

Stage 4.5 has started:

- weekly review persistence and real weekly metrics
- multi-week analytics history and streak tracking
- monthly mission layer with dashboard alignment

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Add Supabase project values
4. Run `npm run dev`
5. Apply [`supabase/schema.sql`](/Users/mohamedhiba/Documents/Broad-activity%20/supabase/schema.sql) to your Supabase project

For remote persistence in the current build you need:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

When new files appear in `supabase/migrations/`, run `supabase db push` again so your
remote schema stays in sync with the app code.

## Auth setup

Magic-link auth uses a canonical app URL so deployed emails do not bounce back to
localhost.

Required environment variables:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local development
- `NEXT_PUBLIC_APP_URL=https://provisional-beta.vercel.app` in Vercel production
- `GOOGLE_GENERATIVE_AI_API_KEY=...` if you want AI briefings enabled
- `GOOGLE_GENERATIVE_AI_MODEL=gemini-2.5-flash` optional override

Required Supabase Auth settings:

- Site URL: `https://provisional-beta.vercel.app`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://provisional-beta.vercel.app/auth/callback`

After changing auth settings in Supabase or env vars in Vercel, redeploy the site so
new magic-link emails use the correct callback origin.

## AI briefings

Proof can generate a short personalized briefing on the Today screen using Gemini.

The current implementation:

- uses `GOOGLE_GENERATIVE_AI_API_KEY` from Google AI Studio
- defaults to `gemini-2.5-flash`
- changes the briefing by time window:
  - morning brief
  - midday reset
  - week opening
  - midweek correction
  - month opening
  - midmonth checkpoint
  - month-end push
- grounds the message in persisted app data:
  - today
  - yesterday
  - weekly review summary
  - monthly mission progress
  - drift alerts

If the Gemini key is missing or the API fails, the app falls back to a deterministic
rule-based briefing so the UI still works.

## Working product promise

When the user opens Proof, they should leave knowing:

- what matters today
- whether they are winning or drifting
- what must happen next

## Phase rule

Do not add features before the core loop works:

1. morning clarity
2. focused execution
3. nightly truth
4. weekly adjustment
