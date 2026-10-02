# Family Hub — Chores & Pocket Money Brief

**Status:** proposed, not built.
**Last updated:** 2 October 2026

**This is §7.10 of `family-hub-design-brief.md`, revised.** §7.10 assumed
chores were assigned by a parent and ticked by a child. This brief replaces
that with two things:

- **A job board.** Parents curate paid jobs, jobs come up on a schedule, and a
  child chooses which to claim.
- **A weekly contribution bonus.** A flat amount a child claims each week if
  they've done their part around the house, judged by an adult.

Claude Code should validate this against the codebase and `docs/DECISIONS.md`
before building, and flag anything here that conflicts.

---

## The problem, precisely

Not motivation. The kids will do paid work.

The failure is the Sunday conversation: *what did you do, what's it worth,
what do I owe you?* Reminders can tick a task. It cannot answer "did Rose earn
her money this week?", and that question is the module's entire reason to
exist.

**The feature is a trusted ledger of pocket money.** Everything else serves it.

---

## Why a board, not a roster

§7.10's hardest open problem was the ownership collision: goals are the
child's, chores are imposed, and on one screen the goals inherit the chores'
compliance feeling.

A board largely dissolves it. **No job on a child's screen is assigned to
them.** Jobs are offered; the child picks. That is closer to goals (their
choice) than to a chore chart (our instructions).

The contribution bonus is the one standing expectation, and it is deliberately
a single weekly question rather than a list of tasks, for the same reason.

---

## Decisions this module adds

Record these in `docs/DECISIONS.md`. Wording is ready to paste.

### The board

**Chores are a claim board, not a roster.**
Parents curate paid jobs with a value and a frequency. A job comes up on its
schedule, appears as available, and a child claims it. Nothing is assigned to
a child.

**A child claims, does, and submits. An adult approves.**
Submitting is the child's satisfying moment and is the tick. Approval and
payment are parent-side bookkeeping, on a phone.

**Adults mark done; they never claim.**
If a job goes untaken, an adult does it and marks it done: no claim, no
review, no payment. An adult claim would hold a job off the board that a child
might have wanted.

**An adult completion is quiet on the fridge.**
The job leaves the board and returns on its next cycle. "Matt did the
vacuuming" in a child's view reads as a lost $5 or a silent reproach. Who did
what is visible on parents' phones only.

**The next cycle runs from completion, not from the calendar.**
A fortnightly mow comes up 14 days after the last mow, because grass grows
from the last cut. The clock starts from the day the work was done, not the
day it was approved, so a slow approval never delays the next cycle.

**Unclaimed jobs never stack.**
A job that comes up while already available stays as one job. Nobody owes two
vacuums because a week was missed.

**The value is fixed at claim time.**
If a rate changes while a job is claimed, the child is paid the rate they
claimed at.

**A failed review reads as "needs another go", never "rejected".**
The job goes back to the same child, still claimed, with an optional note.

### The contribution bonus

**Contribution earns one weekly bonus, never a price per task.**
Everyone keeps their bedroom and bathroom tidy, puts shoes and bags away, and
helps with bins, the dishwasher, meal prep and cleaning the kitchen. These are
not jobs on the board. Instead, a child who has done their part claims a flat
weekly bonus. "Bins are worth $2" makes contribution negotiable; "doing your
part this week is worth $12" does not.

**The bonus is claimed by the child and judged by an adult.**
The usual outcome of "not yet" is being sent off to tidy the room or put
things away, then approved. It is a judgement call, made in person, and the
interface records the outcome rather than replacing the conversation.

**No checklist.**
The expectation stays spoken, not itemised. Ticking shoes, bags and bins
turns it into surveillance and invites haggling over partial credit.

**All or nothing.** $12 or $0. No half bonus.

**A declined week is never shown on the fridge.**
The claim simply isn't there. The reason was given in person.

**Children only.** The adults are expected to do their part too, and aren't
paid for it.

**The bonus is not contended.** Each child has their own. Claim contention
rules for the board never apply to it.

### Both

**Claim and submit happen inside the personal view, never on the dashboard.**
Same rule as the §7.10 chore tick and the To Do tick. The avatar tap supplies
enough identity. A claimable board on the dashboard lets anyone claim for
anyone from the doorway.

---

## Seed content

