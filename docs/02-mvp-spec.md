# MVP Spec

## Product category

Proof is an execution accountability system, not a task manager.

## User journey

### Morning

The user opens the app to answer one question: what matters today?

Required outcomes:

- see today's one thing immediately
- define top three outcomes
- see current weekly momentum
- see which pillars need attention

### During the day

The user needs pressure toward meaningful work, not busy work.

Required outcomes:

- log focus sessions quickly
- connect each session to a pillar
- compare planned versus actual effort
- surface drift when meaningful work is being delayed

### Evening

The day must close with truth, not vibes.

Required outcomes:

- record what was finished
- record what was avoided
- identify wasted time
- set tomorrow's first move
- calculate the day's score

### Weekly

The week must reveal patterns and force adjustment.

Required outcomes:

- summarize winning versus drift days
- total deep work hours
- show missed top tasks
- identify repeated excuses
- lock one improvement for next week

## MVP screens

### 1. Onboarding

Fields:

- name
- mission statement
- pillars
- weekly targets
- non-negotiables
- default daily priorities

Outputs:

- user profile
- active pillars
- weekly target definitions
- accountability tone preset placeholder

### 2. Today dashboard

Visible hierarchy:

1. one thing
2. current day score
3. top three outcomes
4. focus session entry point
5. pillar progress
6. anti-drift warning
7. nightly review entry point

Required interactions:

- set or edit one thing
- manage top three
- mark outcomes complete
- open session logger
- view simple progress state per pillar

### 3. Focus session

Fields:

- task title
- linked pillar
- planned duration
- actual duration
- deep or shallow
- quality rating
- interruption count optional for v1.1

Required actions:

- start session
- end session
- save evidence of work

### 4. End-of-day review

Fields:

- what finished
- what avoided
- why it was avoided
- what wasted time
- was today a winning day
- tomorrow's first move

System outputs:

- day score
- day classification
- short judgment line

### 5. Weekly review

Metrics:

- total score
- winning days
- top-task completion rate
- deep work hours
- most-missed pillar
- repeated excuses
- next-week focus

## Scoring model v1

Positive scoring:

- top task completed: `+30`
- each top-three outcome completed: `+15`
- each deep work session completed: `+10`
- all active pillars touched: `+10`
- nightly review completed: `+10`
- sleep or workout compliance: `+5` each

Penalties:

- top task missed: `-20`
- no deep work sessions: `-15`
- skipped nightly review: `-10`
- repeated rollover task: `-10`
- no career progress day: `-10`

Day classifications:

- `90-100`: elite
- `75-89`: strong
- `60-74`: acceptable
- `40-59`: weak
- `<40`: drift day

## Core entities

### profiles

- id
- name
- mission
- created_at

### pillars

- id
- profile_id
- name
- color
- active

### weekly_targets

- id
- profile_id
- pillar_id
- label
- target_number
- target_unit

### daily_plans

- id
- profile_id
- date
- one_thing
- top_three_json
- day_score
- status

### tasks

- id
- daily_plan_id
- title
- pillar_id
- priority
- completed
- rolled_over

### focus_sessions

- id
- profile_id
- date
- task_title
- pillar_id
- planned_minutes
- actual_minutes
- quality_rating
- work_depth

### daily_reviews

- id
- profile_id
- date
- finished_text
- avoided_text
- why_avoided_text
- wasted_time_text
- tomorrow_first_move
- self_rating

### weekly_reviews

- id
- profile_id
- week_start
- wins
- failures
- patterns
- next_week_focus

## Behavioral rules

1. The user gets only one top task and three outcomes.
2. A day remains incomplete until a nightly review is submitted.
3. The top task carries the largest score weight.
4. Repeated rollover is penalized.
5. Session logging must take less than 20 seconds to start.
6. Changing the one thing should require confirmation.

## Non-goals for v1

- monthly planning
- AI-generated behavioral coaching
- career CRM depth
- donation penalties
- account sharing
- heavy customization
