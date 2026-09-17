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

-- The review queue — see docs/family-hub-gmail-ingestion-brief.md. `ALTER
-- ... ADD COLUMN IF NOT EXISTS` rather than editing the CREATE TABLE above:
-- proposed_item already exists in production from the ingestion build, and
-- `create table if not exists` is a no-op against an existing table, so it
-- would silently never add these. Kept on proposed_item itself, not a
-- separate table, so "handled" is one fact regardless of whether the
-- decision lands in `item`, `todo_item`, or nowhere (discarded).
alter table proposed_item add column if not exists reviewed_at timestamptz;
alter table proposed_item add column if not exists reviewed_by text;
alter table proposed_item add column if not exists decision text
  check (decision in ('approved', 'discarded'));

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

-- Spending scorecard — see docs/family-hub-spending-scorecard-brief.md.
-- Digitises the Howsam Discretionary Spending Scorecard. Numbers only, never
-- transactions: categorisation happens outside the app and eleven weekly
-- figures arrive already sorted.
create table if not exists spend_category (
  key         text primary key,
  label       text        not null,
  description text,                 -- the card's own subtitle line
  position    int         not null, -- display order, set by hand — not `order`, reserved
  archived_at timestamptz
);

insert into spend_category (key, label, description, position) values
  ('groceries',              'Groceries',              'Aldi, Coles, Woolworths, butcher, fruit & veg',        1),
  ('fuel',                   'Fuel',                    'Petrol & diesel — incl. Renée''s Brisbane travel',     2),
  ('cafes_takeaway',         'Cafés & Takeaway',        'Cafes, restaurants, takeaway, bakeries, Brisbane meals', 3),
  ('alcohol',                'Alcohol',                 'Liquorland, Dan Murphy''s, BWS, Taphouse',             4),
  ('shopping',               'Shopping',                'Clothes, gifts, beauty, Kmart, Big W, homewares',      5),
  ('home_projects',          'Home Projects',           'Bunnings, hardware, appliances, improvements',         6),
  ('hobbies_entertainment',  'Hobbies & Entertainment', 'BCF, tackle, bikes, movies, outings, experiences',     7),
  ('school_kids_extras',     'School & Kids Extras',    'Excursions, uniforms, camps, resources, books',        8),
  ('medical_pharmacy',       'Medical & Pharmacy',      'Chemist, doctor, prescriptions, health & beauty',      9),
  ('work_accommodation',     'Work Accommodation',      'Renée — Brisbane overnight, ~$150 × 4 nights',         10),
  ('unplanned_spending',     'Unplanned Spending',      'Genuine one-offs, impulse buys, Amazon, eBay',         11)
on conflict (key) do nothing;

-- One row per calendar month. `locked_at` freezes budget_event entries for
-- that month — see "Budget events are frozen when the month opens" in the
-- brief. Amendments after lock are permitted but render as amendments.
create table if not exists spend_period (
  id         serial primary key,
  year       int         not null,
  month      int         not null check (month between 1 and 12),
  locked_at  timestamptz,
  created_at timestamptz not null default now(),
  unique (year, month)
);

-- Stored, not computed, so an unusual cut (a long Week 4, a deliberate
-- re-cut) survives and stays auditable. Weeks are day-of-month ranges, never
-- ISO weeks: 1–7, 8–14, 15–21, 22–end. `ends_on` is a date, never a
-- timestamptz, computed in Australia/Sydney — see lib/week.js.
create table if not exists spend_week (
  period_id int  not null references spend_period(id),
  week_no   int  not null check (week_no between 1 and 4),
  starts_on date not null,
  ends_on   date not null,
  primary key (period_id, week_no)
);

-- Base budget per category, edited rarely, plus the sum of any budget_event
-- rows landing in that category and month. `event_amount` is a cached sum,
-- not a join target — see budget_event below.
create table if not exists spend_budget (
  period_id     int  not null references spend_period(id),
  category_key  text not null references spend_category(key),
  base_amount   int  not null,           -- cents
  event_amount  int  not null default 0, -- cents; sum of budget_event for this period+category
  primary key (period_id, category_key)
);

-- Known events — birthdays, Christmas, school holidays, back to school —
-- that raise specific categories in specific months, funded by lowering
-- quiet months. `amount` is signed: school holidays move spending both
-- ways (Groceries up, School & Kids Extras down), and an unsigned allowance
-- only models half the effect. `amended_at` is set once the period is
-- locked, so a change after the freeze is visibly an amendment.
create table if not exists budget_event (
  id           serial primary key,
  name         text        not null,   -- 'Rose birthday'
  year         int         not null,
  month        int         not null check (month between 1 and 12),
  category_key text        not null references spend_category(key),
  amount       int         not null,   -- cents, signed
  note         text,
  created_at   timestamptz not null default now(),
  amended_at   timestamptz             -- non-null once the period is locked
);