Use these. They are real.

### Jobs

| Job | Value | Frequency | Notes |
|---|---|---|---|
| Mow rear lawn | $15 | Fortnightly | The fire break to the bushland. ~45 min. |
| Mow back yard and front | $10 | Fortnightly | Back yard and pool area, nature strip, pathway. ~30 min. |
| Vacuum upstairs | $5 | Weekly | |
| Vacuum downstairs | $5 | Weekly | |
| Dust whole house | $5 | Fortnightly | |
| Mop downstairs | $10 | Monthly | |
| Clean downstairs windows | $8 | Monthly | |
| Clean interior — Mazda | $6 | Monthly | |
| Clean interior — Defender | $6 | Monthly | |

### Contribution bonus

| | Value | Frequency |
|---|---|---|
| Did my part this week | $12 per child | Weekly, Monday–Sunday |

Notes:

- **The two mows are deliberately separate.** Either child can do either.
  Together they are a 75-minute job, which is daunting enough to go unclaimed.
  A child may claim both; the board never offers them as one.
- **Both mows pay $20 an hour.** Worth stating if either child asks why one
  pays more.
- **The rear mow matters in a way the others don't.** It is a fire break.
  Skipping the dusting costs nothing; skipping this in fire season does. No
  special mechanic: if it goes unclaimed, an adult mows and marks it done.
- **Vehicle cleaning is a chore, not maintenance.** Servicing the Mazda and the
  Defender stays in Projects & Maintenance. No overlap.
- **Maximum payable:** about $138 a month if every job is done on schedule,
  plus about $104 a month in bonuses for both children. Roughly $242 a month,
  or $56 a week. The bonus is accounted for as a line on the operations
  register.

---

## The lifecycles

### A job

```
            ┌──────── needs another go ────────┐
            ▼                                   │
available ──► claimed ──► submitted ──► approved ──► paid
    ▲                                       │
    │            next cycle from done_on    │
    └───────────────────────────────────────┘

adult:  available ──► done (no claim, no review, $0) ──► next cycle
```

- **Available** — the job's `next_available` date has arrived and nobody holds
  it.
- **Claimed** — a child has taken it. It leaves the board for everyone else.
- **Submitted** — the child says it's done. This is the tick.
- **Approved** — an adult has checked it. The value is now owed.
- **Paid** — an adult has recorded the money changing hands.

Submitting records `done_on` and schedules the next cycle immediately. A
"needs another go" does not reschedule; the job stays with the child.

### The weekly bonus

```
open ──► claimed ──► approved ──► paid
            │  ▲
     not yet│  │claim again
            ▼  │
          not yet
            │
            ▼
         declined          (parent phone only)

unclaimed at week's end ──► lapses, no record on the fridge
```

- **Open** — each child has one bonus per Monday–Sunday week.
- **Claimed** — the child says they did their part.
- **Not yet** — the adult has sent them off to finish. The child claims again
  when done. Shown on the fridge only as a plain "not yet", never as a fail.
- **Approved / paid** — as for a job.
- **Declined** — the adult's call that this week doesn't earn it. Visible on
  parents' phones only.
- **Lapsed** — never claimed. The week resets clean.

---

## Surfaces

### 1. Dashboard

At most **one calm line**, e.g. `3 jobs available`. Read-only, navigation
only, never in the attention state. An available job is an offer, not a
debt. The bonus never appears on the dashboard.

Placement is open (see below). It must not land in zone 1, which already
carries the clock, date, week letter and the meal planner's Tonight line.

### 2. Personal view — fridge

Behind the avatar tap. Returns to the dashboard after 60 seconds, like every
personal view.

- **This week's bonus**, as one line with a claim tick: *Did my part this
  week · $12*. After claiming: *Waiting on Mum or Dad*. After "not yet": *Not
  yet*, with the tick available again.
- **Available jobs**, each showing title, icon and value. Tap to claim.
- **My jobs** — claimed and awaiting review, each with a submit tick.
- **This week's earnings** and **owed to me**, stated plainly.

Rules:

- **The tick is satisfying and instant.** It is the only rewarding tactile
  interaction in the product and the only one a child performs. Design it
  properly.
- **No streaks, no totals over time, no leaderboard between siblings.** The
  week resets clean.
