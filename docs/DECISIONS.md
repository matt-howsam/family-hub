# Decisions

Settled questions, newest first. Each line is something that took real work to
arrive at and would otherwise be re-litigated. If you are about to change
behaviour described here, read the reasoning first — most of these look
arbitrary until you know why.

---

## Freshness policy

**`force-dynamic` on every page means the server always computes today
correctly — it does not mean the fridge ever asks it to.** A tab left open
overnight with nobody navigating never issues a new request, so it kept
showing the pre-midnight render for hours: yesterday's kid briefing,
yesterday's meal plan, What's On's Today/Tomorrow split computed against
the wrong day. This was never a caching bug in the data layer; it was the
absence of anything that makes an idle tab check again.

**`components/AutoRefresh.jsx` calls `router.refresh()` on daily triggers
plus a periodic one, mounted on the wall, What's On and person views:**
00:00 (day-dependent content — today's briefing, today's meal, What's On's
Today/Tomorrow split — is never wrong for hours) and 06:00 (whatever's
behind `lib/conditions.js` by the time anyone's up is what they see, not
what was cached overnight — added once Matt started sourcing a more
accurate weather feed, but written generically so it doesn't care which
API is behind it). Plus every 15 minutes regardless, matching the calendar
and conditions fetches' own `revalidate: 900` window, since refreshing
more often than the underlying data can change gains nothing. Both daily
times are DST-safe: re-derived from a fresh wall-clock reading on every
call rather than accumulating a fixed offset, so a 23- or 25-hour day
doesn't shift the fire time.

**The planner is deliberately excluded.** `PlannerScreen` copies its props
into local state for optimistic writes and undo; a refreshed prop
wouldn't reach the screen without also syncing that state on prop change,
which nothing currently does. The planner isn't left open unattended the
way the wall is — the fridge returns to it after 60 seconds idle regardless
— so this gap is deliberate, not an oversight, until the planner needs the
same treatment.

**Any write must call `router.refresh()` itself; a periodic timer doesn't
substitute for it.** The meal planner's own writes already do this (see
below). Waiting up to 15 minutes for a write's own screen to reflect it
would read as broken far sooner than a stale midnight boundary would.

---

## Interface conventions

**The chevron is the fridge's only affordance.** Every tappable region on a
read-only display carries one; nothing else does. It's what lets the wall
avoid disabled-looking controls entirely — there's no second vocabulary
(underlines, arrows, colour) competing with it, so a passer-by learns the
one signal once. If something needs to look tappable, it gets a chevron; if
it can't be tapped, it never gets one by accident.

**The dashboard's Tonight line never shows an edit affordance, on principle
— not just in practice.** It is navigation to the planner, and it carries
the chevron like everything else that's tappable-but-not-writable. A pencil
icon would promise an edit the dashboard deliberately never offers; this
generalises past the meal planner to any future line that links out to a
surface with a real write.

---

## The conditions card

**The water hero was 100% fabricated text until 12 September 2026.**
"Beach day", the wind, the swell, the tide times — every number in the
original mockup was static copy, not a computation with a bug. It read as
a live verdict and was confidently wrong on the first genuinely rainy
Saturday. `lib/conditions.js` replaced it, twice: first with a live
Open-Meteo + buoy call on every render, then with the data-spec version
below once a daylight-window verdict needed real persistence. See
`docs/family-hub-conditions-data-spec.md` for the full reasoning behind
this second pass.

**Rain, cloud, wind and temperature come from Open-Meteo's forecast API**
(free, non-commercial, no account) for South Kingscliff NSW
(-28.259, 153.579).

**Swell, wave and sea-surface temperature now come from Open-Meteo's
marine API, not the household's buoy proxy.** This reverses the first
pass's own reasoning — a real buoy reading beats a forecast model for
"right now" — but the verdict needs a genuine multi-hour daylight window,
which a single live reading structurally can't answer: it can say what
the swell is, never what it will be at 2pm. The buoy proxy
(`offshore-window-finder.vercel.app`) is kept for the one thing Open-Meteo
explicitly disclaims: tide.

**The buoy's tide series has no future predictions — it stops at "now."**
Checked directly against a live sample: the last entry's timestamp
equalled the request time to the minute. It's a predicted-vs-actual
calibration record, not a forecast. The card shows current level and
short-term trend only, never a fabricated "High 4:12pm."

