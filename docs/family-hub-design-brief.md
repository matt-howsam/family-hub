# Family Hub — Design Brief

For navigation, information architecture, and UI direction. Not a build spec.
Design the full system so the content model and IA are right; build one module
at a time.

Revised after reviewing the two paper artefacts this replaces: the *Howsam
Discretionary Spending Scorecard* and the *Howsam Household Operations
Register*. Both are attached and are the source of truth for content — the
categories, fields, phrasing, and house rules in them are real and should be
used directly, not reinvented.

---

## 1. What this is

A household PWA replacing two printed documents currently stuck to a fridge.
It runs full-screen on an old iPad mounted in the kitchen, and on family
phones.

It exists to stop things falling off the radar — a home project that died at
"get a quote" six months ago, a credit card fee that auto-renews on 16 Feb, a
child who needs a sports uniform on a day nobody checked.

**One line:** the family's shared memory, on the wall.

The existing paper works. This is a digitisation, not a reinvention. The
design's job is to make the same information glanceable and current without
losing the deliberateness of the printed version.

---

## 2. The family

| Person | Role | Primary use |
|---|---|---|
| Matt | Builder and operator | Everything. Sole maintainer. |
| Renée | Co-adult | Reads most, writes some. Feeds documents in from her phone. |
| Rose | 13, Year 7, Lindisfarne Anglican Grammar | Her daily briefing, her goals. First year of secondary — more subjects, rooms and teachers to track. Sceptical audience; disengages if it feels like surveillance. |
| Tom | 11, Year 6, same school | His daily briefing, his goals. Homeroom-based, simpler day. Must find his stuff in one tap. |

Use these names and this real content throughout. The product is domestic and
specific; generic placeholder copy will make it read as a SaaS admin panel,
which is the failure mode.

---

## 3. The physical situation

The most important constraint in the brief. It should visibly shape the design.

- **An old iPad, fridge-mounted, permanently powered.** iPadOS 26, modern
  WebKit, no legacy browser constraints.
- **Portrait.** Revised from an earlier landscape assumption. Both paper
  artefacts are portrait pages; the register runs 30+ rows; a daily briefing
  is a vertical list. Portrait shows more of everything that matters and
  reads like the page it replaces. Wide multi-column tables don't survive on
  a wall screen regardless of orientation — show the current week, not four.
- **It never sleeps and never locks.** Auto-Lock off, Guided Access on. Open
  continuously for weeks. No launch moment, no splash, no login. Someone
  walks up to a screen that is already on.
- **Read at a metre, in passing.**
- **Touched with wet hands.** There's a pool. Nothing under 44px, no fine
  gestures.
- **Shared and unsecured.** Kids' friends, guests, tradespeople all see it.
- **Phones are the input device.** The iPad displays. Anything requiring
  typing happens on a phone.

---

## 4. Product principles

1. **The fridge answers "does anything need me?"** Not "what is the state of
   everything."
2. **Two states, not a gradient.** Calm and attention. A wall of amber
   becomes decoration within a week.
3. **Stall detection is the core mechanic** — for objects, never for people.
4. **Nothing is ever blank or spinning.** Cached values render instantly,
   refresh behind. On failure, show the last known value marked stale with
   its timestamp.
5. **Freshness is visible** wherever content is generated rather than entered.
6. **Progress is as visible as debt.** The register already tracks savings
   won, not just money owed. Keep that balance everywhere.
7. **The app changes through the day.**

### The family's own voice

The paper documents already have a voice. Use it rather than writing new copy:

- *"Every dollar has a job. Every week has a number."*
- *"Every renewal has a decision."*
- *"Nothing renews without a conscious decision."*
- *"Diarise every renewal date. Silence is how the lazy tax gets paid."*
- *"Write the number every Sunday, even the ugly ones. Progress over
  perfection."*

This is a household that has already decided how it talks about money. The
interface should sound like the family, not like a budgeting app.

---

## 5. Roles and write access

A social model, not a security one. Everyone is trusted; the interface should
make ownership obvious.

Each person installs the PWA on their phone and is identified by a one-time
magic link setting a long-lived cookie. No passwords. Kids never see a login.
The fridge holds an anonymous read-only identity.

| Surface | Can write |
|---|---|
| Fridge iPad | Nothing. Read-only, always. |
| Matt's phone | Everything |
| Renée's phone | Everything except the register |
| Tom's phone | His goals, his assignments, his chore ticks, holiday ideas |
| Rose's phone | Her goals, her assignments, her chore ticks, holiday ideas |

**Design implication:** every screen has a fridge variant and a phone variant.
The fridge variant has no edit affordances at all — no disabled buttons, no
greyed-out fields. Buttons that can never be pressed are worse than absent
ones.

---

## 6. What is allowed on the wall

The register contains policy numbers, registration plates, a mortgage payment,
and account references. The paper version already sits on the fridge with all
of it — but paper requires walking up and squinting, while a screen designed
for a metre broadcasts.