-- The eleven weekly figures. An absent row is "not entered"; a row with
-- amount = 0 is "spent nothing" — the two must never be coalesced, or a
-- partial month silently reads as an under-spend.
create table if not exists spend_entry (
  period_id    int         not null references spend_period(id),
  week_no      int         not null check (week_no between 1 and 4),
  category_key text        not null references spend_category(key),
  amount       int         not null,   -- cents; 0 is meaningful, absent row is not
  entered_at   timestamptz not null default now(),
  entered_by   text,                   -- person enum
  primary key (period_id, week_no, category_key)
);

-- The Sunday Night Review — three sentences, the ritual that makes the
-- numbers matter. Nothing here is required; a week with numbers and no
-- sentences is a normal week.
create table if not exists sunday_review (
  period_id   int  not null references spend_period(id),
  week_no     int  not null check (week_no between 1 and 4),
  win                 text,
  biggest_unnecessary text,
  one_change          text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (period_id, week_no)
);

-- Categorisation ruleset, shipped as data even though nothing reads it yet
-- — see "How the data arrives" in the brief. Not seeded: the household's
-- merchant rules live in spending-rules-and-aug-w4.md, which is not yet in
-- this repo. Seed it from that document when in-app categorisation is built,
-- rather than starting the rule table over.
create table if not exists merchant_rule (
  id           serial primary key,
  pattern      text        not null,
  category_key text        not null references spend_category(key),
  priority     int         not null default 0,
  created_at   timestamptz not null default now()
);

-- September 2026: the live period. $4,650 total, Alcohol raised to $300
-- from August's $160 — see the photographed card,
-- docs/designs/Family Hub_ tablet and mobile/scraps/scorecard.txt.
insert into spend_period (year, month, locked_at) values
  (2026, 9, '2026-09-01T00:00:00+10:00')
on conflict (year, month) do nothing;

insert into spend_week (period_id, week_no, starts_on, ends_on)
select id, week_no, starts_on::date, ends_on::date
from spend_period, (values
  (1, '2026-09-01', '2026-09-07'),
  (2, '2026-09-08', '2026-09-14'),
  (3, '2026-09-15', '2026-09-21'),
  (4, '2026-09-22', '2026-09-30')
) as w(week_no, starts_on, ends_on)
where spend_period.year = 2026 and spend_period.month = 9
on conflict (period_id, week_no) do nothing;

insert into spend_budget (period_id, category_key, base_amount)
select id, c.category_key, c.base_amount
from spend_period, (values
  ('groceries',             120000),
  ('fuel',                   35000),
  ('cafes_takeaway',         70000),
  ('alcohol',                30000),
  ('shopping',               40000),
  ('home_projects',          20000),
  ('hobbies_entertainment',  20000),
  ('school_kids_extras',     25000),
  ('medical_pharmacy',       20000),
  ('work_accommodation',     60000),
  ('unplanned_spending',     25000)
) as c(category_key, base_amount)
where spend_period.year = 2026 and spend_period.month = 9
on conflict (period_id, category_key) do nothing;

-- August 2026: the first comparison month, closed and read-only. Same
-- category budgets as September except Alcohol, which was $160 before the
-- September raise — the $140 difference accounts for the full
-- $4,510 → $4,650 change, per the card's own note.
-- Per-category, per-week actuals are NOT seeded here: the repo holds only
-- the photographed card's total ($5,535 actual vs $4,510 budget, $1,025
-- over, driven by two birthdays and Father's Day inside Cafés and
-- Shopping). The real weekly-by-category figures from the photographed
-- August card still need to be entered before this month can render as a
-- true comparison month rather than an all-unentered one.
insert into spend_period (year, month, locked_at) values
  (2026, 8, '2026-08-01T00:00:00+10:00')
on conflict (year, month) do nothing;

insert into spend_week (period_id, week_no, starts_on, ends_on)
select id, week_no, starts_on::date, ends_on::date
from spend_period, (values
  (1, '2026-08-01', '2026-08-07'),
  (2, '2026-08-08', '2026-08-14'),
  (3, '2026-08-15', '2026-08-21'),
  (4, '2026-08-22', '2026-08-31')
) as w(week_no, starts_on, ends_on)
where spend_period.year = 2026 and spend_period.month = 8
on conflict (period_id, week_no) do nothing;

insert into spend_budget (period_id, category_key, base_amount)
select id, c.category_key, c.base_amount
from spend_period, (values
  ('groceries',             120000),
  ('fuel',                   35000),
  ('cafes_takeaway',         70000),
  ('alcohol',                16000),
  ('shopping',               40000),
  ('home_projects',          20000),
  ('hobbies_entertainment',  20000),
  ('school_kids_extras',     25000),
  ('medical_pharmacy',       20000),
  ('work_accommodation',     60000),
  ('unplanned_spending',     25000)
) as c(category_key, base_amount)
where spend_period.year = 2026 and spend_period.month = 8
on conflict (period_id, category_key) do nothing;
