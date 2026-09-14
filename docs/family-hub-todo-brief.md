# Family Hub — To Do & Assignments Brief

**Status:** proposed, not built.
**Last updated:** 13 September 2026

**This is §7.11 of `family-hub-design-brief.md`, widened.** Not a new module.
§7.11 was requested by Rose — the only module in this product a family member
asked for — and it already settles ownership, the fridge constraint, lead time
and the email-proposal path. Building a parallel "to-do" module would
re-litigate all of it and orphan her request.

What's new here: the scope extends past school assessments to anything with a
due date, and it now covers adults as well as children.

---

## The problem, precisely

Not tracking. Rose knows she has a Science assessment.

The failure is **lead time**. A due date learned on the day it's due is a
calendar entry that arrived too late to act on. Her own framing when she asked
for this was that it should prompt her to *prepare* — roughly a week to ten days
out, not the night before.

**The feature is the surfacing, not the list.** A list of due dates is a
calendar with extra steps.

---

## Ownership — a new check shape

⚠ Every route built so far gates on `role` — `display` vs not, or
`role === 'adult'`. This module gates on **`session.person === item.person`**.

Uniform rule, no exceptions, no adult override: **everyone writes their own
list.** Rose writes Rose's. Matt writes Matt's. Matt cannot write Rose's.

This will feel wrong to build. It is not an oversight. Per §7.5 and §7.11: if a
parent can write into a child's list it becomes a chore list with better
typography, and the module loses the thing that made Rose ask for it. She has
moved from being a subject of this product to an author of it, and
parent-editable items are a regression.

### But parents can propose

The rule above creates a real problem — Tom is 11, and a parent who spots a
permission slip deadline should be able to help.

**Reuse the proposal mechanism rather than weakening ownership.** An adult can
propose an item to a child's list. It lands in that child's review queue, marked
with who proposed it, exactly as an email-extracted item does. The child
confirms or discards.

This is free: `proposed_item` already exists with `approver_role = 'child'`, and
the ingestion pipeline already routes a child's assessments to that child rather
than to an adult. A parent proposal is the same row with a different source.

Parent helps. Child stays the author. Nothing is weakened.

---

## What reaches the wall

**Decided 13 September 2026.** Nothing in zone 1. One conditional line in the
kids' block, evening only. Everything else behind the avatar tap.

### Nothing in zone 1

No tile, no count, no line under the date. Zone 1 already carries the clock,
date, week letter, the meal planner's Tonight line and its prep line; this
module does not compete for that space.

### One line in the kids' block — evening only

> **Science assessment tomorrow**

Shown 17:00–20:30 local, for items due the following day. Outside that window
it does not render.

**The time window is what makes this work.** At 7:15am *"Science assessment
tomorrow"* is noise — Rose is leaving the house and can do nothing with it. At
5pm it is the right sentence, because tonight is when the work happens.

⚠ **This is the meal planner's `night_before` prep mechanic, not a second
one.** That brief already surfaces a prep note 17:00–20:30 the evening before
and hides it outside the window. Same shape, same window, same reasoning.
Implement it once and share it; do not build a parallel scheduler.

Rules:

- **One line, never a count.** Two items due tomorrow shows the nearest, or the
  first by title if they tie. Never "2 due tomorrow."
- **Never in the attention state.** Plain text, calm register.
- **Gone by 06:00.** On the day itself the block says nothing — by then lead
  time has run out and the line has no action left in it.
- **Tomorrow only.** Not two days out, not "this week."
- **The owner's visibility choice already covers this.** An item Rose has kept
  to her own view never appears in the block. No new setting.
- Applies to Tom identically.

### Why only tomorrow

§7.11 allowed one line — *Science assessment, Friday* — as the smallest
tolerable exposure of a child's schoolwork on a shared screen. This is smaller:
a single item, for a few hours, on the one evening it can still be acted on. A
sibling, guest or tradesperson in the kitchen at 10am sees nothing.

**A "due today" line was considered and rejected.** The kids' block is a
today-scoped surface, so an assignment due Friday would first appear on Friday
— precisely when lead time has run out. A line that can only say "due today"
cannot serve a module whose whole feature is lead time.

### The caution that matters

⚠ This is a **backstop, not the mechanism.** §7.11 is explicit that the feature
is lead time — Rose's own framing was that it should prompt her to *prepare*,
roughly a week out, not the night before.

If the evening line becomes the thing she relies on, the module has quietly
reverted to being a calendar with one day of warning. **The person view still
has to do the real work**, and should be designed as though the evening line
did not exist.

### The consequence, stated plainly