| Always visible | Behind an avatar tap | Never on the fridge |
|---|---|---|
| Projects, maintenance | Personal daily briefing | Policy and account numbers |
| Renewal dates, vendors, K/R/A | Personal goals | Rego plates |
| Category-level costs | | Mortgage payment amount |
| Spending progress vs target | | Raw transactions |
| Savings won | | |

Store every field; render the sensitive ones on phones only. The design should
show what a fridge row looks like versus the same row on a phone.

The avatar layer is **social privacy, not security** — it stops a sibling idly
reading your goals. Never label it as protection. Personal views return to the
dashboard after ~60 seconds; the real risk is someone walking away, not
someone snooping.

---

## 7. Modules

Ten. Only the first is being built now.

### 7.1 Projects & maintenance — **v1, build first**

Household jobs that die mid-way. "Paint the house" has five stages, dies at
stage two, and nobody notices for six months.

Two types on one model:
- **Project:** Idea → Research → Quoting → Decide → Schedule → In progress → Done
- **Maintenance:** Due → Booked → Done → resets to next due date

The central field is `last_moved_at`, set when a stage changes. The primary
view is a **Stalled** list sorted by days since last movement.

- Adding a note does **not** reset the clock. Talking about a job isn't moving
  it. The UI should make this feel intentional, not broken.
- Maintenance only enters Stalled after its due date passes. A gutter clean
  waiting eleven months by design must never top the list.

Each job carries **one** next action as a single line: "Call Brett for a
quote." Not a checklist. That line is the most important text in the module
and should be typographically dominant on the detail screen.

Screens: a grouped list (Stalled / Active / Scheduled) and a detail view with
stage control, next action, owner, due date, budget estimate, notes, quotes.

Note the overlap with the register: car servicing, boat licence, and
registration renewals are maintenance jobs that currently live on the
register. The design should show how a register row and a maintenance job
relate without duplicating them.

Maintenance jobs should also be attachable to an asset (§7.8) — servicing the
pool pump belongs to the pool pump. Design the job detail view so an asset
link is possible without being required; most jobs won't have one.

**Seed content — design with these, not with placeholders:**

1. Front landscaping
2. Paint the house
3. Under stair storage
4. Remodel kids' bathrooms
5. Downstairs flooring
6. Remodel kitchen
7. Replace rear sliding doors

Three things follow from this real list:

**Every job is large.** There is no "fix the gate latch." Estimates span from
perhaps $2k for under-stair storage to $40k or more for a kitchen remodel.
`budget_est` covers orders of magnitude and cannot use a single visual
treatment — a four-figure and a five-figure number should not look alike.

**The realistic State A is seven stalled jobs.** On day one, nothing has
moved, because nothing has been in the system to move. Design the list for
that case first. A screen that reads as seven failures will get closed and
not reopened; a screen that reads as seven things worth picking one from will
get used. This is the single most important screen in the build and it is the
one that looks worst if designed for the happy path.

**Some jobs are queued, not stalled.** Downstairs flooring waits on the
kitchen; the rear sliding doors probably go in with the flooring. A job
deliberately waiting on another has not fallen off the radar. This does not
justify a dependency graph — but the design needs a way for a job to say
"waiting on the kitchen" and drop out of Stalled while it does.

**This is the one module that should be slightly uncomfortable to look at.**
Its job is to make neglect visible. Everywhere else can be warm.

### 7.2 Operations register

See the attached PDF — this is fully specified and should be designed from
the real content.

**Sections:** Home & Utilities · Digital & Communications · Transport ·
Family, Children & Holidays · Health & Insurance

**Per row:** service, provider/biller, cost, cost basis (per month / per year
/ allowance / working average / estimate), frequency (monthly, quarterly,
annual, per term, fixed term, one-off), renewal date, status, notes.

**Status is K/R/A** — Keep, Review, Action. This is already the attention
model; don't invent another. `A` is the only state that should shout.

**Derived figures the design must accommodate:**
- Monthly equivalent per section
- **"The number we are reducing" — $2,462/mo, $29,545/yr.** Known recurring,
  excluding mortgage and school fees. This is the headline number of the
  entire module.
- **Savings Won This Year** — a log of every switch and cancellation with its
  annual saving. Currently one row: home insurance, $1,449.
- **Action queue, next 90 days** — a small number of dated commitments.
- **Review / lazy tax watchlist** — items to compare annually.

**The design instruction that matters most here:** a renewal list is a chore,
a savings tally is a scoreboard. `$1,449 saved this year` should be at least
as prominent as anything owed. The number being reduced and the savings won
belong together — one is the target, the other is progress against it.

Cost bases are genuinely mixed and the design must not flatten them. `~$175
working avg/mo` and `$346.50 per month` are different kinds of number and
showing both as `$175` / `$347` would be a lie. Estimates, allowances, and
actuals need visual distinction.

Renewal dates are frequently unknown — several rows say "renewal date to
confirm." Missing data is a normal state here, not an error, and an empty
renewal date is itself a small call to action.

### 7.3 Spending scorecard

See the attached PDF. Also fully specified.

