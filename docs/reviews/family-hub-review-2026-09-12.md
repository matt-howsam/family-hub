# Family Hub — Review, 12 September 2026

First review against a running build on the fridge. Ordered by severity.
Performance first; it's the only item that threatens adoption.

---

## 1. Performance — the main issue

Returning to the home screen from **What's on** or a **person screen** feels
slow and laggy on the iPad.

### Establish device vs app before optimising

Load the same routes in desktop Safari or Chrome and navigate back. If it's
instant there and slow on the iPad, it's rendering or hydration cost on old
hardware. If it's slow in both, it's a data-fetch or routing problem and the
iPad is innocent. Then attach Safari Web Inspector from a Mac (Develop → the
iPad) and record a timeline of one back-navigation. Everything below is a
hypothesis until that timeline exists.

### Most likely cause: the App Router client cache

In Next.js 15 the client router cache defaults to **0 seconds for dynamic
routes**. Going back to `/` therefore discards the cached RSC payload and
re-requests it from the server, including any database reads the home screen
does. On a fast connection that's a flash; on an old iPad it's the lag being
described.

Check in order:

1. `experimental.staleTimes` in `next.config.js`. Setting `dynamic` to
   something like 180 seconds makes back-navigation render from cache
   immediately. This is exactly the `DECISIONS.md` rule — cached values render
   instantly and refresh behind — applied to routing rather than to data.
2. Whether the home screen is a Server Component doing DB queries on every
   request. If so, the fridge pays full cost for a screen it returns to twenty
   times a day. Consider fetching once into a client-side store and letting
   the sub-screens read from it.
3. `prefetch` on the "← The Wall" link and the avatar links.
4. Whether back-navigation re-mounts the whole tree rather than restoring it.
   Look for `key` props changing, or state lifted high enough that returning
   home rebuilds every card.

### Secondary suspects, old-iPad specific

- **Compositing cost.** The screenshots use full-width gradient fills, large
  rounded surfaces and soft shadows. Any `backdrop-filter`, layered
  `box-shadow` or animated gradient is expensive on an old iPad GPU. Test by
  disabling shadows and gradients temporarily and seeing if the lag goes.
- **Font loading.** Confirm Plus Jakarta Sans is preloaded with
  `font-display: swap`. A re-layout on every navigation reads as lag even when
  the data was instant.
- **Bundle and hydration.** Check what ships to the client. The fridge is a
  read-only display; anything interactive should be a small island, not a
  page-level client component.
- **Guided Access and a permanently-open tab.** Worth confirming the lag isn't
  a memory issue after days of uptime. Reload the PWA and test again from
  cold. If a fresh load is fast and a four-day-old one is slow, there's a leak
  — likely an interval or listener that isn't cleaned up on unmount.

### The standard to hold it to

Navigating back to the home screen should show content in the same frame as
the tap. Never a spinner, never a blank, never a flash of re-layout. It is the
screen the household returns to most, and on a wall display the return journey
is more frequent than the outbound one.

---

## 2. Home screen

### 2.1 Module rows are too loud — reduce

Projects, Spending, Register and Holidays currently read at nearly the same
weight as the hero content. Drop the type size and weight a step. The right
relationship is that they are *legible* at a metre, not *dominant* at a metre
— only the attention state should pull the eye, and right now the calm rows
pull almost as hard as the amber Projects row.

Keep the small right-aligned category labels. They're working.

### 2.2 Promote What's on, above the module rows, larger

Agreed, and the brief already justifies it: the dashboard is ordered **by
decay speed**. Tonight's dinner and tomorrow's commitments are wrong within
hours; a renewal date is stable for months. What's on is the highest-decay
content on the screen and currently sits below the most stable content.

It's also the item with the broadest audience. Projects and spending are
Matt-and-Renée content. What's on is the only block that four people read.

Proposed order below the Today zone:

1. Conditions card (when it has something to say)
2. Kids' chores / earnings
3. **What's on** — larger, with real presence
4. Module rows — Projects, Spending, Register, Holidays, quieter than now
5. Avatar strip

### 2.3 What's on needs to look interactive

Give it the same card surface the conditions block and the chore rows have —
white, rounded, shadowed — rather than the recessed grey panel it has now. The
grey reads as a background, not an object.

