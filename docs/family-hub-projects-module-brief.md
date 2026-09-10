# Family Hub — Projects & Maintenance Module Brief

The v1 module. The only thing being built now. Everything else in the product
waits behind this.

---

## The problem, precisely

Not tracking. The household knows what it wants to do.

A job like "paint the house" has five or six stages, dies at stage two, and
nobody notices for six months. The failure is invisible because nothing
happens — there's no alert for absence, no email that doesn't arrive. The
month it stalled looks exactly like the month after.

**This module makes absence visible.** That's the whole feature.

---

## The eight real projects

Design with these, not placeholders.

| # | Job | Est. | Pipeline | Stage now |
|---|---|---|---|---|
| 1 | Front landscaping | — | Contracted | Research |
| 2 | Paint the house | — | Contracted | Quoting — waiting on quote |
| 3 | Under stair storage | ~$2k | DIY | Idea |
| 4 | Remodel kids' bathrooms | — | Contracted | Idea |
| 5 | Downstairs flooring | — | Supply & install | Idea — queued behind kitchen |
| 6 | Remodel kitchen | $40k+ | Contracted | Research |
| 7 | Replace rear sliding doors | — | Supply & install | Quoting |
| 8 | Upstairs bathroom cupboard sliders | $500 | Supply & install | **Quote received — awaiting funds** |

Plus maintenance, which currently lives on the operations register: servicing
the Defender, servicing the Mazda, pool pump service, gutter clean, boat
licence renewal.

Three things follow:

**The range is enormous.** $500 for the bathroom sliders against $40,000+ for
the kitchen — nearly two orders of magnitude on one screen. `budget_est`
cannot use a single visual treatment, and the small job must not disappear
next to the large ones. It is the most likely to actually happen.

**On day one, all seven are stalled.** Nothing has moved, because nothing has
been in the system to move. This is the real first screen and it must not read
as seven failures. See §5.

**Some are queued, not stalled.** Flooring waits on the kitchen; the sliding
doors probably go in with the flooring. A job deliberately waiting on another
has not fallen off the radar.

**One is blocked on money, which is a third kind of not-moving.** The
bathroom cupboard sliders have a quote, a supplier, and an agreed price. Matt
is not failing to act and the supplier is not slow — the job is simply queued
for cash. See §2.

Note that job 8 makes the day-one screen better, not worse: among seven jobs
that have never moved, one has an obvious next step. That is the "pick one
from these" reading the list needs, and it is why the small job must stay
visible.

---

## 1. Pipelines

The original spec had one project pipeline. Seven real jobs show that doesn't
fit — forcing under-stair storage through a Quoting stage is friction that
makes people stop using the app.

The existing data model already solves this: `Stage` has a `job_id`, so stages
are per-job. A pipeline is just which stages get created at the start. No
schema change, four presets.

**Contracted** — someone else does the work
> Idea → Research → Quoting → Decide → Booked → In progress → Done

**DIY** — we do the work
> Idea → Plan → Materials → Build → Done

**Supply & install** — a product with a lead time
> Research → Choose → Quote → Order → Delivery → Install → Done

**Maintenance** — recurring
> Due → Booked → Done → resets to next due

Stages are editable per job after creation. Most people won't. The presets
exist so nobody has to think at the moment of adding something.

**Design implication:** the stage indicator must handle pipelines of four to
seven stages without looking broken at either end.

---

## 2. The stall model, refined

`last_moved_at` is set when a stage changes. The Stalled list sorts by days
since. That's the core and it stays.

But the original model can't tell these apart:

- Matt hasn't called anyone about the painting. **Three weeks. His fault.**
- Brett said he'd send the quote Tuesday and hasn't. **Three weeks. Not his fault, but a chase is overdue.**

Both look identical to `last_moved_at`, and they need different words. One
says *start this*; the other says *chase Brett*.

**Add a "waiting on" state to the job:** who we're waiting for, and when we
expected to hear. While set, the job moves out of "Needs you" and into
"Waiting" — and when the expected date passes, it surfaces as a chase, not a
stall.

**A third case: blocked on funds.** The bathroom cupboard sliders have a
quote, a supplier and a price. Nobody is failing to act. The job is ready and
queued for money.

