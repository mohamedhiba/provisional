create table if not exists monthly_missions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  month_start date not null,
  focus_theme text not null,
  primary_mission text,
  why_this_matters text,
  must_protect text,
  must_ignore text,
  current_week_focus text,
  targets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (profile_id, month_start)
);