Add a chevron at the right of the header. On a read-only wall display the
chevron is the only affordance vocabulary available, so it should be used
consistently: **every tappable region on the fridge carries one, and nothing
else does.** That's worth writing into `DECISIONS.md`, because it's the rule
that stops the fridge from needing disabled-looking controls.

### 2.4 Tonight line — affordance yes, pencil no

The line does need to look tappable. But a pencil icon would be wrong, and
this one matters:

`DECISIONS.md` and the meal planner brief both state that the dashboard's
Tonight line is **navigation only** — writes are confined to the planner view.
A pencil promises an edit that the dashboard deliberately doesn't offer, and
it would be the first edit affordance on a screen whose whole rule is that it
has none.

Use the same chevron as above, or make the whole line a tappable card surface.
It opens the planner; the planner is where the edit lives.

### 2.5 "Beach day" was wrong today — check the logic

It was overcast with on-and-off rain. The card said *Beach day · Light SE,
clean* in the largest type on the screen.

This is the week-letter problem in a different costume: **a confidently wrong
headline destroys trust in everything else on the screen.** Three things to
check:

1. **Are rain and cloud inputs at all?** "Light SE, clean" is swell and wind
   language. If the verdict is computed from wind direction and swell period
   only, it will call every rainy day with light offshore wind a beach day.
   Precipitation probability and cloud cover need to be inputs, not garnish.
2. **What is the source and how fresh is it?** The card carries no generation
   time, which the brief requires wherever content is derived rather than
   entered. A verdict computed at 6am and still displayed at 3:51pm is a
   different claim from a live one.
3. **Does the verdict need to exist?** The facts underneath were all correct
   and useful — water 21°, 1.2m E swell 11s, high 4:12pm. The tide line and
   the tinny suggestion are the best content on the screen. It's only the
   one-word judgement that was wrong. Consider whether the headline should
   state conditions rather than grade them, with the verdict appearing only
   when confidence is high.

**On data:** BOM's public offerings are awkward to consume directly. Worth
evaluating Open-Meteo, which is free, needs no key, and has both a forecast
endpoint (precipitation, cloud cover, wind speed and direction) and a separate
marine endpoint (wave height, period, direction) — verify current endpoints
and licence terms before committing. Cross-check tide times against whatever
source is in use now, since those are the numbers most likely to put someone
on a sandbar.

Also worth noting: there is prior art in SeaScore, and this card is solving a
subset of the same problem. Consider whether the go/no-go logic should be
shared rather than written twice.

### 2.6 Small check

The spending target reads `$610 of $1,163`; the briefs carry `$1,128` per
week. Presumably a deliberate update — just confirm it's the current figure
and not a rounding artefact.

---

## 3. What's on screen

### 3.1 Back button

"← The Wall" is a text link with a small hit area. Make it a round button, at
least 44pt, ideally 56pt for wet hands at a metre. Same treatment everywhere
it appears, including the person screen.

### 3.2 Date row padding

`TOMORROW`, `LATER`, `MONDAY, 14 SEP` need padding above so they group with
the rows beneath them rather than floating between two cards. Add top padding,
not bottom.

### 3.3 Title case

Titles come from hand-entered iCloud calendar events, so the casing is
inconsistent at source: `dance`, `butter chicken – canteen day`,
`Caba Boardriders`.

**Don't apply full title-casing** — it would wreck the acronyms this household
uses constantly (`HSIE`, `KPA`, `PDHPE`). Safe rule: if a title contains no
uppercase characters at all, capitalise the first letter only; otherwise leave
it exactly as entered. `dance` becomes `Dance`; `butter chicken – canteen day`
becomes `Butter chicken – canteen day`; `Caba Boardriders` is untouched.

Fixing the worst offenders in the calendar itself is also fine and costs
nothing.

### 3.4 The bullets

The dots are person attribution — Rose's purple and Tom's green, matching the
avatar strip. Events with no dot are household.

That the builder couldn't tell what they meant is the finding. A coloured dot
at 12px carries no meaning at a metre, and there's no legend.

Two honest options:

- **Remove them.** The screen is a household list; attribution matters less
  here than it does in a person's own view.
