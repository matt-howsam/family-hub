# Family Hub — Goals Brief

**Status:** proposed, not built.
**Last updated:** 6 October 2026

**This is §7.5 of `family-hub-design-brief.md`, developed.** Not a new module.
§7.5 already settles the hard parts: no streaks, no counters, no days-since, no
progress bars on people; one person-authored next step; only the person edits
their own; kids choose visibility; review is a monthly conversation; status
`released`, not `abandoned`. Everything below builds on those. Claude Code
should validate against `docs/DECISIONS.md` before building and flag conflicts
— two known ones are listed under "Decisions this module amends".

**Designed alongside `family-hub-wants-brief.md`.** The two cross over
constantly — ask Tom about his goals and the answer is an e-bike — and the
split between them is the most important line in either brief: **a want is a
thing with a price; a goal is something a person does.** Read both before
building either.

---

## The problem, precisely

Not tracking. Everyone in this house already has things they want: Rose wants
to be a doctor, Matt is learning Japanese, Tom has a maths test coming.

The failure is that a wish stays a wish. It is never turned into something
with a finish line, never broken into a piece small enough to start this week,
and never talked about at the table — so it is neither worked on nor let go.
It just sits.

**This module turns a wish into a next step, and makes the family the place
goals get talked about.** It is the warmest module in the product, and the one
most easily ruined by borrowing mechanics from apps that want daily opens.

**Success condition:** each person has at least one goal they wrote themselves
and still care about after three months, and the family has had three monthly
goals chats. Not a completion rate.

---

## Why this shape — the evidence, briefly

Four findings shape almost every decision here. They are worth keeping in the
repo so the rules below don't look arbitrary.

1. **Paying for goals undermines them.** A meta-analysis of 128 experiments
   (Deci, Koestner & Ryan, 1999) found expected, tangible, completion-contingent
   rewards reduce intrinsic motivation, more so for children than adults, while
   specific positive feedback increases it. Even the critics of that work agree
   the damage concentrates on high-interest tasks with rewards promised in
   advance. Chores are low-interest; money fits there. Goals are self-chosen;
   money does not. → **No money, points or XP for goals.**

