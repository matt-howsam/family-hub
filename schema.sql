-- Family Hub — release 1 schema.
-- Run once against the Neon branch: psql "$DATABASE_URL" -f schema.sql

-- The week letter is remembered state, household-level, exactly one row.
-- The boolean primary key with a check constraint is the single-row idiom:
-- there is no second household, and a second row would be a bug.
create table if not exists week_anchor (
  id         boolean primary key default true check (id),
  letter     char(1)     not null check (letter in ('A','B')),
  monday     date        not null,
  set_by     text        not null,
  updated_at timestamptz not null default now()
);

insert into week_anchor (id, letter, monday, set_by)
values (true, 'B', '2026-09-07', 'Matt')
on conflict (id) do nothing;
