alter table focus_sessions
  add column if not exists preload_minutes integer not null default 0,
  add column if not exists recovery_minutes integer not null default 10,
  add column if not exists focus_mode text not null default 'timed',
  add column if not exists activation_label text,
  add column if not exists environment_label text,
  add column if not exists recovery_label text,
  add column if not exists distraction_count integer not null default 0,
  add column if not exists session_status text not null default 'completed',
  add column if not exists closure_notes text;
