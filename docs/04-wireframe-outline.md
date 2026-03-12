# Wireframe Outline

## Purpose

This document translates the product brief into low-fidelity screen structure before visual design or code.

## Design direction

The interface should feel like:

- a command center
- a mirror
- a serious system

The interface should not feel like:

- a playful habit app
- a bloated dashboard
- a Notion-style workspace

## Working assumptions

1. MVP is desktop-first but mobile-safe.
2. The first user is the account owner, not a team.
3. The app includes a minimal landing gate but the product core is the logged-in app.
4. The dashboard is the center of gravity.

## Global layout

### Public root: `/`

Purpose:

- explain the promise fast
- route user to sign in or start onboarding

Sections:

1. headline
2. short product promise
3. core daily loop
4. call to action

Wireframe:

```text
+------------------------------------------------------+
| PROOF                                                |
| Turn ambition into daily proof.                      |
| [Start Setup]                     [Sign In]          |
|                                                      |
| Know what matters. Do the work. Face the truth.      |
|                                                      |
| Morning clarity | Midday execution | Night review    |
+------------------------------------------------------+
```

### App shell

Desktop layout:

- left rail for navigation
- top bar for date, streak, and score context
- main content pane

Primary nav items:

- today
- sessions
- daily review
- weekly review
- analytics

Wireframe:

```text
+-----------+------------------------------------------+
| PROOF     | Thu Mar 12      Streak 6     Score 72    |
| Today     +------------------------------------------+
| Sessions  |                                          |
| Daily Rev |          main screen content             |
| Weekly    |                                          |
| Analytics |                                          |
+-----------+------------------------------------------+
```

## Screen 1: Onboarding

### Flow

Use a short 4-step wizard:

1. identity and mission
2. pillars
3. weekly targets
4. non-negotiables and defaults

### Step 1: Identity and mission

Fields:

- name
- mission statement
- long-term goal

Wireframe:

```text
+------------------------------------------------------+
| Step 1 of 4                                          |
| Who are you becoming?                                |
|                                                      |
| Name                  [__________________________]   |
| Mission               [__________________________]   |
| Long-term goal        [__________________________]   |
|                                                      |
|                                   [Continue]         |
+------------------------------------------------------+
```

### Step 2: Pillars

Fields:

- choose 3 to 4 pillars
- name each pillar

Wireframe:

```text
+------------------------------------------------------+
| Step 2 of 4                                          |
| What pillars define this season?                     |
|                                                      |
| [Academics] [Career] [Health] [Discipline]           |
| [Build] [Finances] [Custom +]                        |
|                                                      |
|                                   [Continue]         |
+------------------------------------------------------+
```

### Step 3: Weekly targets

Fields:

- target label
- number
- unit
- linked pillar

Wireframe:

```text
+------------------------------------------------------+
| Step 3 of 4                                          |
| What does a winning week look like?                  |
|                                                      |
| Career      Applications sent      [10] per week     |
| Academics   Study blocks           [12] per week     |
| Health      Workouts               [4]  per week     |
|                                                      |
|                                   [Continue]         |
+------------------------------------------------------+
```

### Step 4: Non-negotiables and defaults

Fields:

- non-negotiables
- default day structure
- accountability tone placeholder

Wireframe:

```text
+------------------------------------------------------+
| Step 4 of 4                                          |
| Set your standards.                                  |
|                                                      |
| Non-negotiables   [Sleep by 12, gym, no-scroll...]   |
| Default first move[Hard task before admin work]      |
| Tone             [Honest]                            |
|                                                      |
|                                      [Enter Proof]   |
+------------------------------------------------------+
```

## Screen 2: Today dashboard

### Priority

This is the most important screen in the product.

### Hierarchy

1. one thing
2. day score
3. top three
4. focus session entry
5. pillar progress
6. anti-drift warning
7. nightly review call to action

### Wireframe