Lead time depends on Rose choosing to look. That is acceptable because she
asked for this module and the avatar tap is one touch from a screen she passes
several times a morning — but it is a real dependency, and it changes what the
person view has to do.

**The person view opens on what's coming, not on what's today.** Ordered by due
date, nearest first, with the lead window used for grouping rather than
triggering. That ordering is the feature.

---

## The tick on the iPad

Matt asked for this. Claude Code's technical note argues for rejecting display
writes outright. **Both are partly right, and the distinction is between the
dashboard and the personal view.**

**No writes on the dashboard.** Not because of identity, but because ticking
requires a list to tick, and a tickable list of Rose's outstanding schoolwork on
the kitchen wall is the exact thing §7.11 exists to prevent.

**Yes, inside the personal view, behind the avatar tap.** This is not a new
exception — §7.10 already established that the fridge's chore tick happens
inside a personal view rather than on the dashboard, and that the avatar tap
supplies enough identity for it. This rides that, and builds nothing new.

Why the trust argument doesn't block it: §7.11's concern is that a pipeline
adding or silently changing items would make the list untrustworthy. **A tick is
not in that category.** It is reversible in one tap, visibly so, and nothing is
lost if Tom taps something of Rose's. A wrongly added due date is unrecoverable
in a way a wrongly ticked box never is.

Two conditions:

- **Reversible and unremarkable.** The tick is satisfying; un-ticking is
  equally available and equally quiet. No celebration animation — that rewards
  the prank.
- **Record `set_from`**, `'display' | 'phone'`, same as `meal_plan`. A mystery
  state change should be traceable to the fridge.

---

## Surfaces

**Home screen** — nothing in zone 1. One line in the child's block, 17:00–20:30,
for items due tomorrow. See above.

**Person page, fridge** — the list behind the avatar tap, opening on what's
coming, with the tick. Returns to the dashboard after 60 seconds like every
personal view. Rides the existing `components/AutoRefresh.jsx` cycle; nothing
here is edited on the wall except `done_at`, so no push mechanism is needed.

**Person page, phone** — the same list, plus add, edit, delete, and the review
queue for proposals.

**Add screen, phone** — under thirty seconds, same bar as adding a job. Title
required; everything else optional and right there.

---

## Lead time

Still the point of the module — but it now shapes the person view rather than
triggering a line on the wall.

**The list opens on what's coming.** Ordered by due date, nearest first. Done
items drop out.

Group by proximity rather than by date: **This week · Next week · Later.** One
global lead window of **7 days** marks the boundary of "this week" for
assessments and **2 days** for a plain task, used for grouping only. Resist
per-item tuning — it adds a settings screen and solves a problem nobody has.

Within a group the item reads plainly: *Science assessment · Friday.* It does
not change as the date approaches. No countdown, no days-remaining, no
"overdue", no red. The date is the information; escalation is the thing being
avoided, and §7.11 lists imposed urgency as a regression.

An item with no due date sits in its own group at the foot of the list. It is
not a failure, it is just undated.

---

## Subject

⚠ A picker, never free text. Sourced from `lib/timetable.js` for that child, so
it is constrained to the subject keys their timetable already uses, and it reuses
`lib/subjectIcons.js` rather than inventing iconography. Rose's own timetable
design is the reason those icons exist; don't build a second set.

Consequences worth stating:

- **Subject is optional.** "Other items that need doing" have none.
- **Adults have no timetable, so adults have no subject field at all.** Not
  empty — absent.
- An item with a subject can surface alongside that class in the daily briefing.
  An item without one cannot, and that is fine.

---

## Two entry paths, one table

Direct entry ships first with zero dependencies. Schools publish assessment
schedules at the start of term; entering them takes ten minutes and the module
works on day one.

Proposals — from email ingestion or from a parent — arrive later and are always
confirmations, never auto-adds.

⚠ Design the table so a row optionally carries `proposed_item_id` back to its
origin. Confirming is then a copy-and-link, not a special case, and the source
stays tappable.

---

## Data model

```
todo_item
  id
  person           text not null        -- owner. the only write gate.
  title            text not null
  description      text
  due              date                 -- optional; no due = no surfacing
  subject          text                 -- key from lib/timetable.js, nullable
  type             text                 -- 'assignment' | 'test' | 'exam' |
                                        -- 'assessment' | 'task'
  done_at          timestamptz
  set_from         text                 -- 'display' | 'phone', on done_at
  proposed_item_id references proposed_item(id)   -- nullable back-reference
  created_at       timestamptz not null default now()
```

Notes:

- `due` is a `date`, never `timestamptz`. Same rule as all-day calendar events
  and `meal_plan.night` — an instant shifts across the 4 October DST change.
