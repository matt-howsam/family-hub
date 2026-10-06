# Family Hub — Wants Brief

**Status:** proposed, not built.
**Last updated:** 6 October 2026

**This is §7.9 of `family-hub-design-brief.md`, developed, and designed
alongside `family-hub-goals-brief.md`.** Read both before building either. The
line between them is the most important rule in each:

> **A want is a thing with a price. A goal is something a person does.**

Tom's e-bike is a want. *Work out which e-bike and what it costs* is Tom's
goal. *Do a wheelie* is a goal with no want at all. A boat is a want; *get my
boat licence* would be a goal. When something could be either, the money goes
on the want and the actions go on the goal.

Claude Code should validate against `docs/DECISIONS.md` and the built chores
module before building, and flag conflicts.

---

## The problem, precisely

Not budgeting. The scorecard and register already cover where money goes.

Wants fail in two opposite ways:

- **Everything is a someday.** A list of eight things the family might buy is
  eight predictions and eight disappointments. Nothing gets saved for because
  nothing has been chosen.
- **Purchases arrive without the conversation.** A boat is bought, and then
  the rego, insurance, mooring and servicing turn up on the register as a
  surprise — the real cost was never on the table when the decision was made.

**This module makes the family choose one thing at a time, and shows what
that thing really costs before it's bought.**

---

## Two kinds of want

The design brief's scarcity rule — one active item — is right for a boat and
wrong for Tom saving gift money. They are different things and get different
rules.

| | Household | Personal |
|---|---|---|
| **Whose money** | The family's | The person's own |
| **Example** | Boat, DJ mixing desk | Tom's e-bike, Rose's headphones |
| **Who decides** | Matt and Renée | The owner |
| **Active at once** | One, for the whole household | One per person — *saving for now* |
| **Visible** | Always to the family | Owner's choice, as with goals |
| **On the wall** | The active one, quietly | Only a shared *got it* |

A personal want can be **suggested to the family**: the owner copies it into
the household pool, attributed to them. That's how *Tom's e-bike* becomes a
family conversation if Tom wants it to. The personal one stays his.

---

## Money: what this module does not track

**Kids' money is not tracked here.** It comes from several sources — gifts,
chores, Rose's part-time job — and lives on their CommBank Kit cards, which
already have a savings tracker. Kit is the source of truth for how much a kid
has. A second copy in the Hub would go stale within a month and start an
argument the first time the two disagree.

So:

- **No link to chores income.** Chores pays out as it already does. Wants
  doesn't read from it.
- **A personal want's saved figure is optional, owner-entered, owner-only.**
  Labelled *my count*, with an *as at* date, never shown to anyone else
  regardless of the want's visibility. Many kids will leave it blank and use
  Kit. That's fine and should feel fine.
- **Household savings are a single manual figure** on the active want,
  updated by an adult, with an *as at* date. No account link, no
  transactions. Same rule as everywhere else: a stated number with its age,
  never a confident guess.

**The deal, not the maths.** A personal want can carry a one-line note of
any family arrangement — *Mum and Dad pay half once I've saved my half*.
Written by the owner, as agreed in conversation. The app records the
agreement; it doesn't compute it. Whether the family matches kids' savings at
all is a family decision this module deliberately doesn't encode.

---

## The pool and the active item

### Household

- **The pool is unranked.** Sorted alphabetically, not by date or priority —
  either would imply an order nobody chose. A ranked list of eight is the
  feature that gets built and abandoned.
- **Anyone can add an idea** from their phone, attributed to them, in under
  thirty seconds. Kids included, same as holiday ideas.
- **Promoting to active is an adult decision.** Promoting a second asks which
  one returns to the pool. It does not refuse.
- **Only the active want gets a date and a saved figure.** A target date on
  every item is a stack of broken promises.
- **Retire out loud.** Releasing an idea requires a one-line reason, visible
  to whoever proposed it. A kid's suggestion rotting untouched for three years
  reads as being ignored; *Not while the kitchen's happening* is an answer.

### Personal

- Any number in the pool, unranked.
- One *saving for now*, chosen by the owner, optionally with a horizon.
- Released personal wants need no reason. They're nobody else's business.

### Horizon

Reuse the goals module's chips — *this term · this year · later* — resolved
from existing term dates, plus an exact month for household wants that need
one. Shared component, shared rules: a passed date never escalates.

---

## The true cost

The single most useful thing this module does for household wants.

Every want carries, optionally:

- **Estimate** — with its basis: *guess · researched · quoted*, and *as at*
  date. These must look different, the same way the register distinguishes
  actuals from working averages. A guess and a quote are different kinds of
  number.
- **Ongoing cost** — an amount per month or per year, plus a one-line note:
  *rego, insurance, mooring, servicing*.

On the active household want, show both together:

> **Boat** · ~$45,000 researched · **+ ~$3,200 a year to keep**

That second number is what makes this a decision rather than a wish. Nothing
else in the product puts the running cost next to the purchase price at the
moment it matters.

Ongoing cost is optional on personal wants, and usually zero. The e-bike's
might be a battery in four years; worth a line, not a field Tom must fill.

---

## When it's bought

*Got it* moves the want to `bought` with a date and offers, once each, never
blocking:

- **Share this win?** — reuses the Announcement card's shared-win priority
  (priority 2; see `docs/DECISIONS.md`, "The Announcement card"), the same
  slot Goals' wins use. *We got the boat.* *Tom got his e-bike.* Same rules:
  three days, never 06:00–09:00, calm register, withdrawable.
- **Add ongoing costs to the register?** — household wants only, Matt or
  Renée (register write rules — reversed 23 September 2026, see
  `docs/DECISIONS.md`; every write route, register included, gates on
  `role === 'adult'` alone). Pre-fills a register row from the ongoing cost.
  Does not create it silently.
- **Track it as an asset?** — if the Assets module exists, pre-fills an asset
  from the want: name, cost, date. Otherwise this step doesn't appear.

A bought want stays visible in a *Got* list. A household that can see what it
saved for and got is a household that believes the next one will happen.

---

## What reaches the wall

**No tile.** Wants doesn't answer "does this need me?" — nothing here is ever
urgent.

**The active household want is the Announcement card's default** — see
`docs/DECISIONS.md`, "The Announcement card." Settled 6 October 2026: one
shared dashboard slot across Chores, Goals and Wants, rather than each module
inventing its own. The want shows whenever no higher-priority announcement
(a birthday, a shared win, a manual note) applies:

> Saving for · **Boat** · around mid-2028

Title, horizon, and the estimate if the adults choose. **The saved figure
renders on phones only by default** — a running balance on a kitchen wall is
read by every guest and tradesperson. Whether a proportion (no dollar figure)
can show on the wall is open; see below.

Tapping the line opens the household Wants view on the fridge: the active
household want, the household pool with attribution, and the *Got* list.
Read-only. No fridge writes in this module.

**Personal wants** appear only in the owner's Wants tab — see below.

**Shared wins**, as above.

---

## Person page — the Wants tab

The person page behind each avatar is tabbed: School · Chores · To Do ·
What's On · Goals · **Wants**. Match the existing tab component; don't build
a second one.

**The Wants tab holds personal wants only.** Household wants never appear in
anyone's tab — not even Matt's or Renée's. They belong to the house, and live
in the household Wants view reached from the dashboard line. Matt's Wants tab
holds what Matt is saving for with his own money, if anything.

### On the fridge

- **Only personal wants set to *Family*.**
- ***Saving for now* first**, marked, with its horizon (*this year*). Then the
  rest of that person's *Family* pool, alphabetical, title only.
- **Never an amount.** Not the estimate, not *my count*, not *the deal*. A
  kid's price list on the kitchen wall invites commentary; the phone is where
  the numbers are discussed.
- **Linked goals appear beneath a want** — *Work out which e-bike* — only if
  the goal is also *Family*. This is where Tom's e-bike and his goals for it
  sit together; the Goals tab carries the matching *for: E-bike* line.
- **Plain text.** No tick, no checkbox, no chevron, no row tap. No fridge
  writes.
- **No *Family* wants → the tab does not render.** Same reason as Goals: an
  empty tab says something; an absent one doesn't.
- **Never the tab the person page opens on.** Resets with the 60-second
  return.
- *Got* and released personal wants never appear on the fridge. A shared
  *got it* win is the dashboard's job.
- Owner's avatar tint, family register.

### On a phone

- **Your own page:** the Wants tab is the full management surface for your
  personal wants.
- **Someone else's page:** their *Family* wants plus any *Chosen* wants that
  name you. On a phone, others see the estimate, links, notes and *the deal*.
  **Never *my count*.** Read-only. Hidden when nothing is visible to you.

---

## Ownership