This needs its own state because the language differs again — *start this* /
*chase Brett* / *this is ready when you are*. A funded-blocked job should feel
like a decision available to make, not a failure. It is the most positive
thing on the list.

It also connects to the scorecard. **Home Projects runs at $200/month**, so
$500 is two and a half months of that line; a $40,000 kitchen never comes from
it at all. Worth showing which bucket a job draws on — monthly allowance
versus separate financing — because "can we do this?" is a completely
different question at either end.

This is the single most valuable refinement in this brief. "Waiting on a
quote" is where household projects actually die, and it's the one case the
original mechanic misreads.

**Two rules that stay:**

- **Adding a note does not reset the clock.** Talking about a job isn't moving
  it. Otherwise "still waiting on Brett" buys a fresh three weeks every time
  someone grumbles about Brett — exactly the failure this catches. The UI
  should make this feel intentional rather than broken.
- **Maintenance only enters Stalled after `next_due` passes.** A gutter clean
  waiting eleven months by design must never top the list.

**Threshold:** 21 days. One global number in v1. Resist per-stage tempo
tuning — it's a plausible-sounding feature that adds a settings screen and
solves a problem nobody has yet.

---

## 3. Data model

Additions to the original in **bold**.

```
Job
  id, title
  type: 'project' | 'maintenance'
  pipeline: 'contracted' | 'diy' | 'supply_install' | 'maintenance'
  status: 'active' | 'parked' | 'done'
  stage_id
  next_action              // ONE line: "Call Brett for quote"
  owner                    // Matt | Renée | Tom | Rose
  due                      // optional
  last_moved_at            // set on stage change only
  budget_est
  budget_actual            // optional, filled as it completes
  blocked_reason           // optional: 'vendor' | 'funds' | 'other_job'
  waiting_on               // optional, free text: "Brett — quote"
  waiting_since            // optional
  waiting_expected         // optional
  funding_source           // optional: 'monthly' | 'savings' | 'undecided'
  blocked_by               // optional job_id
  asset_id                 // optional, links to §7.8 Asset
  created_at

Stage
  id, job_id, name, position, entered_at, completed_at

Note                       // append-only
  id, job_id, author, body, created_at

Quote
  id, job_id, vendor, contact, amount, valid_until
  status: 'requested' | 'received' | 'accepted' | 'declined'
  requested_at

MaintenanceSchedule
  job_id, interval_months, last_done, next_due
```

Notes:

- `position`, not `order` — reserved word in SQL.
- `Job.stage_id` is denormalised from the current `Stage`. Right call for
  query simplicity; update both in one transaction.
- Owners are a hardcoded enum. No users table.
- `Stage.entered_at` and `completed_at` give you the history to show where a
  job's time actually went. See §7.
- `Quote.requested_at` catches the case `last_moved_at` misses: a quote
  requested three weeks ago on a job that hasn't changed stage.

---

## 4. Screen one — the list

The most important screen in the product. Everything else is optional.

**Five groups, in this order:**

| Group | Meaning | Example |
|---|---|---|
| **Needs you** | Our move, nothing for 21+ days | Paint the house — no movement, 34 days |
| **Waiting** | Their move, chase overdue | Sliding doors — quote requested 18 days ago |
| **Moving** | Changed recently | Front landscaping — moved to Quoting, 4 days |
| **Ready** | Priced and decided, waiting on funds | Bathroom sliders — $500, quote in hand |
| **Queued** | Blocked by another job, or parked | Flooring — waiting on kitchen |
| **Due** | Maintenance with a date approaching or passed | Defender service — due in 3 weeks |

Empty groups disappear entirely. A group header with nothing under it is
noise.

**Each row shows:** title, current stage, owner, and days since last movement.
The next action should be visible on the row for anything in "Needs you" —
that's the difference between a list you read and a list you act on.

**Sort within "Needs you" by days descending.** The worst offender is at the
top. That's the point.

### The day-one problem

On launch, all seven projects are in "Needs you" with no history. Seven
renovations, none started, sorted by how long you haven't started them.

**A screen that reads as seven failures gets closed and not reopened.** The
design has to make it read as seven things worth picking one from. Options
worth exploring: showing only the top three with the rest collapsed;
foregrounding the next action over the elapsed time; treating a job with no
history differently from one that genuinely stalled.