- **Rates are always visible.** A stated rate is easier to defend than a
  discovered one.
- Jobs a child is not eligible for do not appear on their board at all.
- Every claim and submit offers single-level **undo**, never a confirmation
  dialog.

### 3. Personal view — phone (child)

The same board, bonus and jobs, plus a history of what they've earned and been
paid. A declined bonus week shows as nothing rather than as a failure.

### 4. Parent phone

- **Library** — add, edit, reorder and archive jobs, and set the bonus amount.
  Adding takes under thirty seconds.
- **Review** — submitted jobs and claimed bonuses, batched. Approve, send back
  ("needs another go" for a job, "not yet" for the bonus), or decline the
  bonus. Built for the Sunday ritual, not a notification per claim.
- **Mark done** — any available job, done by an adult, resets its cycle.
- **Owed and paid** — per child, with a single action to record a payment.
  This is what ends "how much do I owe you?"
- **History** — who did what, including adult completions and declined
  bonuses.

---

## Data model

```
chore
  id
  title            text not null
  icon             text not null          -- Phosphor icon name
  value_cents      int not null
  frequency        text not null          -- 'weekly' | 'fortnightly' | 'monthly'
  interval_days    int not null           -- 7 | 14 | 30, derived from frequency
  eligible         text[]                 -- person enum; null = both children
  notes            text
  next_available   date not null
  position         int not null           -- not `order`, reserved word
  archived_at      timestamptz
  created_at       timestamptz not null default now()

chore_job                                 -- one instance of a chore being done
  id
  chore_id         not null references chore(id)
  person           text not null          -- who claimed, or the adult who did it
  status           text not null          -- 'claimed' | 'submitted' | 'redo' |
                                          -- 'approved' | 'adult_done'
  value_cents      int not null           -- snapshot at claim; 0 for adult_done
  claimed_at       timestamptz
  submitted_at     timestamptz
  done_on          date                   -- drives next_available
  reviewed_by      text
  reviewed_at      timestamptz
  review_note      text
  paid_at          timestamptz
  set_from         text not null          -- 'display' | 'phone', on last write
  created_at       timestamptz not null default now()

weekly_bonus                              -- one row per child per week, on claim
  id
  person           text not null          -- children only
  week_start       date not null          -- Monday, from lib/week.js
  status           text not null          -- 'claimed' | 'not_yet' |
                                          -- 'approved' | 'declined'
  value_cents      int not null           -- snapshot at claim
  claimed_at       timestamptz not null
  reviewed_by      text
  reviewed_at      timestamptz
  paid_at          timestamptz
  set_from         text not null
  created_at       timestamptz not null default now()

  unique (person, week_start)

bonus_setting                             -- single row
  value_cents      int not null           -- 1200
```

Notes:

- **Money is integer cents.** Never floats.
- **`next_available`, `done_on` and `week_start` are `date`, never
  `timestamptz`.** Same rule as `meal_plan.night` and `todo_item.due`. An
  instant shifts across the 4 October DST change.
- Job availability is computed at read time: a chore is available when
  `next_available <= today()` and no `chore_job` for it is open.
- An unclaimed bonus is the absence of a row. Nothing is written for a lapsed
  week.
- **Paid is a timestamp, not a status.** Owed = approved jobs and bonuses with
  `paid_at` null.
- The bonus amount lives in configuration, editable from a phone — never a
  deploy.
- Archived chores leave the board but still render in history.
- Match the existing schema's id and naming conventions.

---

## Rules that look arbitrary

- **All date maths runs through `lib/week.js#today()`.** Vercel runs UTC.
  Monday-of-week comes from `lib/week.js` too, shared with the meal planner.
- **Chores ignore school terms.** The lawn grows in the holidays. The week
  letter plays no part here.
- **Reuse the `role=display` write gate** built by the meal planner. If it
  doesn't exist yet, this module builds it and the planner reuses it. Don't
  build two.
- **`role = 'display'` may only claim, submit and undo, only from a personal
  view.** Every other write rejects a display session at the route, not just
  in the UI.
- **A child acts only on their own jobs and bonus.** On the fridge, the avatar
  tap is the identity — social trust, as with the §7.10 tick.
- **Only adults approve, decline, mark paid, or mark done.**
- **Writes are optimistic** with background retry; after 10 seconds of
  failure, show `Not saved yet` quietly. Never a dialog, never a silent
  revert.