**Eleven categories**, each with a monthly budget, a per-week target, four
week columns, a month total, and variance against budget. August target
$4,510; $1,128 per week.

Groceries · Fuel · Cafés & Takeaway · Alcohol · Shopping · Home Projects ·
Hobbies & Entertainment · School & Kids Extras · Medical & Pharmacy · Work
Accommodation · Unplanned Spending

**Data entry is already a working habit and needs no redesign.** Each Sunday,
Matt pastes card transactions into Claude, which categorises them, and the
weekly figures get written down. The app needs to receive eleven numbers a
week from a phone — nothing more. Design that as a fast, satisfying two-minute
task, not a transaction ledger.

A later version can accept a paste of raw transactions and propose the
categorisation for confirmation. Design the confirmation step even if it isn't
built; it changes the shape of the entry screen.

**Sunday Night Review** — three free-text fields completed weekly:
- This week's win
- Biggest unnecessary spend
- One change for next week

These are the most human content in the entire product and should not be
treated as an afterthought field set. They're the ritual that makes the rest
work, and past weeks' answers are worth being able to look back on.

**What's excluded** matters as much as what's included. The card explicitly
carries mortgage, rates, utilities, school fees, subscriptions, insurance, and
term activities *off* the scorecard and onto the register. The design needs a
clear, non-apologetic way to say what this number does and doesn't cover —
otherwise `$4,510` looks like the family's entire cost of living.

Month-on-month comparison is part of the intent: August is 5.5% below July
ex-travel. Show the trend, but this is a scorecard, not a ledger — progress
and pace on the wall, never a transaction list.

### 7.4 Daily briefing

Per person, generated, read-only. The single highest-value module for the
kids, and worth designing carefully.

**What a briefing must answer, in roughly this order:**

1. **Which week is it — A or B?** This determines everything below it and
   should be unmissable.
2. **Today's classes**, in order.
3. **What uniform?** Sports, formal, or house. This is the question that
   causes the most morning friction and deserves the most visual weight.
4. **Anything unusual** — music lesson, assembly, chapel, excursion, mufti.
5. **What's due** — homework, assignment, project.
6. **What to bring** — instrument, boots, permission slip, laptop.
7. **After school** — surf coaching for Tom, KPA or Pilates for Rose, or
   nothing.

**Build it in two layers, and design them as visibly different kinds of
information:**

- **The term layer.** A/B cycle, class timetable, uniform rules, standing
  after-school activities. Set once a term. Reliable.
- **The exception layer.** Today's one-offs, drawn from school email and the
  shared Home calendar. Excursions, changed uniform, cancelled lessons,
  assignment due dates.

**This split is the point.** The briefing must still be useful on a morning
when the email pipeline is broken, because it will break. A briefing showing
the term layer with a note that today's updates couldn't be fetched is far
better than an empty screen or, worse, a confidently wrong one.

**The term layer must be editable, not import-only.** See the attached
photograph of Tom's Year 6 timetable. The printed version is already wrong and
has been corrected by hand in four places — French crossed out and replaced
with English, Integrated Studies changed to English, French changed to
Japanese, a Friday Maths session changed to English. Whatever is imported from
SEQTA is a starting point that a parent then corrects, and those corrections
must survive a re-import next term.

Design a term-layer editing screen for phones. It's used a handful of times a
year, so it can be slow and deliberate — but it must exist.

**Week A / Week B is the highest-value element in the product.**

It determines the classes, the uniform, and what gets packed, and it's the
thing the family actually forgets. It should be unmissable in every briefing
and should also appear on the dashboard without a tap.

**It is a household-level fact, not per-child.** Both Rose and Tom run the same
cycle, so the letter appears once, in one place, and a correction fixes it for
everyone.

**Store it as remembered state, not calculated state.** The school's cycle
carries across term breaks and across years with no reset point — and the
family isn't certain of that, which is itself the argument. Computing forward
from a distant anchor through holidays, pupil-free days and odd-length terms
will drift, and the drift is silent until someone turns up in the wrong
uniform.

Instead: hold the current letter, flip it each Monday of a school week, and
let any correction become the new truth going forward. Self-healing. Wrong
once, tapped once, right thereafter.

This needs school term dates entered once a year so the system knows which
weeks to skip — a five-minute annual task, and the same data the holiday
module wants.

**The displayed week must be tappable to correct**, in one touch, on the
fridge. A confidently wrong letter is worse than no letter.

This element is small enough to ship on its own, well before the rest of the
briefing exists.

**Uniform rules are annotation, not data.** On the attached timetable, the
governing rule — *PE uniform: Tuesday and Thursday, Week B* — is a highlighter
scrawl across the top of the page, and the relevant sessions are marked by
highlighting rather than by any label. Sport appears on Fridays in both weeks.
None of this is machine-readable.

So uniform is a **manually entered rule per child per term**: which days, which
uniform, in which week. Simple to enter, changes each term, and it answers the
question that causes the most morning friction. Design the entry for it, and
give the answer more visual weight than anything else in the briefing.