This is the screen to get right. Everything else in the module is
straightforward.

---

## 5. Screen two — the detail

**The next action is the most important text on this screen.** One line,
typographically dominant, editable in place. Not a checklist — a checklist
lets you feel productive without advancing anything.

Below it, in rough priority:

- **Stage** — where it is, with advance and back. Back must exist and be
  unremarkable; jobs genuinely go backwards when a quote falls through.
- **Waiting on** — who, since when, expected when. Setting this is how you
  say "not my move."
- **Owner, due date, budget estimate.**
- **Blocked by** — if set, shown as a reason rather than a warning.
- **Quotes** — vendor, amount, status, valid until. Projects only.
- **Notes** — append-only, newest first, with author and date.
- **Attachments** — quotes, receipts, warranties, arriving via the phone
  Shortcut.
- **Stage history** — see below.

### Stage history is worth designing properly

`Stage.entered_at` and `completed_at` mean you can show where a job's time
actually went: *Idea 12 days · Research 47 days · Quoting 3 months*.

That's the learning loop. After finishing the front landscaping you can see it
sat in Quoting for three months, and you'll behave differently on the
bathrooms. Nothing else in the product does this, and it's nearly free.

Keep it quiet — a small horizontal band, not a chart.

---

## 6. Screen three — add a job (phone)

Adding must take under thirty seconds or nothing gets added.

**Required:** title, type, pipeline.
**Optional, right there:** next action, owner, budget estimate.
**Everything else:** later, on the detail screen.

Pipeline choice needs to be four taps, not a dropdown of stage names. Name
them by how the work happens — *someone else does it / we do it / buy and
install / recurring* — not by internal labels.

---

## 7. Tone

**This is the one module that should be slightly uncomfortable to look at.**
Its job is to make neglect visible, and a warm, encouraging treatment would
defeat it.

But uncomfortable is not punishing. The distinction matters:

- **Yes:** plain, factual, unsoftened. *34 days.* No exclamation, no colour
  escalation, no "you've got this."
- **No:** red, alarms, guilt, streak-breaking language, anything implying
  failure. These are renovations on a 20-year-old house, not missed deadlines.

The register's `A` status and the briefing's warmth are both wrong borrowed
languages here. This module's voice is a plainly stated fact you'd rather not
read.

Everything else in the product can be warm. This is the contrast that makes
the warmth mean something.

---

## 8. Constraints

- **Portrait**, fridge and phone. Same codebase.
- **Fridge is read-only.** No edit affordances at all — no disabled controls.
  The fridge shows the list; the phone changes it.
- **Nothing under 44px.** Standing, one-handed, often wet.
- **Legible at a metre** on the fridge. The phone can be denser.
- **Never blank or spinning.** Cached first, refresh behind.
- Budget figures are fine on the wall. This is intent, not account data.

---

## 9. What to deliver

1. A short design plan first — palette as named hex values, typefaces and
   roles, layout approach.
2. **The list, fridge, day one** — all seven projects, none moved, no history.
   The hardest and most important state.
3. **The list, fridge, month three** — a realistic mix across all five groups,
   including maintenance.
4. **The detail screen, phone** — use "Paint the house," waiting on a quote
   from Brett for 18 days, with two notes, one quote received and stage
   history showing 47 days in Research.
5. **The detail screen, fridge** — same job, read-only, showing how it differs.
6. **Add a job, phone** — the under-thirty-seconds version.
7. **The stage indicator** at four stages and at seven.
8. **A $500 job and a $40,000 job on the same list**, with neither
   disappearing.

---

## 10. Questions the design should answer

- How does a list of seven never-started jobs avoid reading as an indictment?
- How do "needs you" and "waiting on someone" read as different without a
  second colour system?
- Where does the next action live on a row — is it visible in the list, or
  only in detail?
- How does stage history show without becoming a chart?
- Can a job be advanced from the fridge? It's the one write that would be
  genuinely useful there, and the one most likely to be tapped by accident.
- What does a $500 estimate and a $40,000 estimate look like on the same
  screen without the small one disappearing? The small one is the most likely
  to happen.
- How does "ready, waiting on funds" read as an available decision rather than
  another kind of failure?
