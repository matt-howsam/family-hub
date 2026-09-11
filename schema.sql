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

-- Meal planner. Replaces the fridge whiteboard — see
-- docs/family-hub-meal-planner-brief.md. A card is archived, never deleted,
-- because past nights reference it; `night` is a date, never a timestamptz,
-- for the same reason an all-day calendar entry is — an instant would shift
-- a night across the 4 October DST change.
create table if not exists meal_card (
  id          serial primary key,
  title       text        not null unique,
  icon        text        not null, -- Phosphor icon name
  kind        text        not null check (kind in ('meal', 'not_cooking')),
  prep_note   text,                 -- one line, e.g. "Take the mince out"
  prep_when   text        check (prep_when in ('morning', 'night_before')),
  position    int         not null, -- display order, set by hand — not `order`, reserved
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  check ((prep_note is null) = (prep_when is null))
);

create table if not exists meal_plan (
  night        date        primary key,
  meal_card_id int         not null references meal_card(id),
  set_from     text        not null check (set_from in ('display', 'phone')),
  set_by       text,                -- person enum from a phone; null from the display
  updated_at   timestamptz not null default now()
);

-- Not-cooking cards, always seeded. Meals are the actual staples off the
-- whiteboard — never invented, per the brief.
insert into meal_card (title, icon, kind, position) values
  ('Leftovers',            'ArrowsClockwise', 'not_cooking', 1),
  ('Eating out',           'ForkKnife',       'not_cooking', 2),
  ('Takeaway',             'Package',         'not_cooking', 3),
  ('Fend for yourself',    'Question',        'not_cooking', 4),
  ('Away',                 'Suitcase',        'not_cooking', 5),
  ('Spag bol',             'BowlFood',        'meal',        6),
  ('Beef strog',           'CookingPot',      'meal',        7),
  ('Popcorn pork',         'Popcorn',         'meal',        8),
  ('Butter chicken curry', 'CookingPot',      'meal',        9),
  ('Katsu curry',          'CookingPot',      'meal',        10),
  ('Steak & mash',         'ForkKnife',       'meal',        11),
  ('Salmon & potato',      'Fish',            'meal',        12),
  ('Pizza',                'Pizza',           'meal',        13)
on conflict (title) do nothing;