| Action | Who |
|---|---|
| Add a household idea | Anyone, from a phone |
| Add links and notes to a household want | Anyone |
| Edit estimate, ongoing cost, saved, horizon on household | Matt, Renée |
| Promote, release, mark got | Matt, Renée |
| Anything on a personal want | The owner only — `session.person === want.person` |
| Anything, from `role = 'display'` | Nothing |

Parents cannot write to a kid's personal want, same rule as goals. *The deal*
is written by the kid, after the conversation.

---

## Links to other modules

- **Goals:** a goal carries `want_id`. A want shows its linked goals, filtered
  by each goal's visibility. The want holds the money; goals hold the actions.
- **Register:** on *got*, offer ongoing costs as a register row. No other link.
- **Assets:** on *got*, offer an asset if the module exists.
- **Holidays:** separate module. See Decisions.
- **Chores:** no link. Kids' money is tracked on Kit.
- **Scorecard:** no link — but see Open.
- **Files (§7.7):** if built, quotes and manuals attach to a want and carry
  across to the asset on *got*.

---

## Data model

```
want
  id
  scope            text not null      -- 'household' | 'personal'
  person           text not null      -- owner (personal) or proposer (household)
  title            text not null
  why              text               -- one line: what we'd do with it
  notes            text               -- research
  estimate         numeric
  estimate_basis   text               -- 'guess' | 'researched' | 'quoted'
  estimate_as_at   date
  ongoing_cost     numeric
  ongoing_period   text               -- 'month' | 'year'
  ongoing_note     text
  state            text not null default 'pool'
                                      -- 'pool' | 'active' | 'bought' | 'released'
  horizon          text               -- 'term' | 'year' | 'later' | 'date', active only
  by               date
  saved            numeric            -- active only
  saved_as_at      date
  deal             text               -- personal: the family arrangement, one line
  funding_note     text               -- household: how we're funding it
  visibility       text               -- personal only: 'me' | 'chosen' | 'family'
  release_note     text               -- required for household release
  suggested_from   references want(id)  -- household copy of a personal want
  win_shared_at    timestamptz
  bought_at        date
  released_at      timestamptz
  created_at       timestamptz not null default now()
  updated_at       timestamptz not null default now()

  check (estimate is null or estimate_basis is not null)
  check ((ongoing_cost is null) = (ongoing_period is null))
  check (scope = 'personal' or visibility is null)
  check (state = 'active' or (saved is null and by is null))

want_link
  id, want_id, url, label, added_by, created_at

want_supporter      -- for personal visibility = 'chosen'
  want_id, person
```

Notes:

- One active household want, and one active personal want per person —
  enforced at the route.
- `by`, `bought_at`, `estimate_as_at`, `saved_as_at` are `date`, never
  `timestamptz`.
- Saved figures move back into the pool with the want? **No** — demoting an
  active want clears `saved` and `by`. The money didn't vanish, but the
  number now belongs to whatever replaces it. Confirm via undo, not a dialog.
- No priority, no rank, no position field. The pool is unranked on purpose.
- `want_supporter` mirrors `goal_supporter`; consider one shared
  `supporter` table if the schema conventions allow.
- Match existing id and timestamp conventions. Create `want` before `goal`.

---

## Decisions this module adds

Record in `docs/DECISIONS.md`. Wording ready to paste.

**A want is a thing with a price; a goal is something a person does.**
Money lives on the want. Actions live on the goal. They link; they never
merge.

**Household and personal wants are different objects with different rules.**
One active household want, decided by adults. One *saving for now* per
person, decided by them.

**Kids' money is tracked on their Kit cards, not here.**
A personal saved figure is optional, self-entered and owner-only. Chores
income is not linked.

**The pool is unranked. Only the active want gets a date and a figure.**

**Household ideas are retired out loud, with a reason the proposer sees.**

**The running cost sits beside the price.**
A want isn't a decision until its ongoing cost is on the table.

**Holidays and wants are two modules.**
Holidays have fixed slots and a decide-by date; wants have a queue. They
compete for the same money, which is a reason for a shared view later, not
for one data model.

**No saved balance on the wall by default.**

---

## Scope

### Not this module

- Bank or Kit integration, balances, transactions.
- Reading chores income or computing what a kid can afford.
- Price tracking, deal alerts, scraping product pages.
- Ranked wishlists, gift registries.
- A matching or interest scheme computed by the app.

### Deferred

- **A shared "what we're saving for" view** across the active household want
  and holiday slots, once Holidays exists.
