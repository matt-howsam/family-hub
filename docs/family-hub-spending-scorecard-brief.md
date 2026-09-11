# Family Hub — Spending Scorecard Module Brief

**Status:** proposed, not built.
**Last updated:** 11 September 2026

Digitises the *Howsam Discretionary Spending Scorecard*, the second of the
two printed documents on the fridge. Claude Code should validate this
against the codebase and `docs/DECISIONS.md` before building (see "Validate
before building") and flag anything that conflicts.

Companion documents: `spending-rules-and-aug-w4.md` (categorisation ruleset,
August 2026 close, September config) and `event-calendar-seed.md` (birthdays
and NSW term dates for the variable-budget layer).

---

## The problem, precisely

The paper card works. It is filled in every Sunday, it has a voice, and the
household has already decided how it talks about money. What it can't do:

- **Tell you where you are mid-month.** The card only becomes informative
  once it's complete. On the 18th it's a column of numbers with no verdict.
- **Remember.** August's card gets replaced by September's. Month-on-month
  comparison is the stated intent and the paper can't deliver it.
- **Handle a month that isn't ordinary.** Two birthdays and Father's Day put
  August $1,025 over, and the card has no way to say that was expected.
- **Tell the truth about week length.** Week 4 was 10 days in August and is
  9 in September. Against a flat $1,128 weekly target, a long week always
  looks like a failure.
- **Keep the Sunday Night Review.** Three of the most human sentences in the
  household get binned with the page each month.

**Success condition: the card comes off the fridge.** If both stay up one
goes stale within a fortnight — the same source-of-truth failure as calendar
entries echoing the timetable. Retire it the month this ships.
**Photograph every completed card before recycling it.** Those are the
historical months.

### What must survive from the paper

1. **Sunday entry is a two-minute ritual, not data entry.** Eleven numbers,
   three sentences, done.
2. **The wall shows progress and pace, never a ledger.**
3. **Exclusions are stated plainly, not apologetically.** `$4,510` is not
   the family's cost of living and the card says so on its face.
4. **The voice.** *"Every dollar has a job. Every week has a number."*

---

## Decisions this module adds

Record these in `docs/DECISIONS.md`. Wording is ready to paste.

**Weeks are day-of-month ranges, not ISO weeks.**
1–7, 8–14, 15–21, 22–end. Week 4 runs 8 to 11 days depending on the month.
This is what the paper does and what the habit already follows. Do not
anchor to Mondays; the ritual happens on Sunday but the period is the
calendar.

**The weekly target is pro-rata by days, never `budget / 4`.**
August's Week 4 was 10 days and September's is 9. A flat weekly figure makes
a long week read as failure and a short one as a win, which is how a
household learns to stop believing the variance column.

**The scorecard stores numbers, never transactions.**
Raw transactions never enter the app, on any surface. Categorisation happens
outside it and eleven figures arrive. This is already a `DECISIONS.md` rule
for the fridge; here it is a rule for the whole module.

**Zero is a value. Empty is not zero.**
Home Projects at `$0` in Week 1 is a fact someone recorded. An unentered cell
is a gap. They must be distinguishable in the store and on screen, or a
partial month silently reads as an under-spend.

**A partial month never renders a total as though it were final.**
If any week is unentered, the month total is marked partial. Never sum four
weeks where one is null and present the result as the month.

**Monthly targets vary; the annual envelope does not.**
Known events — birthdays, Christmas, school holidays, back to school — raise
specific categories in specific months, funded by lowering quiet months. If
the year's total moves when an event is added, the event is not being funded,
it is being added.

**Budget events are frozen when the month opens.**
Without a lock, every overspend acquires a retroactive event and the
scorecard becomes a machine for excusing itself. Amendments after the lock
are permitted and render visibly as amendments, with a date.

**Past months are read-only.**
Not disabled-looking, just not editable. Same treatment as past nights in the
planner: quieter, no button styling, no touch response on the fridge.

---

## Surfaces

### 1. Dashboard tile — the wall

One tile, one line answering "does this need me?". Per the home screen brief.

> **Spending**  `Week 2 · $610 of $1,128`

Add a second line only when the month is far enough in to mean something:

> `Day 18 · tracking to $4,340 of $4,650`

**Do not show a projection before day 7.** Early-month extrapolation is
noise, and a scary number on the 3rd teaches people to ignore the line.

Attention state: over the weekly target, or past 90% of it before Friday.
Calm otherwise. Two states, no gradient.

On Sunday evening the tile is the ritual's entry point — that is when the
habit happens, and the dashboard already changes through the day.

### 2. The month view — fridge and phone

One responsive view. Portrait. This is the paper card, rendered.

Eleven rows. Per row: category, budget, the weeks, month total, variance.
On the fridge at ~810pt, four week columns plus budget and total will not
fit legibly at a metre — **show the current week and the month-to-date on
the wall, and the full four-week grid on a phone.** The paper card gets read
standing at it; the screen gets read from across the room. Different job.

Current week and month-to-date are the two numbers that belong on the wall.
Everything else is a phone view.

**Month navigation.** Arrows or a month strip at the top. Past months open
read-only. This is the single largest gain over paper and should be obvious
enough that nobody has to discover it.

**Comparison.** Not a chart on the fridge. On a phone, a category row opens
to show the last twelve months of that category as a small band — the same
treatment as stage history in the projects module: quiet, horizontal, not a
chart. `Groceries: 1,488 · 1,302 · 1,190 …` reads faster than a line graph
at this size and carries the number, which a graph doesn't.

The headline comparison line belongs on the month view itself:

> August $5,535 · July $5,240 · **+5.6%**

That is the module's stated intent and it should not require a drill-in.

### 3. Sunday entry — phone only

The survival condition of the module. If this is tedious it stops happening
and everything above is dead.

**One screen, eleven fields, three questions.** Not a wizard, not one
category per step. The whole grid visible so someone can jog down it.

- Numeric keypad, whole dollars, no cents, no currency symbol to type.
- Tab or next moves down the column. Never require a tap per field.
- Each field shows its weekly target as placeholder text, greyed, so the
  number being typed has context without a second column.
- Running total updates live at the foot against the pro-rata week target.
- `0` is a valid, common entry and must be as fast to enter as any other.
- Nothing is required. A half-finished week saves and reopens where it was.

Then the three review questions, in the family's own wording:

> This week's win —
> Biggest unnecessary spend —
> One change for next week —

**These are not an afterthought field set.** They are the ritual that makes
the numbers matter. Give them room, render past weeks' answers as a readable
history, and never truncate them in a list view. Nothing is required here
either — a week with numbers and no sentences is a normal week.

### 4. Budget and events — phone only

Per the configuration rule: term dates, targets and rates are phone edits and
must never require a deploy.

- Base budget per category, edited rarely.
- Events: name, month, category, amount, note. `Rose birthday · May ·
  Shopping · $120`.
- The annual envelope, with a visible running position. Adding an event
  should show what it costs the rest of the year, not just what it grants
  this month.

Seed the event table from `event-calendar-seed.md`.

---

## Data model

```
spend_category
  key            text primary key      -- 'groceries', 'cafes_takeaway', …
  label          text not null
  description    text                  -- the card's own subtitle line
  position       int not null          -- not `order`, reserved word
  archived_at    timestamptz

spend_period
  id
  year           int not null
  month          int not null          -- 1-12
  locked_at      timestamptz           -- budget freeze; null until month opens
  unique (year, month)

spend_week
  period_id      references spend_period
  week_no        int not null          -- 1-4
  starts_on      date not null
  ends_on        date not null         -- week 4 ends on the last of the month
  primary key (period_id, week_no)

spend_budget
  period_id, category_key
  base_amount    int not null          -- cents
  event_amount   int not null default 0
  primary key (period_id, category_key)

budget_event
  id
  name           text not null         -- 'Rose birthday'
  year, month    int not null
  category_key   references spend_category
  amount         int not null          -- cents, signed
  note           text
  created_at     timestamptz not null
  amended_at     timestamptz           -- non-null once the period is locked

spend_entry
  period_id, week_no, category_key
  amount         int not null          -- cents; 0 is meaningful, absent row is not
  entered_at     timestamptz not null
  entered_by     text                  -- person enum
  primary key (period_id, week_no, category_key)

sunday_review
  period_id, week_no
  win                      text
  biggest_unnecessary      text
  one_change               text
  created_at, updated_at
  primary key (period_id, week_no)
```

Notes:

- **`amount` is signed on `budget_event`.** School holidays move spending in
  both directions — Groceries up, School & Kids Extras down. An unsigned
  allowance models half the effect.
- **An absent `spend_entry` row is "not entered".** A row with `amount = 0`
  is "spent nothing". Do not coalesce.
- `spend_week` is stored, not computed, so a month with an unusual cut (a
  long Week 4, a deliberate re-cut) survives and stays auditable.
- Match id and timestamp conventions in the existing schema SQL.

---

## Rules that look arbitrary

- **All date maths runs through `lib/week.js#today()`.** Vercel runs UTC;
  a naive `new Date()` rolls the calendar date over at 10am Sydney time and
  would put a Sunday entry in the wrong week.
- **`spend_week.ends_on` for week 4 is the last day of the month**, computed
  in `Australia/Sydney`, stored as a `date` and never a `timestamptz`.
- **Pace is `spent_to_date / days_elapsed × days_in_month`**, suppressed
  before day 7.
- **Variance is against a pro-rata target**, always. Weekly variance uses
  days in that week; month-to-date variance uses days elapsed.
- **Writes are optimistic.** On failure retry in the background; after 10
  seconds show `Not saved yet` quietly on the row. Never revert silently,
  never show a dialog.
- **Reads are cached first.** The month renders instantly and refreshes
  behind. On failure show the cached figures marked stale with a timestamp.

---

## Tone

This module is neither the projects list nor the briefing. Projects is
deliberately uncomfortable; the briefing is warm. **Spending is level.**

- A month over budget is a fact, stated once, without colour escalation.
  August ran $1,025 over and the screen says so plainly.
- **Progress is as visible as debt.** Unplanned Spending came in $185 under
  in August and that belongs on screen next to the overspends, not buried.
- No red. No streak language. No encouragement. The register's `A` status is
  the wrong borrowed vocabulary here and so is a progress bar.
- Use the card's own phrases. *"Every dollar has a job. Every week has a
  number."* · *"Write the number every Sunday, even the ugly ones. Progress
  over perfection."*

---

## Scope

### Build now

- Schema, eleven seeded categories with the card's own descriptions
- September 2026 period seeded: $4,650 target, Alcohol raised to $300
- August 2026 backfilled from the photographed card, as the first
  comparison month
- Month view, fridge and phone, with month navigation
- Sunday entry screen on phones, including the three review questions
- Dashboard tile with week position and pace
- Budget and event editing on phones
- `DECISIONS.md` entries above

### Later

- Twelve-month category bands
- Year-to-date envelope position
- Paste raw transactions into the app and confirm a proposed categorisation
  (see "How the data arrives")
- Connecting Home Projects spend to the projects module's `budget_actual`

### Not this module

- **A transaction ledger.** Numbers only, permanently.
- **Bank or card integration.**
- **Receipt capture.** That's the files layer.
- **Charts on the fridge.**
- **Forecasting beyond simple pace.**
- The Operations Register. Different document, different module, and the
  exclusion list is the seam between them.

---

## How the data arrives

Current working process, which is not changing yet: card transactions are
pasted into a Claude chat, categorised against the merchant ruleset in
`spending-rules-and-aug-w4.md`, and eleven weekly figures come back. Those
figures are typed into the Sunday entry screen from a phone.

**The app receives numbers. It does not receive transactions.** That
separation is the reason the module can ship without any ingestion
dependency, unlike the register.

The ruleset file should live in the repo as data — not prose — so that when
in-app categorisation is built it inherits the accumulated rules rather than
starting over. Ship it as a `merchant_rule` table (pattern, category,
priority) seeded from that document, even though nothing reads it yet.

Two things that document already proves and the eventual categoriser must
respect:

- **Unmatched merchants default to Unplanned Spending and raise a prompt.**
  That's how the rule table grows without becoming a chore.
- **Rules alone are not sufficient.** Three parking charges in one month went
  to three different categories, and the deciding fact — a fishing expo with
  Tom — appears nowhere in the transaction data. The confirmation step has to
  be genuinely editable, not a rubber stamp.

Raw transaction exports carry card identifiers and should not be committed
to the repository.

---

## Acceptance checks

- [ ] September 2026 shows weeks 1–7, 8–14, 15–21, 22–30
- [ ] Week 4's target renders as $1,495, not $1,163
- [ ] A category entered as `0` and a category not yet entered render
      differently, and the month total is marked partial while any week is
      unentered
- [ ] Entering eleven numbers and three sentences takes under two minutes on
      a phone, keypad only, without a tap between fields
- [ ] The running total at the foot updates live against the pro-rata target
- [ ] Navigating back to August shows $5,535 against $4,510, read-only
- [ ] The month view shows the month-on-month comparison line without a
      drill-in
- [ ] Adding a budget event to a locked period renders as an amendment with
      its date
- [ ] Adding an event shows its effect on the annual envelope, not only on
      the month
- [ ] A negative event amount lowers a category's target
- [ ] Dashboard shows no projection before day 7
- [ ] On `role=display`: no edit affordances anywhere in this module, no
      disabled controls, and no four-week grid
- [ ] Failed fetch: cached figures shown, marked stale with a timestamp,
      never a spinner
- [ ] Failed write: `Not saved yet` on the row, retried, no dialog
- [ ] A Sunday entry made at 09:59 and 10:01 Sydney time lands in the same
      week
- [ ] Past months and past weeks have no touch response on the fridge and no
      button styling

---

## Validate before building

- **Does the dashboard tile system exist yet?** If not, ship the module at
  its own route and add the tile when the dashboard lands.
- **Is there a phone-write path and person identity?** `entered_by` needs
  the magic-link cookie identity from §5 of the design brief.
- **Check `lib/week.js`** for existing month-boundary and day-count helpers
  before writing new ones. Add there, never compute locally.
- **Check the design system** for how the two-register system treats a
  numeric table — the scorecard sits closer to the operations register than
  the family register. If a new token seems necessary, stop and flag it.
- Match id and timestamp conventions in the existing schema SQL.

---

## Open

- Whether the fridge should show week position only, or week plus
  month-to-date. Two numbers may already be one too many at a metre.
- Whether the Sunday Night Review answers deserve a surface of their own.
  Twelve months of "one change for next week" is the most interesting
  document the household would own, and it is currently invisible.
- Whether Home Projects spend should reconcile against the projects module's
  `budget_actual` or stay independent. Reconciling is correct and is also the
  kind of cross-module coupling that makes both harder to change.
- Where the annual envelope lives. It spans periods and belongs to no month,
  and it may want to be a register concern rather than a scorecard one.