**The two children's school days do not align.** A hard constraint, confirmed
against both real timetables.

- **Tom, Year 6:** homeroom 8:20, periods 8:40–9:35, 9:35–10:20, 10:20–11:10,
  breaks 11:10–11:20 and 11:20–11:50, then 11:50–12:45, 12:45–1:40, second
  break 1:40–2:05, a 20-minute 2:05–2:25 period and a final 2:25–3:10. Met at
  3:10, departs 3:20. Teacher names and room codes on the sheet.
- **Rose, Year 7:** homeroom 8:20, periods 8:40–9:40, 9:40–10:35, first break
  10:35–10:55, then 10:55–11:50, 11:50–12:45, second break 12:45–1:25,
  1:25–2:25 and 2:25–3:20. No teacher names or rooms; subjects marked with
  icons instead.

Different bell times, different break times, different period counts. Nothing
in a briefing can assume a shared school day, and a combined household
"what's on today" view has no common grid to sit on. Neither timetable is
more complex than the other — they are differently shaped, and forcing one
template over both will misrepresent at least one child.

**Uniform signals are buried in pictograms.** On Rose's sheet, PDH PE appears
with a shirt icon on practical days and an apple on theory days — only the
shirt means sport uniform, and which one falls on Tuesday changes between
Week A and Week B. On Tom's, the governing rule is a highlighter scrawl
across the top of the page. Neither is machine-readable. Second independent
confirmation that uniform must be a manually entered rule per child per term.

**Subject iconography already exists.** Rose's timetable marks HSIE with a
globe, Maths with a pencil, Visual Arts with a palette, Dance with a dancer,
Science with a test tube. The children read these fluently. Lean into the
existing convention rather than inventing one — but note the school also
hides real meaning in it, so decide deliberately which icons carry semantics
and which are decoration.

**The child has already designed this, and her version is the brief.**

Rose's printed timetable is not the school's. Given full SEQTA output —
subject names, teacher names, room codes, exact times — she rebuilt it
herself with ChatGPT, and what she chose to keep is the strongest user
research available:

- **Kept:** subject, time, day, week.
- **Added:** an icon per subject.
- **Removed entirely:** every teacher name and every room code.

Compare a real SEQTA cell — *Science, 10:55–11:50, Ms Larni Borger, S12* —
with what she kept: *Science 🧪*. A 13-year-old with all the data decided the
subject was the payload and the rest was noise, then went to the trouble of
building a better version because the official one is unreadable.

Design accordingly: **subject and icon dominant; teacher and room available on
tap or not at all.** Do not reproduce the SEQTA grid. The product already has
a competing design from its own user, and she is right.

**Week A/B is verifiable, just not automatable.** SEQTA labels the letter on
every day — column headers read "MON 10 AUG (MONDAY B)". There is still no
API, but confirming the current letter takes ten seconds in a browser, which
makes the remembered-state model (above) safe rather than risky. A hard
anchor for reference: **10 August 2026 was Week B.**

Cross-checking Rose's handmade sheet against SEQTA confirms her lower grid is
Week B and her times are accurate. Her upper grid is Week A.

**Exceptions overlay the term layer and can collide with it.** SEQTA's Friday
shows a "Y7 Brainstorm, 237 invitees" event sitting on top of Mathematics in
the same 13:25 slot. The exception layer does not merely add to the term
layer — it conflicts with it. The briefing must surface both and let a human
resolve the clash, never silently choose one. Design a clash state.

**Three non-negotiables for exception-layer content:**
- **Every claim shows its source**, tappable through to the original email or
  calendar event. A wrong excursion date is a real-world failure.
- **Generation time always visible.** A briefing silently twelve hours old
  destroys trust in the whole product.
- **Failure shows the term layer, clearly marked incomplete.** Never blank,
  never a confident guess.

**Sources and their honest limits:**
- Shared Home calendar via a published `.ics` feed. Reliable, no credentials.
- School email — newsletter bodies and tracking links, readable.
- School email — PDF attachments, readable via the backend.
- SEQTA portal — **not reachable.** No API. Timetables are exported to PDF
  manually once a term.

The design needs a way to say "this is what I have and where it came from"
without implying completeness.

### 7.5 Goals

Short and long term, per person. Learn to scuba, get a first job, next karate
belt, a promotion.

**The trap:** the stall mechanic that makes §7.1 work is exactly wrong here.
"Rose — karate belt, 34 days no progress" on a kitchen wall is a public
performance review. So:

- **No streaks, no counters, no days-since, no progress bars on people.**
- Borrow `next_step`, not `last_moved_at`. One line, written by the person,
  present tense. Nothing decays. Nothing turns red.
- Only the person edits their own. If a parent can write into Tom's goals it
  becomes a chore list with better typography.
- Kids choose whether a goal is visible to the family or only in their own
  view, and can change that at any time.
- Review is a monthly conversation, not a daily nudge. No generated
  encouragement in a child's view.
- Status `released`, not `abandoned`.

### 7.6 Holidays

