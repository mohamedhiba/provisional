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

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Add Supabase project values
4. Run `npm run dev`
5. Apply [`supabase/schema.sql`](/Users/mohamedhiba/Documents/Broad-activity%20/supabase/schema.sql) to your Supabase project

For remote persistence in the current build you need:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

When new files appear in `supabase/migrations/`, run `supabase db push` again so your
remote schema stays in sync with the app code.

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
