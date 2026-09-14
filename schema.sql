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

-- Conditions cache — see docs/family-hub-conditions-data-spec.md. The
-- fridge must never call Open-Meteo on render; a background refresh
-- (lib/conditions.js#refreshConditions, triggered by AutoRefresh) persists
-- here, and every page read is a plain row read. Same single-row idiom as
-- week_anchor — one household, one current forecast.
create table if not exists conditions_cache (
  id         boolean     primary key default true check (id),
  payload    jsonb       not null,
  fetched_at timestamptz not null default now()
);

-- Identity & device pairing — see docs/identity.md. Replaces the old
-- `fh_role` query-param cookie: a device now carries a role AND a person,
-- issued by pairing rather than a URL.
create table if not exists person_device (
  id           serial primary key,
  person       text,                  -- null when role = 'display'
  role         text        not null check (role in ('adult', 'child', 'display')),
  token_hash   text        not null unique, -- sha256 of the cookie value; plaintext never stored
  label        text,                  -- "Rose's iPhone", "Fridge iPad"
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at   timestamptz,
  check ((role = 'display') = (person is null))
);

create table if not exists pairing_code (
  id          serial primary key,
  code_hash   text        not null,   -- sha256 of the 6-digit code
  person      text,                   -- null for a display pairing
  role        text        not null check (role in ('adult', 'child', 'display')),
  issued_by   text        not null,   -- the adult who generated it
  attempts    int         not null default 0,
  expires_at  timestamptz not null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now(),
  check ((role = 'display') = (person is null))
);

-- Small settings/flags table. First row: 'bootstrap_complete', set once
-- SETUP_TOKEN claims the first adult identity — see docs/identity.md.
create table if not exists app_state (
  key   text  primary key,
  value jsonb not null
);

-- Gmail ingestion — see docs/ingestion.md and
-- docs/family-hub-gmail-ingestion-brief.md. The raw store is kept forever:
-- prompts get re-run and Q&A depends on it. `cleaned_body` and
-- `search_vector` back full-text Q&A; extraction (proposed_item) is a
-- separate, later pass over the same rows.
create table if not exists raw_message (
  id              serial primary key,
  source          text        not null check (source in ('seqta', 'bulletin', 'other')),
  message_id      text        not null unique,  -- RFC Message-ID, the dedupe key
  subject         text,
  sender          text,
  to_header       text,
  received_at     timestamptz,
  raw_body        text,
  cleaned_body    text,
  search_vector   tsvector generated always as (
                    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(cleaned_body, ''))
                  ) stored,
  processed_at    timestamptz
);
create index if not exists raw_message_search_idx on raw_message using gin (search_vector);

-- One row per extracted candidate. Always a proposal — see invariant 1 in
-- docs/ingestion.md: nothing reaches the fridge unreviewed.
create table if not exists proposed_item (
  id              serial primary key,
  raw_message_id  int references raw_message(id),
  kind            text        not null check (kind in
                    ('event', 'assessment', 'deadline', 'notice', 'commendation',
                     'pastoral_record', 'action', 'uniform_override')),
  persons         text[]      not null default '{}', -- 'household' is the sentinel for whole-school
  title           text        not null,
  starts_at       timestamptz,
  ends_at         timestamptz,
  all_day         boolean     not null default false,
  time_zone       text,
  location        text,
  uniform         text        check (uniform in ('formal', 'sport', 'house')),
  action_required boolean     not null default false,
  source_quote    text,
  source_url      text,
  confidence      numeric     not null default 1.0,
  duplicate_of    text,       -- the Home calendar event's `uid` string, if this
                               -- proposal is dedupeAgainstCalendar()'s match.
                               -- calendar_event isn't a persisted table yet
                               -- (see docs/ingestion.md), so no FK here.
  needs_review    boolean     not null default true,
  approver_role   text        check (approver_role in ('child', 'adult')),
  completed_at    timestamptz,           -- action items only
  created_at      timestamptz not null default now()
);

-- Rose's own to-do & assignments list — see docs/family-hub-todo-brief.md
-- (widens design-brief §7.11). `person` is the only write gate: every write
-- route checks `session.person = person`, never `role`, with one narrow
-- exception for `role = 'display'` toggling `done_at` from a personal view.
--
-- `family_visible` isn't in the brief's own "Data model" block, but the
-- brief's prose promises it twice ("Visibility is the owner's choice, as
-- with goals" / "An item Rose has kept to her own view never appears in the
-- block. No new setting") with no column to back it — added here to make
-- that acceptance check satisfiable at all.
create table if not exists todo_item (
  id                serial primary key,
  person            text        not null,
  title             text        not null,
  description       text,
  due               date,                 -- optional; no due = no surfacing, sits in its own group
  subject           text,                 -- key from lib/timetable.js; adults have none
  type              text        not null check (type in
                      ('assignment', 'test', 'exam', 'assessment', 'task')),
  family_visible    boolean     not null default true,
  done_at           timestamptz,
  set_from          text        check (set_from in ('display', 'phone')),
  proposed_item_id  int references proposed_item(id),
  created_at        timestamptz not null default now()
);
create index if not exists todo_item_person_idx on todo_item (person);

-- Approved proposed_item rows — same shape, plus approval metadata.
create table if not exists item (
  id                serial primary key,
  proposed_item_id  int references proposed_item(id),
  kind              text        not null,
  persons           text[]      not null default '{}',
  title             text        not null,
  starts_at         timestamptz,
  ends_at           timestamptz,
  all_day           boolean     not null default false,
  time_zone         text,
  location          text,
  uniform           text,
  action_required   boolean     not null default false,
  source_quote      text,
  source_url        text,
  display_eligible  boolean     not null default false,
  display_until     timestamptz,
  approved_by       text        not null,
  approved_at       timestamptz not null default now(),
  completed_at      timestamptz
);