- **Make them legible.** Replace the dot with a small initial chip in the
  person's avatar colour — the same `R` and `T` already established at the
  bottom of the home screen. That reuses an existing colour language instead
  of inventing a second one, and it's readable from further away.

Preference is the second, but either beats the current state. Whichever is
chosen, apply it consistently — and note the person screen correctly shows no
dots, because everything there is already that person's.

---

## 4. Person screen

### 4.1 The A/B toggle default — specify it, don't just fix it

Rose's screen opens on `MONDAY · WEEK A` while the home screen reads Week B.
It's worth noting that this may currently be *accidentally correct*: today is
Saturday, the next school day is Monday 14 September, and that Monday starts a
new school week, so the letter does flip to A.

Which is precisely the problem. A default that's hardcoded to Mon/Week A and a
default that's correctly derived look identical today and will diverge on
Monday. Specify the rule and test it:

- **On a school day:** open on today, with today's letter.
- **On a weekend or during holidays:** open on the next school day, with the
  letter that will apply *then* — not today's letter.
- **Label it so the jump reads as deliberate**, e.g. `Monday · Week A` with a
  quiet `next school day` beneath it. Otherwise, on a Saturday, someone
  glancing at a person screen showing Week A while the wall shows Week B will
  conclude one of them is broken.
- Derive it from the same `week_anchor` state the home screen uses. Two
  independent derivations of the letter is the one thing the remembered-state
  model exists to prevent.

Test cases worth writing: Saturday of a Week B school week, the Saturday
before a term break, and 12 October 2026 — the pupil-free Monday that already
sits in `DECISIONS.md` as the first real test of the letter.

### 4.2 Uniform is in the wrong place in the hierarchy

`Formal uniform` currently sits *below* the class list, in body-sized text.

The brief is unambiguous that the uniform answer is the single highest-value
element in the briefing — the largest, plainest, most unmissable thing on the
screen, readable from the doorway. Right now it's the quietest thing on it.

Move it above the timetable, directly under the name, at display size. The
class list is reference material; the uniform is the answer. This is the one
place the brief says to spend a distinctive visual device, so it's also where
a colour or mark for formal / sport / house belongs.

### 4.3 "Coming up" repeats weekday names across two weeks

The list runs Monday, Tuesday, Wednesday, then **Monday, Tuesday again** with
no dates and no separation. Two different Mondays look identical, and the
second week's dance and Pilates read as duplicates of the first.

Either add the date to each day header as the What's on screen does
(`MONDAY, 14 SEP`), or cut the list to seven days. Given this sits under a
timetable, seven days is probably right — with dates on the headers anyway.

### 4.4 Working well, keep

- Subject icons with no teacher names or room codes. Exactly Rose's own
  design, and it reads cleanly.
- Avatar colour continuity from the home strip.
- `TODAY` carrying only the one real item.

### 4.5 Smaller notes

- `haircut, 12:00` — same lowercase issue as §3.3.
- The day tabs and the Week A/B toggle are two stacked controls doing related
  work. Worth trying as one row, or the letter as a segment at the right end
  of the day tabs, to recover vertical space above the fold.
- Nothing here yet distinguishes an imported timetable entry from a
  hand-corrected one. Not urgent, but it's a question the design brief asks
  and the answer gets harder once corrections accumulate.

---

## 5. Worth recording in DECISIONS.md

Three rules surfaced by this review that will otherwise be re-litigated:

1. **The chevron is the fridge's only affordance.** Tappable regions carry
   one; nothing else does. This is what lets the display avoid disabled-looking
   controls entirely.
2. **The dashboard Tonight line never shows an edit affordance.** It is
   navigation to the planner. Restates the existing rule in the specific
   terms that a pencil icon would have broken.
3. **The A/B letter is derived once, from `week_anchor`, and every surface
   reads that derivation.** No screen computes the letter for itself.

---

## 6. Suggested order of work

1. Performance — measure, then the router cache. Everything else is cosmetic
   next to a laggy wall display.
2. Uniform hierarchy on the person screen. It's the product's stated core
   promise and it's currently buried.
3. The A/B default rule, with tests.
4. Conditions card logic — at minimum stop asserting a verdict the data can't
   support.
5. Home screen hierarchy: shrink module rows, promote What's on, add
   affordances.
6. What's on polish: back button, padding, casing, bullets.
