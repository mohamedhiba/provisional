alter table profiles
add column if not exists week_starts_on text not null default 'monday';