A five-year forward view of everything the family has coming up, from a long
weekend to a month overseas, plus the ideas not yet dated.

**The timeline holds everything. Major slots are a highlight layer on it.**

Two markers per year — mid-year and Christmas — for trips that need a real
decision. Ten across five years, and **the scarcity there is the feature**;
it's what turns a wishlist into a decision. But smaller trips sit on the same
timeline without consuming a slot. A long weekend at Straddie doesn't compete
with skiing North America: different money, different lead time, different
conversation. Christmas in Sydney is barely a decision at all.

**Define "major" by lead time, not cost**, or it will be relitigated every
time. If it has to be decided more than three months out, it's a slot trip.
Perisher probably isn't. North America is.

**Four levels of certainty, and they must never look alike:**

- **Booked** — in the Home calendar, dates real. Straddie, Easter 2027.
- **Committed** — decided, not yet booked. Perisher, winter 2027.
- **Candidate** — competing for a slot. Ski North America, January 2028.
- **Pool** — no date, no commitment. Venice, Indo, Darwin, the Whitsundays.

The first two are facts; the last two are conversations. On a fridge that
distinction is the whole value.

Booked trips should flow in from the shared Home calendar (§7.4) once that's
plumbed, so the forward view stays true without maintenance. Ideas in the
pool are added from a phone in seconds, with no decision required.

**The risk to design against:** an uncapped timeline fills with weekends and
buries the two decisions a year that actually matter. Slot markers need to
stay dominant on a dense line.

**Show the kids' ages in every slot.** Christmas 2030 isn't a date, it's "Rose
17, Tom 15." That line is why this module deserves to exist and should sit
above the cost estimate in the hierarchy.

The five-year window is not arbitrary — Rose is 13 now and turns 18 within it.
Ten slots is very close to the number of family holidays actually remaining
while everyone still lives at home, and the timeline is the only place that
fact is visible.

The register already holds a booked one-off — Easter 2027, Straddie, $678.90
paid to date. Committed holidays and their real costs should connect to the
timeline rather than living only as a register row.

No stall mechanic. The only attention state is a slot approaching its
`decide_by` date with nothing chosen. Christmas flights want booking by
roughly August.

Attribute ideas to whoever proposed them — this is collective, unlike goals.
Retire ideas out loud with a reason; a kid's suggestion rotting untouched for
three years reads as being ignored.

**Seed content:**

*Slotted:*
- Straddie / Minjerribah — Easter 2027 (booked, $678.90 paid to date)
- Ski Perisher — winter 2027
- Ski North America — January 2028

*Pool, no dates:*
- Burning Man
- Summer in Europe
- Indo surf trip
- Sail the Whitsundays
- Darwin fishing trip

Straddie sits on the timeline as a booked long weekend, not in a slot — it's
the clearest example of why the slot model can't be the container.

**Not every trip is a whole-family trip.** The Indo surf trip and Darwin
fishing read as subsets. A couple trip — Venice, or a return to Burning Man,
which Matt and Renée did in 2004 — is different again: not a smaller version
of a family holiday but a separate line of planning competing for the same
fixed slots. Ideas need a **who's going** field, treated as a first-class
attribute rather than a note.

That in turn qualifies the ages line: "Rose 17, Tom 15" carries its weight on
a whole-family slot and means nothing on a trip two people are taking. Show
it where it matters.

It also creates the module's only real tension. Rose has roughly five years
at home; a couple trip inside that window consumes a slot the whole family
might have used. Both are legitimate and the design should not editorialise —
but a slot with two people in it should visibly mean something different from
a slot with four, and the remaining slots should feel scarcer for it.

### 7.7 Files

Quotes, invoices, receipts, warranties, manuals, timetables.

Capture is via the phone share sheet: an Apple Shortcut takes a PDF from Mail
or Files, picks a job from a list, and uploads. Nobody will stand at the
fridge and photograph a quote.

The fridge displays that documents exist and opens them. It never uploads.

### 7.8 Assets & replacement forecast

Nothing in the system currently owns a *thing*. This module does.

An **Asset** is a piece of household infrastructure with a lifespan: pool
pump, instant gas hot water unit, rainwater pump, dishwasher, aircon. The
house is 20 years old and several original units are near end of life.

**Per asset:** name, location, install or purchase date, cost paid, warranty
expiry, expected life in years, expected replacement date, replacement
estimate, estimate year, notes, attached documents.

This is not a new mechanic — it's §7.1 maintenance with a lifespan and a
price. But it earns its own object for three reasons:

- **Warranty documents finally have somewhere to live.** This is the
  strongest argument for the file layer (§7.7): receipt, warranty
  certificate, manual, and service records all attach to the asset.
- **Maintenance jobs attach to assets** rather than floating free. Servicing
  the pump is logged against the pump, building a history that informs the
  replacement estimate.
- **It produces a sinking-fund number.** Each asset's replacement estimate
  divided by its years remaining, summed, gives "$X per month to not be
  surprised." That is the capital counterpart to the register's
  `$2,462/mo` recurring figure, and the two belong near each other.