- Kids' wish lists for birthdays and Christmas. Tempting reuse of the personal
  pool, but a different social contract (others buy, the list is shared on
  purpose). Decide separately.

---

## Build order

1. `want`, `want_link`, `want_supporter` tables (before `goal`).
2. Phone: household pool, add idea, detail, promote, release with reason.
3. Phone: personal wants, *saving for now*, visibility, *the deal*.
4. The goal ↔ want link (with Goals step 2 done).
5. *Got it* flow: shared win, register and asset handoffs.
6. Fridge: Announcement card default line, read-only household Wants view,
   and the Wants tab on the person page.
7. Suggest a personal want to the family.

Steps 1–3 are the module.

---

## Design

Household wants sit in the **household register** (tight, restrained) — they
are family money, like the scorecard. Personal wants sit in the **family
register**, tinted with the owner's avatar colour, like goals. The visual
split does the work of explaining the two kinds without a label. Phosphor
icons, existing tokens; **if a new token seems necessary, stop and flag it.**

Estimate basis needs three treatments that read without a legend — reuse
whatever the register already does for actual / working average / estimate
rather than inventing a second language.

Copy, in the house voice:

| Where | Copy |
|---|---|
| Household pool | *Every dollar has a job. Pick the next one.* |
| Add idea | *What do you want for the house?* |
| Release | *Not now — tell them why* |
| Ongoing cost | *What does it cost to keep?* |
| Personal deal | *Any deal with the family?* |
| Saved, personal | *My count* · *Kit has the real number* |
| Got it | *Got it* |

### Design examples — not seed data

From §7.9: a boat, Tom's e-bike, a DJ mixing desk, a fishing drone. **Do not
seed them.** Household ideas are entered by whoever has them; personal wants
by their owner. Use these to design the pool, the active state with true
cost, and a personal want linked to a goal.

---

## Acceptance checks

- [ ] Matt's phone cannot write to Tom's personal want — the route rejects it
- [ ] Any person can add a household idea; it records them as proposer
- [ ] Only Matt and Renée can promote, release, mark got, or edit figures on
      household wants
- [ ] A second active household want prompts which returns to the pool
- [ ] Each person has at most one active personal want
- [ ] Pool items have no `by` or `saved`; demoting clears both, with undo
- [ ] Household release requires a reason; the proposer can see it
- [ ] The household pool renders alphabetically with no rank indicator
- [ ] A personal *my count* is never visible to anyone but the owner,
      whatever the want's visibility
- [ ] No route reads chores or any balance source
- [ ] Estimate basis renders three visibly different ways
- [ ] Active household want shows estimate and ongoing cost together
- [ ] *Got it* offers a shared win; a household *got it* offers a register
      row to Matt or Renée and never creates one without a tap
- [ ] The Wants tab holds personal wants only; household wants never appear
      in any person's tab
- [ ] The fridge Wants tab shows *Family* personal wants only, *saving for
      now* first, and no amount of any kind
- [ ] A person with no *Family* wants has no Wants tab on the fridge — not an
      empty one
- [ ] The fridge Wants tab has no tick, checkbox, chevron or row tap, and is
      never the tab the person page opens on
- [ ] A linked goal shows beneath a want only when the goal is also *Family*
- [ ] On a phone, another person's Wants tab never shows *my count*
- [ ] The Announcement card's default line shows title and horizon, no saved
      figure, never on school mornings, never in attention
- [ ] `role = 'display'` cannot write anything in this module
- [ ] A goal can link to a want; the want shows only goals the viewer can see
- [ ] Dates survive 4 October 2026 without shifting

---

## Open

- **A proportion on the wall?** *Saving for · Boat · about a third there*
  makes the family's progress visible without broadcasting a balance. It is
  also a progress bar, on a thing rather than a person. Lean yes; the
  Announcement card is now designed (see `docs/DECISIONS.md`), so this just
  needs a decision rather than a slot to land in.
- **Does the family match kids' savings?** The module records whatever is
  agreed in *the deal* and computes nothing. Worth deciding before Tom asks,
  because he will.
- **Big want purchases on the scorecard.** A funded $45k purchase, or even a
  $1,200 e-bike top-up, will land on a card and in a weekly category —
  probably Shopping — and swamp it. That's a categorisation rule for the
  scorecard routine, not this module, but it should be settled before the
  first *got it*.
- **Kids' gift wish lists** — see Deferred.
