create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  device_id text unique,
  name text not null,
  mission text,
  long_term_goal text,
  non_negotiables text,
  default_first_move text,
  tone text not null default 'Honest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_identity_check check (
    auth_user_id is not null or device_id is not null
  )
);

create table if not exists pillars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  color text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists weekly_targets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete set null,
  label text not null,
  target_number integer not null,
  target_unit text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan_date date not null,
  one_thing text not null,
  one_thing_done boolean not null default false,
  top_three jsonb not null default '[]'::jsonb,
  day_score integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (profile_id, plan_date)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references daily_plans(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete set null,
  title text not null,
  priority text not null,
  is_completed boolean not null default false,
  is_rolled_over boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete set null,
  session_date date not null,
  task_title text not null,
  planned_minutes integer not null,
  actual_minutes integer,
  quality_rating integer check (quality_rating between 1 and 5),
  work_depth text not null default 'deep',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists daily_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  review_date date not null,
  finished_text text,
  avoided_text text,
  why_avoided_text text,
  wasted_time_text text,
  tomorrow_first_move text,
  self_rating integer check (self_rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (profile_id, review_date)
);

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  wins text,
  failures text,
  patterns text,
  next_week_focus text,
  created_at timestamptz not null default now(),
  unique (profile_id, week_start)
);