2. **Announcing an identity goal can replace pursuing it.** Gollwitzer et al.
   (2009): when others take notice of an identity-related intention ("becoming
   a lawyer"), people act on it less, because the acknowledgement gives a
   premature sense of already having the identity. → **The wall never
   broadcasts aims. It celebrates things done.**

3. **But telling the *right* person helps.** Klein et al. (2019): sharing a
   goal with someone whose opinion you value raised commitment and performance;
   sharing with a peer was no better than keeping it private. The mechanism is
   evaluation apprehension — useful in moderation, corrosive as pressure.
   → **The owner chooses who knows. Accountability is opt-in and specific.**

4. **Plans with obstacles beat positive visualisation.** Mental contrasting
   with implementation intentions (WOOP: wish, outcome, obstacle, plan) works
   in adolescents — in one study, high-schoolers who did a 30-minute exercise
   completed over 60% more practice questions than controls (Duckworth et al.,
   2011). → **"What could get in the way?" and "If that happens, I'll…" are
   two optional lines on every goal.**

5. **Near goals build the belief that makes far goals possible.** Bandura &
   Schunk (1981) found children working to near-term subgoals built more
   self-efficacy and interest than children given only a distant goal.
   → **Short goals are not a lesser tier. No long-term aim is ever required.**

The frame around all four is autonomy support versus psychological control:
across many studies, parents who support a teenager's own choices predict
autonomous motivation and wellbeing; intrusive control predicts anxiety and
pressured, performance-driven goals. This module is an autonomy-support tool or
it is nothing.

---

## The shape: aims, goals, next steps

Three sizes, one shape. Never deeper than two levels.

### Aim — a direction

> **Become a doctor** · Rose
> **Speak Japanese** · Matt

Big, long, possibly never "done". An aim has no finish line and no date. It
exists to hold stepping stones and to say *why* they matter. Aims are optional
— most small goals have none.

An aim is never marked done. It can be kept, released, or marked *got there*
when the owner decides it has been reached.

### Goal — a stepping stone, or a standalone

> **Finish the body systems in MedTerms** · stepping stone under *Become a doctor*
> **Year 6 maths test** · standalone

Every goal has a **finish line** — required, one line, written as something
you could point at: *Done when: I've done three practice sets before the test.*

Goals do not nest. A goal sits under at most one aim.

### Next step — the only live thing

One line, present tense, on every active goal: *Ask Mum to run me through
fractions on Thursday.* Same rule as projects: a single line, never a
checklist. A checklist lets you feel productive without advancing anything.

The next step is what a goal shows everywhere except its own detail screen.

### Horizon is a field, not a type

Short, medium and long term do not get different shapes, and nobody is asked
to fill all three. Tiered goal frameworks produce a form with three boxes, two
filled to fill the box — and an 11-year-old's honest long-term goal changes
every six months.

The two shapes already cover the range: an **aim** is the multi-year thing; a
**goal** is anything with a finish line, whether that's next week or next
year. What differs between a wheelie and the JLPT is *when*, so that's a
field, set with three chips:

| Chip | Stores | Displays |
|---|---|---|
| **This term** | `by` = current term's last day, from term dates | *by end of Term 4* |
| **This year** | `by` = Term 4's last day of the current school year | *this year* |
| **Later** | `by` null | *later* |

An exact date is available under the chips for the rare goal that has one
(an exam sitting). Horizon is optional; a goal with none reads as *later*.

Term dates already exist for the week letter — reuse them; don't store a
second copy. Between terms, *This term* means the next term.

**A passed `by` date never escalates.** No "overdue", no colour change. It
surfaces at the monthly check-in as a plain question — *Still want this?* —
and nowhere else.

### Two directions, both first-class

Some people start from the top: Rose has *Become a doctor* and stepping
stones spill out of it. Some start from the bottom: Tom has *Do a wheelie*,
and if a bigger aim ever emerges it will emerge from goals like that.

**Expect bottom-up to be the common path for kids**, and design so a goal can
attach upward later as easily as an aim creates stones downward:

- On a goal: **Part of…** picks an existing aim or creates one.
- On an aim: **Add a stepping stone.**
- On a goal: **Make this an aim** — for when "learn Japanese" turns out to be
  bigger than a finish line.

The monthly check-in uses horizon as a lens, never a rule: if someone's active
goals are all *later*, it asks *Anything for this term?* — once, skippable.

### Finish line and hoped-for result are separate fields

This is the coaching move the form makes for free.

| Field | Example | Why |
|---|---|---|
| **Done when** (required) | Three practice sets done before the test | Within the owner's control |
| **Hoping for** (optional) | A B or better | The outcome — partly luck, partly the marker |

A goal is complete when the finish line is crossed, regardless of the result.
A disappointing mark after three practice sets is still a done goal, and the
reflection field is where "the test was harder than expected" goes. This keeps
an 11-year-old's goal from becoming a verdict on him, and it is how the module
honours "achievable and realistic" without anyone having to police it.

Not every goal needs a hoped-for result. "Sit the JLPT N5" is its own finish
line.

### Optional plan lines

Shown on creation as one quiet, skippable step:

- **Why it matters** — one line. Shown on the detail screen, never on the wall.
- **What could get in the way?** — one line.
- **If that happens, I'll…** — one line.

Never required. The form should feel lighter with them blank, not incomplete.

### At most three active goals per person

Stepping stones count; aims don't. Everything else sits in **Someday**, an
unranked pool, until promoted. Same scarcity as wants and holiday slots, for
the same reason: a list of eleven active goals is a list of eleven guilts.

Promoting a fourth asks which one moves to Someday. It does not refuse.

---

## Ownership

Identical to the to-do module: the route gates on
**`session.person === goal.person`**. No adult override. Matt cannot write
Rose's goals.

**Unlike to-do, parents cannot propose goals either.** A to-do item is an
external fact (a deadline exists whether or not Rose likes it); a goal is a
desire. Proposing a desire into a child's queue is the helicopter move this
module exists to avoid. Ideas for a child's goals belong in conversation —
which is what the monthly goals chat is for.

What others *can* do, only on goals they can see:

- **Cheer** a shared win — one line of text, from a phone.
- **Respond to a help request.** The owner can set *Could use help with:* on a
  goal ("getting to the uni open day"). It shows to whoever can see the goal.
  Help is pulled by the owner, never pushed.

---

## Visibility

Per goal and per aim, chosen by the owner, changeable any time.

| Setting | Who sees it |
|---|---|
| **Just me** (default) | The owner only |
| **Chosen people** | The owner plus the people they pick |
| **Family** | Everyone, on phones and in the Goals tab of the owner's person page on the fridge |

Default is *Just me* for everyone, adults included. Parents sharing their own
goals is the strongest thing in this module — kids learn more from watching
Matt set, stall on and release a Japanese goal than from any interface — but it
has to be chosen, not defaulted.

A stepping stone inherits its aim's visibility unless set otherwise. It can be
narrower, never wider.

**Visibility is social privacy, not security** — same as the avatar layer.
Never label it as protection.

---

## What reaches the wall

### Nothing standing

No goals tile, no goals line in zone 1, nothing in the kids' blocks. A child's
ambitions are not dashboard content.

### Wins, when the owner shares one

Completing a goal ends with a choice: *Share this win?* If yes, the dashboard
shows it for three days:

> **Rose** finished the body systems in MedTerms

Rules:

- **Done things only.** Never an aim, never a goal in progress, never a
  hoped-for result. *Tom finished his practice sets*, not *Tom got a B*.
- **Never on school mornings, 06:00–09:00.** That zone belongs to uniform.
- **Lives in the Announcement card** — see `docs/DECISIONS.md`, "The
  Announcement card." Priority 2: above the active-want default, below a
  birthday. Settled 6 October 2026; shared with Wants' own *got it* wins and
  Chores' deferred dashboard line rather than each module inventing its own
  slot.
- **Calm register, warm.** Never the attention state. No confetti, no
  animation on the wall.
- **The owner can withdraw it** from their phone at any time.

---

## Person page — the Goals tab

The person page behind each avatar is tabbed: School · Chores · To Do ·
What's On · **Goals** · Wants. Match the existing tab component, order and
behaviour; don't build a second one. Goals having its own tab settles the
separation DECISIONS asks for between goals and chores — they never share a
screen.

### On the fridge

- **Only goals and aims set to *Family*.** Never *Just me*, never *Chosen*.
- **Each item shows title and next step. Nothing else.** No finish line,
  hoped-for, why, horizon, dates, help request or stepping-stone counts.
- **Aims show their *Family* active stepping stones beneath them.** Done and
  future stones are not shown. Standalone goals follow the aims.
- **A linked want appears as a quiet *for: E-bike* line** — only if that want
  is also *Family*. Otherwise nothing.
- **Plain text.** No tick, no checkbox, no chevron, no row tap. Chores and To
  Do tabs carry ticks; this one must look unlike them so nobody reaches for
  one. **Goals add no fridge writes.** Completing a goal is a moment of
  reflection on a phone, not a tap on a wall.
- **No *Family* items → the tab does not render.** Not an empty tab, not
  *Nothing shared*. An empty tab tells a visiting friend that Tom has no goals
  or is hiding them; an absent one says nothing. With *Just me* as the default,
  this will be the common case at first.
- **Never the tab the person page opens on.** The 60-second return to the
  dashboard resets the tab as for every other tab.
- Someday, Done and Let go never appear on the fridge.
- Owner's avatar tint, family register. Switching tabs is navigation, not a
  write.

### On a phone

- **Your own page:** the Goals tab is the full management surface — My goals,
  add, detail, Someday, Done, Let go.
- **Someone else's page:** their *Family* goals plus any *Chosen* goals that
  name you, with cheers on shared wins and replies to help requests. Read-only
  otherwise. Hidden when nothing is visible to you.

---

## Celebrating, not paying

**No money. No XP, points, levels, badges or streaks.** See evidence §1. This
also keeps the line the (built) chores module draws: chores are assigned work
attached to money; goals are private ambition attached to nothing. If
goals earn currency, "learn to scuba" becomes an unpaid chore the day a
cheaper chore pays better.

What the module does instead:

1. **A done moment on the phone.** Crossing the finish line shows the finish
   line text back, with the date, and one optional question: *What did it
   take?* That reflection — in the owner's words — is the part that builds
   belief they can do the next one.
2. **A record, not a score.** Done goals live on a quiet *Done* shelf in the
   owner's view, newest first, with their reflections. A shelf, not a count —
   no "12 goals completed".
3. **A shared win and cheers.** Specific, written by a person. The app never
   generates praise.
4. **The family decides the celebration, afterwards.** Suggested house
   convention, not a feature: whoever shares a win picks a dinner that week.
   Rewards decided after the fact, small and shared, don't carry the
   undermining effect of rewards promised in advance. **The app does not
   track or promise this.**

**Where money genuinely matters, it lives on a Want, never on the goal.** The
e-bike is a want: price, research, savings. Tom's goal is what *he does* about
it — *Work out which e-bike and what it costs*, or *Save $150 of my own by
Christmas*. The goal holds the finish line and next step; the amount and any
savings figure live on the want (see `family-hub-wants-brief.md`). That keeps
"no progress bars on people" intact: the bar, if any, belongs to the bike.

`want_id` on the goal is the link. Goals have no amount fields at all — a
goal's title may mention money, but nothing in Goals computes with it.

---

## The monthly goals chat

§7.5 says review is a monthly conversation, not a daily nudge. This is that
conversation, given just enough structure to happen.

**On the dashboard:** first Sunday of each month, 16:00–20:30, one calm line
in the Today zone: *Goals chat tonight.* Never attention. Gone at 20:30. This
is the only scheduled thing the module ever says.

**On each phone, a two-minute check-in**, one card per active goal, owner only:

- **Still want this?** Keep · Move to Someday · Let it go
- **Next step still right?** Edit in place
- **Done?** Opens the done moment

Plus a single prompt to look at Someday: *Anything in here you want to start?*
And, only if every active goal is *later*: *Anything for this term?*

A goal whose `by` has passed gets no special treatment beyond appearing here
like every other active goal.

**Parents go first at the table.** Not a software rule — a line in the
check-in screen's header copy for adults: *You go first tonight.*

---

## Letting go

`released`, with an optional one-line reason: *Not interested anymore* is a
complete reason. Released goals move to a *Let go* list in the owner's view,
never shown to anyone else, never on the wall.

Copy: *Let it go.* No "Are you sure?", no sadness. Undo, never confirm — same
rule as the meal planner. Releasing a goal that no longer fits is a good
decision and should feel like one.

Nothing ever expires on its own. A goal untouched for six months stays exactly
as it was; it only moves when the owner moves it.

---

## The AI coach

Optional, phone only, and **build it last** — the form and its copy do most of
the coaching on their own.

### What it does

The person taps *Help me shape this* on a goal or aim. The coach works in one
of five modes:

| Mode | When | Produces |
|---|---|---|
| **Shape** | New wish, rough wording | A finish line, an optional hoped-for result, a first next step |
| **Break down** | An aim | Three to five candidate stepping stones; the person picks and edits |
| **Plan** | Any goal | Obstacle → if-then line |
| **Unstick** | The person says they're stuck | A smaller next step |
| **Check in** | During the monthly check-in | One or two reflection questions |

### How it behaves

- **Only on request.** It never initiates, never notifies, never appears on
  the wall, never writes encouragement into anyone's view.
- **Proposes, never writes.** Every output is a proposal the person accepts,
  edits or discards — the same pattern as the ingestion review queue. Nothing
  saves without a tap.
- **Asks before it tells.** One question at a time. Uses the person's own
  words in what it proposes.
- **Realism without gatekeeping.** It checks whether a finish line is within
  the person's control and fits the time they have. It does not tell a
  13-year-old what ATAR medicine needs. For a Year 7 aim, stepping stones are
  about curiosity and experience — finishing MedTerms, a first aid award with
  St John, asking a doctor what their week is like — not résumé-building.
  Pathway facts only if asked, and flagged as worth checking.
- **Age-aware.** Talks to an 11-year-old differently from a 13-year-old and
  from an adult. Plain language. No exclamation marks.
- **Praise only about specifics**, and only if asked to reflect. No generic
  "great job".
- **Sees only the invoking person's own goals.** Never another person's,
  never compares siblings.

### Guardrails, in the system prompt and tested

- **Body, weight, appearance or eating goals from a child:** reframe toward
  strength, skill or feeling good. **Never numeric weight, calorie or
  food-restriction targets**, never a "before/after" framing.
- **Distress:** if anything suggests the person is struggling, the coach stops
  coaching, responds with care, and suggests talking to a parent or another
  adult they trust, or Kids Helpline (1800 55 1800) for the kids. It does not
  try to be a counsellor and does not alert anyone.
- **Not a parent's channel.** Coach conversations are not stored and are never
  visible to anyone else. Only accepted proposals become data.

### Implementation notes

- A server route calls the Anthropic API with the key in an env var; the
  browser never sees it. Use the current Sonnet model — check the docs for the
  model string rather than trusting one written here.
- Request carries: the person's name and age band, the goal or aim being
  worked on, its aim if any, and the mode. Nothing else.
- Responses are structured JSON (finish line, next step, stones, if-then) so
  the UI renders them as editable proposals rather than chat bubbles.
- Turn off request logging for this route.
- Fails gracefully: if the coach is unavailable, the form still works and says
  so plainly.

---

## Surfaces

**Phone — My goals.** Opens on active goals (max three), each showing title,
next step and its aim if any. Below: aims, Someday, Done shelf, Let go. The
next step is editable in place.

**Phone — Add.** Under thirty seconds, same bar as projects and to-do.
Required: title and finish line (or *This is an aim*, which skips the finish
line). Optional, right there: next step, horizon chips, aim, visibility. The
plan lines (why / obstacle / if-then) are one further, skippable step.

**Phone — Goal detail.** Next step dominant, as on project detail. Then finish
line, hoped-for, horizon, why, obstacle and if-then, visibility, help request,
cheers, links (to-do item, want). *Part of…* and *Make this an aim* live here. For an aim: its stepping stones as a path — done
stones as history, the active one marked, future ones listed plainly. **No
fraction, no percentage, no "2 of 5".**

**Phone — someone else's Goals tab.** Their goals visible to this person,
with cheer and help-response. Read-only otherwise.

**Phone — Monthly check-in.** As above.

**Fridge — Goals tab on the person page.** See "Person page" above.

**Fridge — Dashboard.** Shared wins in the Announcement card; the monthly
goals-chat line. Nothing else.

---

## Links to other modules

- **To-do (§7.11 widened):** a goal like *Year 6 maths test* can link to the
  `todo_item` for the test. The to-do holds the date; the goal holds the
  finish line and the why. Optional, never required.
- **Wants:** a goal links to at most one want; a want shows the goals linked
  to it, filtered by each goal's visibility. See `family-hub-wants-brief.md`.
- **Chores (built):** no link. On a child's person view, goals and chores stay
  visibly different kinds of content, as already decided.
- **Term dates:** read for the horizon chips. Not copied.

---

## Data model

```
goal
  id
  person          text not null          -- owner, and the only write gate
  kind            text not null          -- 'aim' | 'goal'
  aim_id          references goal(id)    -- only when kind = 'goal'
  title           text not null
  done_when       text                   -- required when kind = 'goal'
  hoping_for      text
  why             text
  obstacle        text
  if_then         text
  next_step       text
  help_wanted     text
  horizon         text                   -- 'term' | 'year' | 'later' | 'date' | null
  by              date                   -- resolved from horizon, or exact; null for later
  state           text not null          -- 'active' | 'someday' | 'done' | 'released'
  visibility      text not null default 'me'   -- 'me' | 'chosen' | 'family'
  reflection      text                   -- written at done
  release_note    text
  win_shared_at   timestamptz            -- null = not shared
  todo_item_id    references todo_item(id)
  want_id         references want(id)    -- see wants brief
  position        int                    -- order of stones under an aim
  created_at      timestamptz not null default now()
  updated_at      timestamptz not null default now()
  done_at         timestamptz
  released_at     timestamptz

  check ((kind = 'goal') = (done_when is not null))
  check (kind = 'goal' or aim_id is null)

goal_supporter    -- for visibility = 'chosen'
  goal_id, person

goal_cheer
  id, goal_id, from_person, body text not null, created_at
```

Notes:

- `by` is a `date`, never `timestamptz` — same DST rule as every other date in
  the app. `horizon` is stored alongside so the label reads *by end of Term 4*
  rather than a bare date, and so a term-date correction can re-resolve it.
- Aims have no `horizon` or `by`.
- Aims use `state` `active | someday | done | released`; *done* on an aim
  displays as *got there*.
- The three-active cap is enforced at the route: count of `kind = 'goal'`,
  `state = 'active'` for that person.
- No priority, no progress field, no percent, no streak, no points. Nothing is
  stored about urgency or momentum.
- `position`, not `order`. Match existing id and timestamp conventions.

---

## Decisions this module adds

Record in `docs/DECISIONS.md`. Wording ready to paste.

**Goals carry no money, points, XP or levels.**
Rewards promised in advance for something chosen freely reduce the wanting.
Chores are paid because they are chores. Goals are celebrated because they
are wins. Where a goal needs money for its means, it links to Wants.

**The wall celebrates things done, never things intended.**
Announcing an aim can stand in for pursuing it. Aims and goals in progress
stay on phones and in person-page tabs; only shared wins reach the dashboard.

**Every goal has a finish line in the owner's control.**
`done_when` is required. A hoped-for result is a separate, optional field, so
an unlucky outcome is never a failed goal.

**Three active goals per person; the rest wait in Someday.**
Same scarcity as wants and holiday slots.

**Time frame is a field, not a type. No long-term aim is ever required.**
This term / this year / later, resolved from term dates. Goals can attach
upward to an aim later; bottom-up is the expected path for kids.

**Money lives on a want, never on a goal.**
The thing with a price is a want. What a person does about it is a goal.

**Parents cannot write or propose goals for anyone else.**
Unlike to-do, where a deadline is an external fact. Ideas belong in the
monthly chat. Others can cheer shared wins and answer help requests.

**Visibility defaults to "just me", for adults too.**

**Nothing in Goals expires, decays or nudges.**
The only scheduled output is the first-Sunday goals-chat line.

**The AI coach speaks only when asked and only proposes.**
Phone only, owner only, never stored, never on the wall.

---

## Decisions this module amends

- **"No generated encouragement in a child's view."** Stands. The coach
  generates *questions and proposals on request*, not encouragement. Suggest
  amending the line to: *No generated encouragement anywhere. The goals coach
  speaks only when asked, and proposes rather than praises.*
- **"No progress bars on people."** Stands, and extends: a stepping-stone
  path shows done stones as history and never as a fraction or percentage.
- **The home screen brief's "daily rotating item" / Saturday-state space.**
  Resolved 6 October 2026 as the Announcement card, a shared slot across
  Chores, Goals and Wants rather than a per-module answer — see
  `docs/DECISIONS.md`, "The Announcement card."

---

## Scope

### Not this module

- Habit tracking, daily check-ins, reminders, notifications.
- Streaks, points, XP, levels, badges, leaderboards.
- Money for completion.
- Parent-set or parent-proposed goals.
- Progress percentages, charts, "on track" indicators.
- Deadlines with consequences. `by` is an intention, not a due date.

### Deferred

- The AI coach (build order step 7).
- A yearly look-back — *what we did this year* — drawn from Done shelves the
  owners chose to share. Worth it eventually; not before there's a year of
  data.

---

## Build order

Interleave with Wants: Goals 1–2, then Wants 1–2, then the `want_id` link,
then continue both. Create the `want` table before `goal` so the foreign key
exists from the start.

1. `goal`, `goal_supporter`, `goal_cheer` tables.
2. Phone: My goals, Add, Detail, done moment, Let go. Visibility *Just me*
   only. **This is the module** — usable the day it lands.
3. Visibility *Chosen* and *Family*; Family goals view on phones; cheers;
   help requests.
4. Goals tab on the fridge person page, read-only.
5. Shared wins on the dashboard.
6. Monthly check-in and the first-Sunday line.
7. AI coach.

---

## Design

Family register: warmer, rounded, person-tinted. The owner's avatar colour
tints their goals; nothing else in the product does this as strongly. Phosphor
icons. Build from existing tokens; **if a new token seems necessary, stop and
flag it.**

**Copy carries the coaching.** Write it as a good coach talks — short
questions, no exclamation marks, nothing that apologises:

| Field | Prompt |
|---|---|
| Title | *What do you want?* |
| Finish line | *How will you know it's done?* |
| Hoping for | *Anything you're hoping happens?* |
| Next step | *What's the very next thing?* |
| Obstacle | *What's most likely to get in the way?* |
| If-then | *If that happens, I'll…* |
| Release | *Let it go* |
| Empty state | *Nothing here yet. Start with something small.* |

### Design examples — not seed data

**Do not seed goals.** Each person writes their own; an app arriving with
goals pre-filled for a child is exactly the wrong first impression. These are
for designing against only:

- *Rose* — aim: Become a doctor. Stones: Finish the body systems in MedTerms ·
  Finish my next St John first aid award · Ask a doctor what their week is
  like.
- *Matt* — aim: Speak Japanese. Stone: Sit the JLPT N5.
- *Tom* — standalone: Do a wheelie. Done when: five metres, on video.
  Horizon: this term. Next step: practise lifting the front on the grass.
- *Tom* — standalone: Year 6 maths test. Done when: three practice sets
  before the test. Hoping for: a B or better.
- *Tom* — standalone, linked to his personal want *E-bike*: Work out which
  e-bike and what it costs. The price and savings live on the want.

---

## Acceptance checks

- [ ] Matt's phone cannot create, edit or delete a goal where `person = 'Rose'`
      — the route rejects it, not just the UI
- [ ] No route accepts a goal proposal from one person into another's list
- [ ] A goal cannot be saved without `done_when`; an aim cannot have one
- [ ] A goal can sit under at most one aim; an aim cannot sit under anything
- [ ] A fourth active goal prompts a move to Someday rather than refusing
- [ ] New goals and aims default to *Just me*
- [ ] A *Chosen* goal is visible only to the owner and named supporters
- [ ] A stepping stone cannot be more visible than its aim
- [ ] `role = 'display'` cannot write anything in this module
- [ ] The fridge Goals tab shows title and next step only, for *Family*
      goals only
- [ ] A person with no *Family* goals has no Goals tab on the fridge — not an
      empty one
- [ ] The fridge Goals tab has no tick, checkbox, chevron or row tap
- [ ] The person page never opens on the Goals tab on the fridge
- [ ] A linked want shows as *for: …* only when the want is also *Family*
- [ ] On a phone, another person's Goals tab shows their *Family* goals plus
      *Chosen* goals naming the viewer, and is hidden when there are none
- [ ] No goal, aim or count renders on the dashboard except a shared win and
      the goals-chat line
- [ ] A shared win shows for three days, never 06:00–09:00, never in the
      attention state, and disappears when withdrawn
- [ ] A shared win never shows `hoping_for`
- [ ] *Goals chat tonight* shows on the first Sunday of the month at 16:00 and
      not at 15:59; gone at 20:31; never in attention
- [ ] No fraction, percentage or count appears on any aim's stepping-stone
      path
- [ ] Nothing changes state on its own; a goal untouched for six months is
      unchanged
- [ ] Releasing offers undo, never a confirmation dialog
- [ ] `by` survives 4 October 2026 without shifting
- [ ] *This term* resolves to the current term's last day from existing term
      dates; between terms, to the next term's
- [ ] A goal past its `by` shows no overdue state anywhere
- [ ] A standalone goal can be attached to an aim later; a goal can be turned
      into an aim
- [ ] Nothing requires an aim to exist before a goal is added
- [ ] The goal form has no amount fields
- [ ] Coach (step 7): no output saves without an accept tap
- [ ] Coach: a child's weight-loss wish produces no numeric weight, calorie or
      restriction targets
- [ ] Coach: a distress statement produces care and a pointer to a trusted
      adult, not a plan
- [ ] Coach: request includes only the invoking person's own goals
- [ ] Coach unavailable: form still works, says so plainly, no spinner

---

## Open

- **Ask Rose and Tom before building step 5.** Would they share wins on the
  wall? If the answer is "never", the dashboard piece is wasted work. Rose
  shaped the timetable and asked for to-do; she should shape this.
- **What the module is called on a kid's screen.** *Goals* may read as school
  language. Worth asking.
- **Cheers: a line of text, or a single tap?** Text encourages specific
  praise, which is the kind that works. A tap is easier and gets used more.
- **Three active goals, or two for the kids?**
- **Whether the coach belongs in v1 at all.** The form copy may do enough. Use
  steps 1–6 for a couple of months first and see where people get stuck.
- **Whether Matt's and Renée's goals should sit beside the kids' at the
  monthly chat on one shared screen**, or each on their own phone. One screen
  is more of a ritual; it also makes everyone's list visible at once.

---

## References

- Deci, Koestner & Ryan (1999). A meta-analytic review of experiments examining
  the effects of extrinsic rewards on intrinsic motivation. *Psychological
  Bulletin* 125(6).
- Gollwitzer, Sheeran, Michalski & Seifert (2009). When intentions go public:
  does social reality widen the intention–behavior gap? *Psychological
  Science* 20(5).
- Klein, Lount, Park & Linford (2020). When goals are known: the effects of
  audience relative status on goal commitment and performance. *Journal of
  Applied Psychology* 105(4).
- Bandura & Schunk (1981). Cultivating competence, self-efficacy, and
  intrinsic interest through proximal self-motivation. *Journal of
  Personality and Social Psychology* 41(3).
- Duckworth, Grant, Loew, Oettingen & Gollwitzer (2011). Self-regulation
  strategies improve self-discipline in adolescents: benefits of mental
  contrasting and implementation intentions. *Educational Psychology* 31(1).
