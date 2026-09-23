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

-- Holidays — see docs/family-hub-design-brief.md §7.6, revised per Matt,
-- 22 September 2026: unlimited entries, not a fixed ten-slot structure.
-- "Two major trips a year" is now a household guideline the `major` flag
-- denotes, not something the schema enforces or pre-allocates space for.
-- The earlier design's holiday_slot table (exactly ten pre-created
-- year/period rows) never shipped to real use, so this replaces it
-- outright rather than migrating it.
--
-- Certainty is deliberately just "has a date or not": a row with
-- starts_on is a planned trip: shows on the dashboard tile as the next
-- thing to look forward to. A row with no starts_on is an undated idea,
-- shown in its own quiet list. No booked/committed/candidate ladder, no
-- retire-with-reason mechanic — an idea that's a no gets deleted outright.
create table if not exists holiday (
  id         serial primary key,
  title      text        not null unique,
  major      boolean     not null default false, -- the big, overseas-trip flag
  starts_on  date,                                -- null = an undated idea
  nights     int,                                 -- null for a day trip or an undated idea
  who        text[],                              -- null = whole family; else an explicit person list —
                                                    -- "who's going" is a first-class attribute, not a note (§7.6)
  budget     int,                                  -- cents
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed content from §7.6, reshaped to the simplified fields. Straddie's
-- dates are the Good Friday–Easter Monday long weekend (lib/calendar.js);
-- its $678.90 mirrors the Operations Register row until that module
-- exists to join against. Perisher and the North America ski trip keep
-- their major-trip status; the slot they used to occupy is gone.
insert into holiday (title, major, starts_on, nights, budget, note) values
  ('Straddie / Minjerribah', false, '2027-03-26', 3,    67890, 'Easter long weekend'),
  ('Ski Perisher',           true,  null,         null, null,  'Winter 2027'),
  ('Ski North America',      true,  null,         null, null,  'January 2028')
on conflict (title) do nothing;

insert into holiday (title, major) values
  ('Burning Man', true),
  ('Summer in Europe', true),
  ('Indo surf trip', false),
  ('Sail the Whitsundays', false),
  ('Darwin fishing trip', false)
on conflict (title) do nothing;

-- Operations register. Digitises the Howsam Household Operations Register —
-- see docs/family-hub-design-brief.md §7.2 and the attached PDF in
-- docs/designs/. Renewal dates, vendors, K/R/A status and category totals
-- are wall content; `notes` is where the paper's real policy numbers,
-- rego plates and "switching to X" commentary live, so it is phone-only,
-- never rendered on the fridge — same treatment the calendar already gives
-- private event descriptions.
--
-- `cost_period` + `cost_kind` are kept apart rather than folded into one
-- "cost basis" field, per the brief's own instruction: "~$175 working avg/mo"
-- and "$346.50 per month" are different kinds of number and showing both as
-- a flat dollar figure would be a lie. `cost_period` is what the displayed
-- figure is denominated in; `cost_kind` says whether it's a known actual, a
-- rough estimate, a budgeted allowance, a running working average, or a
-- one-off running total (paid_to_date). `frequency` is the separate,
-- genuinely different question of how often the bill actually arrives —
-- Electricity is `working_avg`/month but bills `quarterly`.
--
-- `renewal_label` is the raw text from the paper ("19th mthly", "~22 Oct",
-- "Feb–Mar cluster") and is always what's shown — real financial dates are
-- exactly where a confident wrong guess is the worst kind of wrong.
-- `renewal_date` is a best-effort parse of the same fact, used only for
-- sorting and the "N renewals in 30 days" derived figures, and is left null
-- wherever the paper itself has no resolvable day.
create table if not exists register_item (
  id             serial primary key,
  section        text        not null check (section in (
                   'home_utilities', 'digital_comms', 'transport',
                   'family_children_holidays', 'health_insurance')),
  service        text        not null unique,       -- one row per line item; also the seed's re-run key
  provider       text,
  cost_cents     int,                              -- null when genuinely TBC
  cost_period    text        check (cost_period in ('month', 'year', 'term')),
  cost_kind      text        not null default 'actual'
                 check (cost_kind in ('actual', 'working_avg', 'estimate', 'allowance', 'paid_to_date', 'tbc')),
  frequency      text        not null check (frequency in (
                   'monthly', 'quarterly', 'annual', 'per_term', 'fixed_term', 'one_off')),
  renewal_date   date,
  renewal_label  text,
  status         text        not null default 'k' check (status in ('k', 'r', 'a')),
  status_set_at  timestamptz,
  excluded_from_reducing_number boolean not null default false, -- mortgage, school fees
  hide_cost_on_fridge boolean not null default false, -- the mortgage payment amount, specifically (§6)
  notes          text,                             -- phone-only, see above
  position       int         not null default 0,   -- stable order within a section
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Savings Won — a log of every switch and cancellation with its annual
-- saving. "A savings tally is a scoreboard" (§7.2): kept separate from the
-- item table so a switch's win survives even if the row it came from is
-- later edited or removed.
create table if not exists register_saving (
  id                  serial primary key,
  happened_on         date        not null,
  what_changed        text        not null,
  annual_saving_cents int         not null,
  where_it_went       text,
  register_item_id    int         references register_item(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- Seed content transcribed directly from the real V2026.1 register PDF —
-- real vendors, real costs, real policy commentary. Renewal years for a
-- day/month given with no year are the next occurrence from 23 Sep 2026.
insert into register_item
  (section, service, provider, cost_cents, cost_period, cost_kind, frequency, renewal_date, renewal_label, status, excluded_from_reducing_number, hide_cost_on_fridge, notes, position)
values
  -- Home & Utilities
  ('home_utilities', 'Mortgage', 'AFSH Nominees (NAB)', 661878, 'month', 'actual', 'monthly', null, '19th, monthly', 'a', true, true,
    'SWITCHING → Peoples Choice 5.84%. Currently 6.24% var P&I. Match term to May 2055. Saves ~$2,231/yr.', 1),
  ('home_utilities', 'Electricity', 'Dodo Power & Gas', 17500, 'month', 'working_avg', 'quarterly', '2026-10-22', '~22 Oct', 'k', false, false,
    'Last bill $526.06 / 91 days (2 Apr–1 Jul 26, actual read), due 22 Jul. Seasonal — add each bill to firm the average.', 2),
  ('home_utilities', 'Water', 'Tweed Shire Council', 12800, 'month', 'working_avg', 'quarterly', null, '~Sep', 'k', false, false,
    'Last bill $383.61 / 91 days (9 Feb–11 May), due 19 Jun. $175.44 usage + $208.17 fixed charges.', 3),
  ('home_utilities', 'Natural Gas', 'Elgas', 9400, 'month', 'estimate', 'quarterly', null, null, 'k', false, false,
    'Estimate only — from $218.98 / 70 days, 1,823.7 MJ (26.1 MJ/day). Hot water & cooktop.', 4),
  ('home_utilities', 'Council Rates', 'Tweed Shire Council', 37000, 'month', 'allowance', 'quarterly', null, null, 'k', false, false,
    'Household allowance, not a fixed debit.', 5),
  ('home_utilities', 'Home Insurance', 'CBA / Hollard — Plus', 34650, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'SWITCHED Aug 26 — saved $1,449/yr. Bldg $1.1M + 25% gap, contents $90k. Cancel ALDI after 72hrs. 15% discount may drop at renewal.', 6),

  -- Digital & Communications
  ('digital_comms', 'Internet', 'Tangerine Telecom', 9383, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'Check intro/promo expiry. Review annually.', 1),
  ('digital_comms', 'Mobile — Renée', 'Optus', 10578, 'month', 'actual', 'fixed_term', null, 'Jul 2027', 'k', false, false,
    'Fixed-term contract ends Jul 2027 — must roll. Diarise Apr 2027 to compare before it auto-rolls.', 2),
  ('digital_comms', 'Mobile — Rose', 'Aldi Mobile', 2300, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'Prepaid. Review annually.', 3),
  ('digital_comms', 'Mobile — Matt & Tom', 'TPG Telecom', 5000, 'month', 'actual', 'monthly', null, '2 × $25', 'k', false, false,
    'Mobile plans — not internet. Two services. Review annually.', 4),
  ('digital_comms', 'Spotify', 'Spotify', 2799, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'Review annually. Family plan still right size?', 5),
  ('digital_comms', 'Netflix', 'Netflix', 2899, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'Still watched? Review value.', 6),
  ('digital_comms', 'Claude Pro', 'Anthropic', 3151, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'Charged in USD — ~$1.10 intl transaction fee each month.', 7),
  ('digital_comms', 'Dropbox ×2', 'Dropbox', 37000, 'year', 'actual', 'annual', null, '2 × $185', 'r', false, false,
    'One paid by Matt, one by Renée. Confirm both accounts are needed.', 8),
  ('digital_comms', 'iCloud+ 200 GB', 'Apple', 449, 'month', 'actual', 'monthly', '2027-08-11', '11 Aug', 'k', false, false,
    'Review storage tier.', 9),
  ('digital_comms', 'Apple News+', 'Apple', 1999, 'month', 'actual', 'monthly', '2027-08-21', '21 Aug', 'r', false, false,
    'Decide whether it is worth keeping.', 10),
  ('digital_comms', 'Surfline Premium', 'Surfline', 7799, 'year', 'actual', 'annual', '2027-01-09', '9 Jan 2027', 'k', false, false,
    'Review before renewal.', 11),

  -- Transport
  ('transport', 'Comprehensive — Defender', 'AAMI — MPA126514985', 40001, 'year', 'actual', 'annual', '2027-02-12', '12 Feb 27', 'r', false, false,
    'BLF23W — 2009 Defender 110 4D wagon, 2.4L turbo diesel. Compare Jan 27.', 1),
  ('transport', 'CTP green slip — Defender', 'Policy OA71211380', 34900, 'year', 'actual', 'annual', '2026-10-29', '29 Oct 26', 'r', false, false,
    'Term 30 Oct 25 – 29 Oct 26. 2009 Defender. Compare before renewal.', 2),
  ('transport', '3rd party property — Mazda', 'Allianz — AALMVE00014429', 3773, 'month', 'actual', 'monthly', '2027-03-08', '8 Mar 27', 'r', false, false,
    'DD02RX — 2018 CX-5. NOT comprehensive (~$453/yr). Excess $650 ($1,800 if driver under 25).', 3),
  ('transport', 'CTP green slip — Mazda', 'Insurer TBC', null, null, 'tbc', 'annual', null, null, 'r', false, false,
    'Separate policy — still to find. Defender equivalent was $349.', 4),
  ('transport', 'Servicing — Defender', 'Chinderah Motors', 100000, 'year', 'allowance', 'annual', null, null, 'k', false, false,
    '2009 Defender 110 Puma, 2.4L turbo diesel. Log last service date here.', 5),
  ('transport', 'Servicing — Mazda', 'Chinderah Motors', 100000, 'year', 'allowance', 'annual', null, null, 'k', false, false,
    'Log last service date here. Book both cars together where possible.', 6),
  ('transport', 'Registration — Defender', 'Service NSW', 66000, 'year', 'estimate', 'annual', null, null, 'k', false, false,
    'Renewal date to confirm — write it here.', 7),
  ('transport', 'Registration — Mazda', 'Service NSW', 66000, 'year', 'estimate', 'annual', null, null, 'k', false, false,
    'Renewal date to confirm — write it here.', 8),
  ('transport', 'Boat licence', 'Service NSW', null, null, 'tbc', 'annual', '2027-03-03', '3 Mar', 'k', false, false,
    'Renew before 3 March.', 9),
  ('transport', 'Fishing licences', 'Service NSW', 10000, 'year', 'actual', 'annual', null, null, 'k', false, false,
    'Renewal date to confirm.', 10),
  ('transport', 'Tinny + trailer rego', 'Service NSW', 22000, 'year', 'actual', 'annual', null, 'February', 'k', false, false,
    'Renew in February.', 11),

  -- Family, Children & Holidays
  ('family_children_holidays', 'School fees', 'Lindisfarne Anglican Grammar', 210000, 'month', 'allowance', 'monthly', null, null, 'k', true, false,
    'Household commitment. Not part of the $4,510 fridge scorecard.', 1),
  ('family_children_holidays', 'Surf coaching — Tom', 'Boardriders / coach', 25000, 'term', 'actual', 'per_term', null, null, 'k', false, false,
    'Review each term. Moved off the scorecard.', 2),
  ('family_children_holidays', 'KPA — Rose ×3', 'Kingscliff Performing Arts', 40699, 'term', 'actual', 'per_term', null, null, 'k', false, false,
    'Three programs. Charged 12 Aug 26. Review each term — are all three still right?', 3),
  ('family_children_holidays', 'Pilates — Rose', 'Rydge Fitness', 25000, 'term', 'estimate', 'per_term', null, null, 'k', false, false,
    'Review each term. Moved off the scorecard.', 4),
  ('family_children_holidays', 'Easter 2027 trip', 'Straddie / Minjerribah', 67890, null, 'paid_to_date', 'one_off', '2027-03-26', 'Easter 27', 'k', false, false,
    'Ferries $286.09 + camping $392.81, booked Aug 26. Log further costs here — not on the fridge scorecard.', 5),

  -- Health & Insurance
  ('health_insurance', 'Private health cover', 'GMHBA', 17665, 'month', 'actual', 'monthly', null, null, 'k', false, false,
    'Review cover and value at renewal.', 1),
  ('health_insurance', 'Credit card fee', 'CBA — My Card', 39500, 'year', 'actual', 'annual', '2027-02-16', '16 Feb', 'a', false, false,
    'ACTION — cancel before 16 Feb. Set a reminder for late Jan.', 2)
on conflict (service) do nothing;

-- register_saving is an append-only log with no natural unique key, so the
-- seed guards its own re-run with `where not exists` rather than a
-- constraint that would also fight a real second saving on the same item.
insert into register_saving (happened_on, what_changed, annual_saving_cents, where_it_went, register_item_id)
select '2026-08-01', 'Home insurance — switched ALDI/Honey → CBA/Hollard Plus', 144900, null, id
from register_item
where service = 'Home Insurance'
  and not exists (
    select 1 from register_saving where what_changed = 'Home insurance — switched ALDI/Honey → CBA/Hollard Plus'
  );