Worked example, real: pool pump replaced September 2026, $1,400, five-year
warranty to 2031, expected replacement around 2036. Instant gas hot water,
original to the house, 20 years old, replacement expected within two years,
estimate to be confirmed. Rainwater pump, similar age, similar story.

**Estimates are in today's dollars with the year attached.** Do not model
inflation — label it "2026 estimate" and re-estimate when the date gets
close. The design needs to show an estimate's age without clutter, in the
same way the register distinguishes actuals from working averages.

**Attention state:** an asset past its expected replacement date, or a
warranty expiring within 90 days. Both are quiet, dated facts rather than
alarms — unlike a stalled job, nothing here is anyone's fault.

### 7.9 Wants — things we're saving for

Separate from §7.8 and deliberately so. Assets are liabilities that arrive
whether you like it or not; these are choices. A boat, Tom's e-bike, a DJ
mixing desk, a fishing drone.

**Per item:** title, estimate, priority, notes and product research, links,
attached documents, who wants it.

**The scarcity mechanic is what makes this work.** A ranked list of eight
things you might buy someday is the definition of a feature that gets built
and abandoned. Borrow the holiday module's constraint: **only one item is
active at a time.** One thing has a target date and a savings figure.
Everything else sits in an unranked pool until it's promoted.

An expected landing date on every item is eight predictions and eight
disappointments. Only the active item gets a date.

**Open question for design:** are §7.9 and §7.6 the same module? A boat and a
trip to Japan are the same dollar and the same family conversation. Holidays
have fixed slots and a decision deadline; wants have a queue. They may be two
views of one thing — "what we're saving for, on a timeline" — and that's
worth exploring rather than assuming.

**Do not merge with goals (§7.5).** Tom's e-bike may also be Tom's goal, and
the design should let them reference each other, but goals are person-owned,
private by default, and carry no financial or stall mechanics. A shared
purchase queue is household and financial. Collapsing them would drag money
into a child's personal space.

---

### 7.10 Chores & pocket money

Weekly jobs attached to pocket money, shown in each child's personal view.

Seed content: unpacking the dishwasher, taking the bins out, mowing, window
cleaning, vacuuming upstairs, cleaning bathrooms.

**Why this isn't Apple Reminders.** Earlier reasoning pushed chores to shared
Reminders lists, and for plain task-ticking that still holds. The pocket money
link is what changes it — Reminders cannot answer "did Rose earn her money
this week," and that question is the module's entire reason to exist.

**The ownership collision is the main design problem.** A child's personal
view would hold two things with opposite ownership:

- **Goals** are theirs, authored by them, with no pressure and no decay.
- **Chores** are assigned by a parent, tracked, and attached to money.

On one screen the goals inherit the compliance feeling of the chores, and
"learn to scuba" starts reading like an unpaid task. This is a layout problem
before it is anything else. Either make the two visibly different kinds of
content, or move chores out of the personal view entirely — design should try
both.

**Contribution vs paid work.** The seed list divides naturally: unpacking the
dishwasher and taking the bins out are things you do because you live here;
mowing, window cleaning and bathrooms are jobs. Whether both are paid is a
family decision, not a design one — but it must be settled before the screen
exists, because an all-or-nothing weekly payment and a per-chore rate produce
completely different interfaces.

**Show the rates.** Rose is 13 and Tom is 11 and will have different jobs and
probably different amounts. She will notice either way; a stated rate is
easier to defend than a discovered one.

**No streaks.** The unit is the week, and a week resets clean. A twelve-week
streak broken by illness is punishing, and streak mechanics are borrowed from
products that want daily opens. Nothing here decays, accumulates pressure, or
turns red — the same rule as §7.5, for the same reason.

**Chores are the one write the fridge permits.** A deliberate exception to §5.
A kid who has just unpacked the dishwasher will tap the screen they are
standing next to; sending them to find a phone kills the habit. The avatar tap
already establishes who is looking, and that is enough identity for a chore
tick. If Tom ticks Rose's chore it is a family matter and will surface within
a day.

Design the tick to be satisfying and instant. It is the only tactile,
rewarding interaction in the entire product, and the only one a child
performs.

**Track what's owed and what's paid.** Without it, Sunday becomes "how much do
I owe you?", which is the friction the module exists to remove.

### 7.11 Assignments & assessments

**Requested by Rose, not by Matt.** This is the first module in the product a
family member asked for, and that changes how it should be treated. Every
other module is Matt deciding what the household needs. This one has a user
waiting for it, which makes it the strongest candidate for module two —
ahead of the register and the scorecard — and the best chance the product has
of becoming a family thing rather than Matt's thing.

A simple list of school projects, exams, assessment tasks and tests, so a
child can see what's coming and start preparing in time.

**Per item:** title, subject, type (assignment / test / exam / assessment
task), due date, notes, done.

Subject should be a picker sourced from that child's timetable rather than
free text. The data already exists in the term layer, and it means an
assessment can surface alongside the right class.