**The verdict is gated in priority order: rain, then cloud, then wind,
then swell — and evaluated across a named daylight window (9am-5pm), not
a daily total.** A daily rain sum can be all overnight; a daily dominant
wind direction averages away a morning change. Wind and swell ran first in
the original build, which is exactly why an overcast, showery day with
light south-easterlies scored as a beach day. "Beach day" only appears
when every gate clears; otherwise the headline states what's actually
happening ("Rain about", "Changeable") rather than grading a maybe. The
stats row always shows regardless of which headline won. Thresholds are a
first pass; tune against the household's own SeaScore rules if those
differ.

**The daylight window (beach verdict) and the school window (the weather
line's rain warning) are named separately in code and must not be
merged.** Daylight is roughly 9am-5pm; school is 8am-3:30pm, since Tom is
met at 3:10 and Rose finishes 3:20. They answer different questions — is
today worth the water, versus what do the kids wear and does anything get
cancelled — for different audiences, and conflating them would eventually
make one window wrong for both purposes.

**The fridge must never call Open-Meteo (or the buoy) on render.**
`lib/conditions.js#getStoredConditions()` only ever reads the
`conditions_cache` table; `refreshConditions()` does the actual fetching
and persisting, called only from `/api/conditions/refresh`, itself pinged
by `AutoRefresh`'s client-side timers rather than a Vercel Cron Job —
Hobby-plan cron is capped at once/day, and this needed roughly hourly.
`refreshConditions()` no-ops if the stored data is under 50 minutes old
unless `force` is set, so pinging it every 15 minutes (or on demand at
6am) is cheap and self-limiting.

**Two sources, two independent failure modes.** Weather and marine are
fetched with `Promise.allSettled`, not `Promise.all` — a marine outage
still leaves rain, wind, temperature and the daily weather line intact; it
just can't show swell or water temperature that day. Only a weather-fetch
failure blanks the water card entirely, since both surfaces depend on it.

**The weather line in the Today zone is always on, every day — not just
weekends.** It answers a different question from the water card (what to
wear, does anything get cancelled, not is it worth going to the water),
appended to the date row rather than stacked as a second line, and rain
during school hours is the only element in it that ever takes the
attention colour.

**The water card is additive on a school-day afternoon, not exclusive
with the kids' blocks.** After 15:30 there's time to act on it even on a
school day, so it renders alongside the kids' cards rather than only ever
replacing them on non-school days. Chores stay tied to non-school days
only — untouched by this change.

**SeaScore and this card are deliberately duplicated, never shared.** Same
Open-Meteo endpoints, different questions for different audiences:
SeaScore is one experienced adult deciding whether to cross a bar, and can
assume the reader knows what a forecast doesn't cover; this is a household
including two kids deciding whether the afternoon is worth it, readable at
a metre by an eleven-year-old. The thresholds genuinely differ — an easy
yes for a tinny inside the river can be a clear no offshore — and a shared
module would either force one threshold vocabulary onto both or grow a
configuration layer bigger than the duplication it avoids. It would also
let a SeaScore change silently alter what the fridge says. Accepted cost:
the Open-Meteo request is written twice, and improving one doesn't reach
the other. Copy findings across, never files.

**No card beats a stale or fabricated one.** If the weather fetch fails
and nothing has ever been successfully stored, the water card and the
weather line simply don't render — consistent with "never a confident
guess" everywhere else in the app.

---

## What's On and person views

**What's On and person views are lenses, not modules.** They own no content
tables. Every entry belongs to a source and is read through `lib/whatson.js`
— currently just the Home calendar adapter. The home wall reads through it
too, so a record is never copied between the wall, the listing and a
person's view.

**Around town, the school adapter and the community adapter are not built.**
Only the calendar exists as a source, so the Everything/Ours/Around town
filter has nothing to filter and isn't rendered. Add it when a second source
exists, not before.

**No separate term adapter for standing after-school activities.** The home
screen already treats `AFTER_SCHOOL` (the term layer) as a fallback only — a
real calendar event for that child and day wins. Feeding both into
`lib/whatson.js` as independent sources would double an activity that's
already handled by the one adapter it needs.

**Adults' Needs You section doesn't render.** It would read from Projects
and the Register, and neither has real data behind it yet — both are still
static placeholders. A section for a module that hasn't shipped renders
nothing, not a fake one; Matt and Renée's person views currently show
Coming up only.

**A device identifies itself once, by URL — superseded by `docs/identity.md`.**
`/?role=display` and the `fh_role` cookie were the whole identity system
through the meal planner build. `docs/identity.md` replaces this with pairing
codes and a `person_device` table (role *and* person, not just role);
`getRole()` and its callers (`lib/role.js`, `app/api/planner/route.js`) now
read the new cookie instead of `fh_role`. Built.

**Q&A is adults-only, and the route check is the whole boundary.** The school
mail search index carries `pastoral_record` rows unfiltered — nothing in
school mail so far is sensitive enough to warrant excluding it, revisit if
that changes. `role = 'adult'` and not `display`, checked before retrieval,
is what keeps that content off a child's phone or the fridge. See
`docs/identity.md` and `docs/family-hub-gmail-ingestion-brief.md`.

**The School section's day-end cutoff is a fixed 3:30pm, not each child's
real last bell.** Per-period bell times aren't in the data model yet — only
the headline end time (`lib/people.js#endsAt`) and the period list itself,
with no timing between them. A shared approximate cutoff decides which day
the section opens on; it is not shown to anyone as a real time.

---

## Data sources

**The timetable is the source of truth for uniform, not the calendar.**
The Home calendar contains entries like "Rose PE Prac" and "Tom Sports" that
restate what `lib/timetable.js` already derives. Calendar copies go stale;
the timetable is re-entered each term. Echoes are suppressed by
`TIMETABLE_ECHO` in `lib/homecal.js`.

**But the calendar overrides the uniform when it announces a change.**
A mufti day is announced by the school, not scheduled, so the timetable cannot
know about it. `UNIFORM_OVERRIDE` catches those and wins over the rule.

**Uniform rules are entered by hand, per child, per term.**
They are never machine-readable at source. On Rose's timetable the rule lives
in a pictogram — a shirt for practical, an apple for theory. On Tom's it is a
highlighter scrawl across the top of the page. Three separate attempts to
derive it automatically failed.

**The term layer is editable, not import-only.**
SEQTA has no API, and its printed output is amended by hand — Tom's sheet
carried four handwritten corrections. Whatever is imported is a starting point
a parent then fixes, and those fixes must survive a re-import next term.

**Rose rebuilt her own timetable and her version is the design brief.**
Given full SEQTA output — subjects, teachers, room codes, times — she kept
subject and time, added an icon per subject, and removed every teacher name
and room code. Subject and icon dominant; teacher and room on tap or not at
all. Do not reproduce the SEQTA grid.

**The two children's school days do not align.**
Different bell times, break times and period counts. Nothing may assume a
shared school day, and no single template fits both.

---

## The week letter

**The letter is derived once, from `week_anchor`, and every surface reads
that derivation — no screen computes it for itself.** The home wall,
`lib/week.js#weekLetter()` and the person screens' School section all trace
back to the same anchor and the same flip-counting logic. Two independent
derivations is exactly what remembered state exists to prevent — if a
person screen and the wall ever showed different letters, the fix is never
"which one is right", it's "why does a second derivation exist at all."
When a person screen shows tomorrow's or next week's letter rather than
today's, say so next to it (`next school day`) rather than let it read as
disagreement with the wall.

**Remembered state, never computed from a fixed anchor.**
The school's A/B cycle carries across term breaks and years with no reset, so
computing forward from a distant origin drifts silently. `week_anchor` holds
the last known letter and the Monday it applied to, and rolls forward one flip
per school week. Any correction becomes the new anchor, so a wrong letter is
wrong once.

**Holiday weeks hold the letter rather than consuming a flip.**

**`isSchoolWeek` tests overlap, not membership.**
Terms 4 in both 2026 and 2027 begin on a Tuesday because the Monday is a
pupil-free day. Those are still school weeks. Testing whether the Monday
itself falls inside the term drops the week and inverts the letter for the
rest of the year. This was a real bug, caught by the published term dates.

**`termOfWeek` pairs with `isSchoolWeek`; `termOf` is day-scoped.**
On a pupil-free Monday the two disagree, and consumers expecting a term when
`schoolWeek` is true will crash.

**One letter for the whole school**, confirmed by Matt, 7 September 2026.
It is household-level, not per-child.

**Confirmed anchor:** 10 August 2026 was Week B (read off SEQTA); 7 September
2026 was Week B (confirmed directly). These agree — four school weeks, four
flips.

---

## Access and writes

**The fridge is read-only, with one exception: ticking a chore.**
A child who has just unpacked the dishwasher will tap the screen they are
standing next to; sending them to find a phone kills the habit. The avatar tap
supplies enough identity for that.

**No edit affordances on the fridge at all.**
No disabled buttons, no greyed-out fields. A control that can never be pressed
is worse than an absent one.

**One responsive codebase, not a fridge build and a phone build.**
The layout adapts; edit controls appear only when the device identifies as a
person rather than `role=display`.

**Rose authors her own assignments. Email ingestion only proposes.**
Extracted items land in a review queue she confirms. A missed uniform is a bad
morning; a missed assessment is a grade. A tool she trusts completely beats a
cleverer one she cannot.

**Only the person edits their own goals.**
If a parent can write into a child's goals it becomes a chore list with better
typography.

**Configuration must never require a deploy.**
Term dates, uniform rules, chore rates and budget targets are phone edits. If
changing them needs a keyboard, the app goes stale the first term you are busy.

---

## What goes on the wall

**Never on the fridge:** policy and account numbers, rego plates, the mortgage
payment amount, raw transactions. Stored, but rendered on phones only.

**Calendar content is filtered before display.** `PRIVATE_HINTS` drops
financial and medical titles. Note it checks titles only — descriptions are
never rendered, which is why an event whose description contains super
balances is currently safe.

**Nothing is ever blank or spinning.** Cached values render instantly and
refresh behind. On failure, show the last known value marked stale with its
timestamp — never an error, never a confident guess.

**Generation time is always visible** wherever content is derived rather than
entered. A briefing silently twelve hours old destroys trust in everything
else on the screen.

**Two states only: calm and attention.** No gradient of urgency. A wall of
amber reads as decoration within a week.

---

## Mechanics that look arbitrary

**Adding a note does not reset `last_moved_at`.**
Talking about a job is not moving it. Otherwise "still waiting on Brett" buys
a fresh three weeks every time someone grumbles about Brett — the exact
failure the module exists to catch.

**Maintenance only enters Stalled after `next_due` passes.**
A gutter clean waiting eleven months by design must never top the list.

**"Waiting on someone" is a separate state from stalled.**
Household projects die at "Brett said he'd send a quote", not at "I haven't
done anything". Both look identical to `last_moved_at`, but one needs *start
this* and the other needs *chase Brett*. Once the expected date passes it
becomes your move and lifts into "Needs you".

**"Ready when you are" is a third state: blocked on funds.**
Nobody is failing to act. It should read as an available decision, not another
kind of failure.

**No streaks anywhere. No stall clocks on people.**
Goals and chores use one person-authored next step. Nothing decays,
accumulates pressure, or turns red. A twelve-week streak broken by illness is
punishing, and streak mechanics are borrowed from products that want daily
opens.

**Attribution is prefix or explicit-suffix only.**
"Rose dance" is hers; "Assembly - Rose" is hers; "Dinner with Rose and Tom" is
the household's. Matching a name anywhere in a title claims every mention as
someone's commitment.

**Multi-day all-day events appear on every day they cover**, but are deduped
in the look-ahead list — otherwise school holidays fill it with fifteen
identical rows.

**`BRING` is ordered by priority, not period order.**
A day with both Technology and Sport-Dance needs dance gear named, not closed
shoes. Visual Arts is deliberately absent: an art shirt is needed most days
and a reminder that constant stops being read.

---

## Platform limits

**No AmbientLightSensor, no motion API, no brightness control on an iPad PWA.**
Two of the four originally specified night-state rules are unbuildable. Night
is local time 20:30–06:00 plus touch to wake, and the dimming is done entirely
by the palette.

**Facebook Groups cannot be monitored.** The API was removed in April 2024 and
group notification emails are unreliable by design. Instagram Business
Discovery is the legitimate route for what's-on content.

**SEQTA has no API.** Timetables are exported to PDF manually once a term.

**iCloud rules cannot match a domain**, only full addresses. The clean fix is
adding the family Gmail as a school contact.

**All date maths runs on Australia/Sydney** via `lib/week.js#today()`. Vercel
runs UTC; calling `new Date()` for a calendar date rolls it over at 10am
Sydney time and changes the week letter mid-morning.

---

## Scope

**Release 1 is projects, operations register and spending scorecard.**
Plus the shell: clock, date, week letter, kids' briefings.

**The register and scorecard replace working paper systems.** That is why they
are in R1 — the habit already exists and the content is fully specified.

**Ingestion (`lib/ingest/`) is parked and unwired.** Parsers are tested; there
is no review queue table, API route, scheduled job, or credentials.

**Design all modules, build one at a time.** The expensive decisions —
orientation, the two-register system, tile language, schema shape — are
settled. Individual module screens are cheap and rot if designed too early.

---

## Open

- Tom's timetable is transcribed from a **Term 1** sheet and not verified for
  Term 3. Weakest data in the app.
- Rose's uniform rules are inferred from icons, not confirmed by her.
- 12 October 2026 is the first real test of the week letter: pupil-free
  Monday, holiday hold, and the Term 4 flip to A all land together.
- Whether a job can be advanced from the fridge. Most useful write that
  surface could have; also the easiest to trigger by accident.
- Whether holidays and wants are one module or two.
- Whether chores and goals can share a child's screen without the goals
  inheriting the chores' compliance feeling.
