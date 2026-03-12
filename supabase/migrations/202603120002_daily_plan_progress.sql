alter table if exists daily_plans
add column if not exists one_thing_done boolean not null default false;