**Build it for Tom as well as Rose.** Year 6 has less to track, but making it
Rose's private feature makes it a Rose thing rather than a Hub thing.

#### The child is the source of truth

This is the first module where being wrong has real consequences. A missed
uniform is a bad morning; a missed assessment is a grade.

**Rose enters her own assignments. Email ingestion only ever proposes.**
Extracted items land in a review queue she confirms or discards. Nothing is
auto-added. Nothing is silently updated. If the pipeline adds a wrong due date
or quietly misses one after she has come to rely on it, the product has
actively harmed her.

A tool she enters herself and trusts completely beats a cleverer one she
cannot.

**Consequence worth noticing: this module needs no email pipeline to ship.**
Schools publish assessment schedules at the start of term; entering them takes
ten minutes. It works on day one with zero dependencies — unlike the register
or the scorecard, which both need data plumbed in first.

The review queue is a later addition, and when it arrives it should show the
source email alongside each proposal so a proposal can be checked before it is
accepted.

#### The feature is lead time, not the list

Rose's own framing was that it should prompt her to *prepare*. A list of due
dates is a calendar. The value is the item appearing early enough to act on —
roughly a week to ten days out, not the night before.

Design the lead-time surfacing, not just the list.

#### The risk, and it is real

**Escalating urgency about a 13-year-old's schoolwork on a shared kitchen
screen is public academic pressure** — visible to her brother, to guests, to
anyone who walks in. Same trap as §7.5 goals, with higher stakes.

- **The fridge stays quiet.** One line in her block at most: *Science
  assessment, Friday.* The full list, countdown and any status live behind her
  avatar.
- **No stall clock.** No days-since, no "overdue," no red.
- **No progress percentage.** Preparation is not measurable and pretending
  otherwise turns study into compliance, which is what makes school apps
  unpleasant.
- **Visibility is hers to choose**, as with goals.

#### Write access changes

§5 currently limits children to writing their own goals and holiday ideas.
Rose now writes her own assignments and asked to configure the module. That is
correct — it is her data — and the role table should be updated to reflect it.

Worth noticing the direction of travel: she has moved from being a subject of
this product to an author of it. Design decisions that would take that back —
parent-editable assignments, imposed reminders, shared visibility by default —
should be treated as regressions.

---

## 8. Dashboard and navigation

Portrait. Tiles stack vertically; the avatar strip sits within thumb reach.

Each tile carries **one line answering "does this need me?"** Totals are not
attention: `47 subscriptions` tells you nothing; `2 renewals in 30 days` makes
you look.

| Tile | Example line | Attention when |
|---|---|---|
| Today | `Week B · sports uniform · Tom has surf` | stale or fetch failed |
| Projects | `3 stalled` | any job unmoved >21 days |
| Spending | `Week 4 · $340 of $400` | over, or >90% before Friday |
| Register | `2 renewals in 30 days · $1,449 saved` | any `A` status, or renewal <14 days |

```
┌───────────────────────────────┐
│  Today                        │
│  Week B · sports · Tom surf   │
├───────────────────────────────┤
│  Projects        3 stalled    │
├───────────────────────────────┤
│  Spending    $340 of $400     │
├───────────────────────────────┤
│  Register   2 renewals · +$1,449 │
├───────────────────────────────┤
│  Holidays   Winter 27 open    │
├───────────────────────────────┤
│  ( Matt ) ( Renée ) ( Tom ) ( Rose ) │
└───────────────────────────────┘
```

Ordered by decay speed — today's briefing is wrong within hours, a renewal
date is stable for months.

Note the register tile carries both a debt and a win. That pairing is the
module in miniature and should be a deliberate design decision, not a
formatting accident.

### Avatar strip

Four avatars. One tap into that person's briefing and goals.

Use **Big Heads** or a similar illustrated character set rather than photos.
Each person customises their own — the five minutes a kid spends choosing hair
and glasses is how they decide the app is theirs. Pick four background colours
deliberately so each is identifiable at a glance from across the kitchen.
Avatars must be changeable at any time.

### Time of day

The dashboard changes through the day. Before school, today's briefing
dominates and the uniform answer should be readable from the doorway. Sunday
evening, the spending review surfaces — that's when the ritual happens.
Saturday morning, projects. Evening, quieter.

A small daily rotating item — a fact, a word, a joke — earns its place if it
gives someone a reason to look when nothing needs them. It should feel like
part of the house, not a widget.

---

## 9. The three growth states

Design all three. **The first is the one that matters and the one usually
skipped.**

**State A — one module (now).** Only projects and maintenance exists. A grid
with empty tiles would make a working product look broken. What does the app
look like when there is exactly one thing in it? Likely: no dashboard, the
projects list *is* the home screen, no avatar strip yet.

**State B — three modules.** Projects, register, spending. The dashboard earns
its place. How does a tile arrive without the layout jumping?

**State C — all ten.** Plus briefings, goals, assignments, holidays, assets,
wants and chores. Does
the wall stay glanceable, or has it become a control panel?

Show the transitions, not just the end state.

---