- No priority, no status enum, no parent/child task nesting. See scope.
- `done_at` rather than a boolean, so un-ticking is a null and the history is
  visible if it's ever wanted.
- Lead-window logic is computed at read time from `due` and `type`. Nothing is
  stored about urgency.

---

## Rules that look arbitrary

- **Everyone writes only their own.** No adult override. The route checks
  `session.person`, not `role`.
- **`role = 'display'` writes only `done_at`, only from a personal view.**
  Every other field rejects a display session at the route, not just in the UI.
- **No streaks, no counters, no days-since, no progress bars.** Same rule as
  §7.5 and §7.10, same reason. Nothing decays or accumulates pressure.
- **Nothing renders in zone 1.** Not a line, not a count, not a tile.
- **The kids'-block line is evening-only and single.** 17:00–20:30, due
  tomorrow, one item, never a count, gone by 06:00.
- **Reuse the meal planner's `night_before` window.** One scheduler, not two.
- **The list never escalates.** A date is information; a countdown is pressure.
- **Visibility is the owner's choice**, as with goals. A child decides whether
  an item is visible to the family at all, or only in their own view.

---

## Scope

### Not this module

⚠ §11 lists general task lists as a non-goal — Reminders keeps those. Widening
§7.11 to "other items that need doing" walks toward that line, and the brief
should say where it stops.

**The test: does it have a due date that matters to the household's rhythm?**
If not, it belongs in Reminders.

Explicitly excluded: recurring items, subtasks, checklists, priorities, tags,
projects, assignees, notifications, a settings screen. Each is plausible and
each turns this into a task manager that duplicates something already working.

### Deferred

- **Apple Reminders sync.** Worth naming as an open question rather than a
  feature. A PWA cannot write to Reminders; the only practical route is a
  one-way Apple Shortcut, and two-way sync between two systems that both claim
  ownership is a source-of-truth problem, not an integration. Decide what
  "feed into reminders" means before building anything.
- Surfacing an item alongside its class in the daily briefing.
- Attachments — task sheets, rubrics — via the §7.7 file layer.

---

## Build order

1. `todo_item` table.
2. Person page list and add screen, phone. Direct entry only.
3. Person page on the fridge, with the tick.
4. The evening line in the kids' block, riding the meal planner's
   `night_before` window.
5. Parent proposals into the child's review queue.
6. Email-ingestion proposals — arrives with the ingestion pipeline, no extra
   work here beyond the back-reference.

Steps 1–2 are the module. Rose can use it the day they land, with no
dependency on ingestion, identity beyond what's built, or anything else.

---

## Acceptance checks

- [ ] Matt's phone cannot write to an item where `person = 'Rose'` — the route
      rejects it, not just the UI
- [ ] Rose's phone cannot write to Tom's items
- [ ] A parent proposal appears in Rose's review queue, attributed, and is
      discardable without trace
- [ ] `role = 'display'` can set and unset `done_at` from a personal view
- [ ] `role = 'display'` cannot create, edit or delete any item, from anywhere
- [ ] A tick from the fridge records `set_from = 'display'`
- [ ] Un-ticking is available and as quiet as ticking
- [ ] Nothing from this module renders in zone 1 — no line, no tile, no count
- [ ] An item due tomorrow shows one line in that child's block at 17:00, and
      not at 16:59
- [ ] The same line is absent at 20:31 and at 07:15 the next morning
- [ ] Two items due tomorrow show one line, never a count
- [ ] The evening line never renders in the attention state
- [ ] An item the child has kept to their own view never appears in the block
- [ ] The person view opens on what's coming, ordered nearest first
- [ ] An item due in 10 days sits in "Later"; at 7 days it sits in "This week"
- [ ] A `task` crosses into "This week" at 2 days, not 7
- [ ] An item with no due date renders at the foot of the list, not as an error
- [ ] The subject picker offers only keys from that child's timetable
- [ ] Adults' add screen has no subject field at all
- [ ] A confirmed proposal links back to its `proposed_item` and the source
      stays tappable
- [ ] `due` survives 4 October 2026 without shifting

---

## Open

- **What it's called on a child's screen.** "Assignments" is accurate for
  school and wrong for everything else; "To do" is honest and sounds like
  homework admin. Rose named the need — worth asking her.
- Whether an adult's own list should sit with the parent `action` items from
  the ingestion brief. They behave almost identically and both live on a
  person page.
- Whether ticking an item on the fridge should be visible to the household at
  all, or silently just update. §7.10 makes the chore tick satisfying and
  public; this may want to be satisfying and private.
- What "feed into reminders" means. See Deferred.
