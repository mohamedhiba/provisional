# Build Roadmap

## Goal

Build the smallest web product that changes daily behavior before adding advanced features.

## Stage 1: Product definition

Status: complete for first pass

Deliverables:

- product brief
- MVP scope
- behavioral rules
- core data model
- build roadmap

Exit criteria:

- the product promise is clear
- MVP is constrained
- non-goals are explicit
- core loop is locked

## Stage 2: UX and flow design

Target: 2 to 4 days

Deliverables:

1. low-fidelity wireframes for onboarding, dashboard, focus session, end-of-day review, and weekly review
2. screen-by-screen user flow
3. hierarchy validation for the dashboard
4. friction review for session logging and nightly review

Questions to answer:

- Is the one thing impossible to miss?
- Is score visible without clutter?
- Is nightly review fast enough to complete daily?
- Does the app feel serious, not cute?

Exit criteria:

- each screen has a single primary action
- the daily loop can be completed without confusion
- no extra screens exist outside MVP

## Stage 3: Technical foundation

Target: 1 to 2 days

Status: complete for first pass

Deliverables:

1. initialize Next.js app
2. install Tailwind CSS and shadcn/ui
3. configure Supabase project and environment variables
4. create base layout, theme tokens, and route structure
5. create database schema for MVP entities

Route plan:

- `/`
- `/onboarding`
- `/today`
- `/sessions`
- `/review/daily`
- `/review/weekly`
- `/analytics`

Exit criteria:

- app boots locally
- auth works
- schema is created
- routes exist as shells

## Stage 4: MVP feature build

Target: 7 to 14 days

### Step 4.1 Onboarding

Status: first pass complete with local persistence

Build:

- onboarding form
- mission and pillars storage
- weekly targets storage

Done when:

- new user can complete setup in one pass
- data persists correctly

### Step 4.2 Today dashboard

Status: first pass complete with remote persistence

Build:

- one thing card
- top three outcomes
- score panel
- pillar progress
- anti-drift status slot

Done when:

- user can plan the day in less than 3 minutes
- task completion updates score live or on refresh

### Step 4.3 Focus session logging

Status: first pass complete with remote persistence

Build:

- session create flow
- start and end controls
- planned versus actual tracking
- quality rating

Done when:

- session can be logged fast
- session totals appear on the dashboard

### Step 4.4 End-of-day review

Build:

- daily review form
- score computation
- day classification
- tomorrow first move capture

Done when:

- day closes with a stored review
- skipped review leaves day incomplete

### Step 4.5 Weekly review

Build:

- weekly metrics summary
- reflection form
- pattern summary
- next-week focus capture

Done when:

- weekly review shows real data
- user leaves with one concrete adjustment

### Step 4.6 Simple analytics

Build:

- top-task completion trend
- deep work hours
- drift day count
- nightly review completion rate

Done when:

- analytics highlight behavior, not vanity stats

## Stage 5: Personal validation

Target: 30 days

Rules:

- use the app every day
- no new features unless friction blocks usage
- log real work only
- complete nightly review honestly
- complete weekly review every week

Track:

- top-task completion rate
- weekly deep work hours
- drift days
- applications or study outputs
- review completion rate

Exit criteria:

- behavior improved measurably
- dead features are obvious
- next upgrades are earned by evidence

## Stage 6: Post-MVP upgrades

Only after validation.

Candidates:

1. monthly mission layer
2. drift analytics and pattern detection
3. career tracker
4. stronger consequence system

## Working order for us

1. lock product brief
2. sketch wireframes
3. scaffold the web app
4. build onboarding
5. build today dashboard
6. build sessions
7. build daily review
8. build weekly review
9. test with real use

## Current next step

Build the end-of-day review so the system can close the day with a score, judgment, and tomorrow's first move.