## 10. Aesthetic direction

Deliberately **not** a productivity tool. This is a kitchen object, alongside a
calendar, a shopping list, and a child's drawing.

The existing paper has a real design point of view already — considered
typography, restrained colour, a serif display face, a warm accent used only
for things needing attention. It looks like a well-made household document
rather than a spreadsheet, and that instinct is correct. The screen version
should feel related without simply reproducing a printed page: the paper's
job was to be written on, the screen's job is to be read across a room.

- **Not** enterprise dashboard: no dense tables on the wall, no chart-heavy
  reporting, no sidebar navigation, no grey-on-grey.
- **Not** a children's app. Two adults use it daily. Warm and characterful,
  not cartoonish.
- Illustration and colour carry the warmth. The information stays disciplined.
- Legible at a metre. That constraint alone kills most conventional dashboard
  layouts, which is a good thing.

Spend the boldness in one place — likely the avatars and the personal
briefings. Keep the stalled list quiet and severe by contrast.

**Copy matters as much as layout.** Use the family's existing phrases (§4).
Empty states are invitations. Errors say what happened. Nothing apologises.
Avoid the vocabulary of task management software — this is a house, not a
backlog.

---

## 11. Non-goals

- Calendars. Shared iCloud calendars already work across everyone's phones.
  The Hub reads calendar data; it does not replace it.
- General task lists. Reminders keeps those. Only chores tied to pocket money
  (§7.10) live here.
- Morning routines. Considered and cut — no real problem to solve.
- Notifications on the fridge. Nobody checks a wall-mounted notification
  centre.
- A settings screen.
- Charts and reporting in v1.

---

## 12. What to deliver

1. A design plan first — palette as named hex values, typefaces and roles,
   layout concept, and principles specific to this brief. Review it before
   building.
2. **State A** — the one-module app: stalled list and job detail, fridge and
   phone. Use the seven real projects, and show the list on day one when all
   seven are stalled.
3. **The dashboard at State C**, portrait, with the avatar strip and at least
   two time-of-day variants.
4. **Both daily briefings** — Tom's Year 6 day and Rose's Year 7 day, side by
   side, showing how the same template flexes. Week A/B, classes, uniform,
   what to bring, after school. Read-only on the wall.
5. **The week indicator on its own** — how Week A / Week B appears on the
   dashboard, and how someone corrects it in one tap when it's wrong. This is
   the smallest shippable piece of the briefing and may go live first.
6. **The operations register** — one section on the fridge and the same
   section on a phone, showing how sensitive fields differ. Plus the "number
   we are reducing" and savings-won treatment.
7. **The spending scorecard** — current week on the wall, and the Sunday entry
   screen on a phone including the three review questions.
8. **The holiday timeline** — five years, showing all four certainty levels
   on one line, with the ten major slots still dominant and ages shown on
   whole-family entries.
9. **The three money numbers together** — the register's `$2,462/mo`
   recurring, the capital sinking-fund figure from assets, and the `$4,510`
   discretionary target. They are different kinds of money and the design
   should make that legible without a legend.
10. The tile attention language: calm and attention states side by side.

---

## 13. Questions the design should answer

- What does State A look like with no dashboard? Does the avatar strip exist
  before there's anything personal behind it?
- How does the fridge show read-only without looking disabled or broken?
- How do estimates, allowances, and actual costs stay visually distinct in the
  register without adding clutter?
- Where do stale, failed, and generated content live visually, so the family
  learns to read freshness without being taught?
- Can the Sunday entry — eleven numbers plus three questions — be made to feel
  like a ritual rather than data entry? This is the module's survival
  condition.
- How prominent should the uniform answer be? It's the single most-asked
  question of the school week and arguably deserves to be visible on the
  dashboard without a tap, alongside the week letter.
- How does a corrected week letter read? It needs to look chosen rather than
  broken — the family overruled a calculation, which is normal, not an error
  state.
- How does the term-layer editor show which entries are imported and which are
  hand-corrected? The corrections are the trustworthy ones.
- Does the holiday pool belong on the dashboard, or only inside the module?
- How does a list of seven stalled jobs avoid reading as seven failures?
- On a timeline holding everything from a long weekend to a month overseas,
  how do the two decisions a year stay dominant?
- How do booked, committed, candidate and pool read as four distinct states
  without four colours competing on the wall?
- Are holidays and wants one module or two? Both are things being saved for
  against a timeline, and they compete for the same money.
- Can chores, goals and assignments share a child's screen? Three kinds of
  content with three different owners and three different emotional registers
  — assigned work, private ambition, and school deadlines. If they cannot
  coexist, which leaves?
- How does an upcoming assessment surface with enough lead time to be useful
  without reading as pressure on a shared screen?
- What does a satisfying tick look like on a wall-mounted screen, performed by
  an 11-year-old with wet hands?
- How does an asset nearing end of life read? It must be a quiet dated fact,
  not an alarm — nothing about a 20-year-old hot water system is anyone's
  fault, and the register's `A` status is the wrong borrowed language.