```text
+--------------------------------------------------------------+
| TODAY                                    Score 68 | Strong   |
|--------------------------------------------------------------|
| ONE THING                                                     |
| Finish off-cycle internship applications batch                |
| [Mark Done]                           [Change with reason]    |
|                                                              |
| TOP THREE                                                     |
| [ ] Apply to 3 roles                                          |
| [ ] Finish project deployment notes                           |
| [ ] Complete 90-min ML study block                            |
|                                                              |
| PILLARS TOUCHED                                                |
| Career [##--] Academics [#---] Health [##--] Discipline [#---]|
|                                                              |
| FOCUS SESSIONS                                                |
| 2 planned today                              [Start Session]  |
|                                                              |
| WARNING                                                       |
| You logged activity, but not the highest-value work yet.      |
|                                                              |
| Tonight: daily review due by 9:00 PM          [Open Review]   |
+--------------------------------------------------------------+
```

## Screen 3: Focus session

### Goal

Make logging real work fast and concrete.

### Layout

Top half for session setup. Bottom half for current or recent sessions.

### Wireframe

```text
+------------------------------------------------------+
| START FOCUS SESSION                                  |
|                                                      |
| Task                 [__________________________]    |
| Pillar               [Career v]                     |
| Planned duration     [90] minutes                   |
| Work depth           [Deep v]                       |
|                                                      |
| [Start Session]                                     |
|                                                      |
| Recent sessions                                      |
| Project work         85 min   Deep   Quality 4/5    |
| LeetCode practice    45 min   Deep   Quality 3/5    |
+------------------------------------------------------+
```

### End session state

Fields:

- actual duration
- quality rating
- interruption count later

## Screen 4: Daily review

### Goal

Close the day with honesty in under 4 minutes.

### Layout

Single-column form with visible score summary at top.

### Wireframe

```text
+------------------------------------------------------+
| DAILY REVIEW                        Draft score: 74  |
|                                                      |
| What did you finish?                                  |
| [__________________________________________________] |
|                                                      |
| What did you avoid?                                   |
| [__________________________________________________] |
|                                                      |
| Why did you avoid it?                                 |
| [__________________________________________________] |
|                                                      |
| What wasted your time?                                |
| [__________________________________________________] |
|                                                      |
| Tomorrow's first move                                 |
| [__________________________________________________] |
|                                                      |
| [Submit Review]                                      |
+------------------------------------------------------+
```

### Completion state

Show:

- final score
- day classification
- one-line judgment

## Screen 5: Weekly review

### Goal

Convert raw activity into one behavioral adjustment.

### Layout

Top summary cards, then reflection questions, then next-week commitment.

### Wireframe

```text
+--------------------------------------------------------------+
| WEEKLY REVIEW                                                |
|--------------------------------------------------------------|
| Score 482 | Winning days 4 | Deep work 16.5h | Drift days 2  |
|                                                              |
| Missed top tasks: 3                                          |
| Most skipped pillar: Career                                  |
| Repeated excuse: "I was tired"                               |
|                                                              |
| What moved life forward this week?                           |
| [__________________________________________________________] |
|                                                              |
| What did not matter?                                         |
| [__________________________________________________________] |
|                                                              |
| One improvement next week                                    |
| [__________________________________________________________] |
|                                                              |
| [Lock Next Week Focus]                                       |
+--------------------------------------------------------------+
```

## Screen 6: Analytics

### Goal

Show only behavior-changing metrics.

### MVP sections

- top-task completion trend
- weekly deep work hours
- nightly review completion
- drift day count

### Rule

No vanity charts. Every graph should answer: what needs to change?

## Mobile behavior

For mobile:

- collapse left rail into a top menu
- keep one thing and score above the fold
- keep review forms single-column
- do not add extra widgets

## Visual guidance for later UI design

- strong typography
- restrained color system
- sharp spacing and hierarchy
- warning states should feel uncomfortable, not flashy
- green should mean proof, red should mean drift, neutrals should dominate

## Exit criteria for design phase

1. the one thing dominates the dashboard
2. every screen has one obvious action
3. session logging is fast
4. nightly review is easy to complete
5. the interface feels serious and minimal