- **Never blank or spinning.** Cached board first, refreshed behind; stale
  marked with its timestamp.

---

## Scope

### Build now

- Schema, seed jobs and bonus setting
- Parent library on phones
- Board, bonus, claim, submit and undo — fridge personal view and child phone
- Review, mark done, and owed/paid on parent phones
- `DECISIONS.md` entries above

### Later

- The dashboard line, once its placement is settled
- A term-level view for parents of which jobs fall to adults most often — a
  pricing signal for a Sunday conversation, never a stat on the wall
- Photo on submit, if "needs another go" turns out to be frequent

### Not this module

- **Itemised contribution chores.** Dishwasher, bins and the rest are covered
  by the bonus, never priced individually.
- Streaks, badges, leaderboards, sibling comparison.
- Notifications.
- Unconditional allowance.
- Bank transfers or any payment integration. The app records that money was
  paid; it does not move it.
- Adults' own chores as a task list. Reminders keeps those.

---

## Acceptance checks

### Jobs

- [ ] A weekly job submitted Monday is available again the following Monday,
      regardless of when it was approved
- [ ] A job left unclaimed past its next cycle appears once, not twice
- [ ] Claiming removes the job from the other child's board immediately
- [ ] A rate changed while a job is claimed pays the claimed rate
- [ ] "Needs another go" returns the job to the same child, still claimed,
      without rescheduling
- [ ] An adult marking a job done resets its cycle, records $0, and needs no
      approval
- [ ] An adult completion does not appear in either child's fridge view
- [ ] A job with `eligible = ['Rose']` never appears on Tom's board

### Bonus

- [ ] Each child can claim one bonus per Monday–Sunday week; a second claim in
      the same week is rejected
- [ ] One child's claim has no effect on the other's
- [ ] "Not yet" returns the bonus to the child, who can claim again the same
      week
- [ ] A declined bonus never appears in either child's fridge view
- [ ] An unclaimed bonus writes nothing and the next week opens clean
- [ ] Adults have no bonus
- [ ] The bonus has no checklist anywhere in the interface
- [ ] Changing the bonus amount on a phone applies to new claims only

### Both

- [ ] `role = 'display'` can claim, submit and undo from a personal view
- [ ] `role = 'display'` cannot approve, decline, pay, mark done, or edit the
      library — the route rejects it, not just the UI
- [ ] Nothing on the dashboard can be claimed or ticked
- [ ] Claim and submit offer undo; neither shows a confirmation dialog
- [ ] Every fridge write records `set_from = 'display'`
- [ ] Owed per child equals approved jobs and bonuses with `paid_at` null
- [ ] Dates survive 4 October 2026 without shifting
- [ ] Every target is at least 44pt
- [ ] Failed fetch shows the cached board, marked stale, never a spinner

---

## Validate before building

- Is the `role=display` write gate built yet (meal planner or chore tick)?
- Does `lib/week.js` have a Monday-of-week helper? Share it with the planner.
- Match id, money and timestamp conventions in the existing schema SQL.
- Verify Phosphor icon names against the installed package.
- Check how personal views are routed and timed out, and reuse it.

---

## Open

- **Claim contention on the board.** First claim wins, which favours whoever
  passes the fridge first. Options: a cap of one or two open claims per child,
  and/or a claim lapsing back to the board after a few days unsubmitted. If a
  lapse exists, it must read as the job returning to the board, never as a
  mark against the child.
- **When the bonus opens.** Any day of the week, or only from Saturday so it's
  claimed after the week has actually happened.
- **Where the dashboard line sits.** It can't go in zone 1. Saturday state is
  the natural home; check it against the home screen brief's budget.
- **Which money line job earnings live on.** The bonus is a register line.
  Job earnings vary week to week; "School & Kids Extras" on the scorecard is
  the obvious fit, or a second register line as a working average.
- **Monthly as 30 days or a calendar month.** 30 days drifts against the
  calendar but matches "from completion". Probably fine.
- **Eligibility for the mowers.** Whether Tom, at 11, mows at all is a family
  decision. The `eligible` field handles either answer.
- **Goals and chores on one screen.** Much less acute now that nothing on the
  board is assigned, but still worth checking once both exist.
