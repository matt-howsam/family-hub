# Ingestion

**Status:** design agreed. Calendar fetch built and deployed; everything else
unbuilt.
**Last updated:** 9 September 2026

## What this is

Ingestion is not a module. It is the shared data layer that every module reads
from. Sources arrive in different shapes, get normalised into one store, pass
through a review queue, and are then available to the Daily Briefing,
Assignments & Assessments, Holidays, Operations Register and anything built
later.

Nothing is built per-module. If a module needs external data, it reads the
ingestion store.

```
SOURCES              HANDLERS               STORE              CONSUMERS
─────────────────────────────────────────────────────────────────────────
iCloud "Home"    ──► node-ical parse   ──► calendar_event ──►  Daily Briefing
  (public ICS)       [BUILT]                     │            Assignments
                                                 │            Holidays
Gmail                                            ▼            Chores
  SEQTA mail     ──► regex (seqta.js)  ──► proposed_item        Ops Register
  bulletins      ──► LLM (bulletin.js)         │                Wants
  bookings       ──► LLM                       │ review queue
  newsletters    ──► LLM                       ▼
                                          item (approved)
Local events         (deferred — see below)
```

## Invariants

These are the rules that make the rest safe. Do not relax them for
convenience.

1. **Nothing reaches the fridge display unreviewed.** Every extracted item
   lands in the review queue with `needs_review = true`. The only unsupervised
   write to the fridge view remains chore ticks. See "Who approves what" below
   — the approver is not always an adult.
2. **Default deny on display eligibility.** School mail carries negative
   pastoral records down the same pipe as positive ones. The fridge is visible
   to siblings and visitors. Anything not on an explicit allowlist routes to
   adult devices only.
3. **Store the raw message alongside every extraction.** Prompts will improve;
   re-running against stored originals must be possible without re-fetching.
4. **Never filter by date at extraction time.** Past items are still extracted
   and stored. Filtering happens at display time, so the audit trail survives.
   This applies to every filter, not just dates — see "Echo suppression".
5. **Every timestamp carries an explicit IANA zone.** Never a naive local time.
6. **Deterministic before probabilistic.** If a source is template-generated,
   parse it with a regex. Reserve the LLM for genuinely unstructured text.

## Who approves what

Invariant 1 says nothing displays unreviewed. It does not say an adult always
reviews.

| Proposal kind | Routes to |
|---|---|
| `assessment` for a child | that child |
| everything else | adults |

Rose asked for the Assignments module and is its source of truth: she enters
her own assessments, and email ingestion only ever proposes. If a parent
approves her assessments she becomes a subject of the module rather than its
author, which is the specific thing it exists to avoid. See
`docs/DECISIONS.md`.

## Sources

### Calendar — iCloud "Home" — **BUILT**

Shared iCloud calendar, published as a public ICS URL. This is the household's
existing source of truth and is maintained by hand.

**`lib/homecal.js` already implements the fetcher and parser and is deployed.**
Extend it rather than writing a second one. It currently does:

- Direct ICS fetch, cached 15 minutes, `HOME_CALENDAR_URL` env var.
- Recurrence expansion over a bounded window, with `EXDATE` cancellations and
  `RECURRENCE-ID` overrides handled.
- Person attribution, **prefix and explicit-suffix**: `Rose dance` and
  `Assembly - Rose` both attribute to Rose; `Dinner with Rose and Tom` stays
  `household`. Suffix requires a separator, or every mention of a name becomes
  that person's commitment.
- Multi-day all-day span expansion — one entry per covered day, deduped in
  look-ahead lists.
- `PRIVATE_HINTS` title filtering and `UNIFORM_OVERRIDE` detection.

What remains: persisting to `calendar_event` rather than reading live, and
moving filtering from fetch time to display time per invariant 4.

Other decisions that stand:

- **Do not read it through Google Calendar in production.** Google polls
  subscribed feeds on its own schedule — hours, sometimes a day — and the
  latency is unacceptable for a fridge display. The Google connector is fine
  for inspection during development.
- **Read-only.** A subscribed feed is a copy. The app cannot write back. If
  approved items ever need to land on the family calendar, that needs a
  separate decision.
- **Query expanded recurrence instances** for a rolling window. Do not store
  RRULEs.
- **All-day events are date-only.** They arrive as `2026-09-08T00:00:00Z`.
  Store as `date`, never `timestamptz`. Parsing them as instants will shift a
  day boundary eventually.
- **Some events must not render their description.** The Freedom Foundry
  annual health check carries mortgage and super figures in its notes.
  Descriptions are currently never rendered anywhere, which is why that event
  is safe; `description_private` makes the protection explicit rather than
  incidental.

### Email — Gmail

Dedicated account (`14snapperave@gmail.com`). Holds forwarded school mail and
subscribed newsletters — and also carries the Home calendar subscription, so
it is not quite a single-purpose mailbox. Mailbox-scoped access is still
acceptable.

- **Transport:** App Password + IMAP (`imapflow`) on a Vercel cron. One secret,
  no OAuth expiry. The Gmail API's `gmail.readonly` restricted scope is not
  worth it — refresh tokens expire after 7 days while the OAuth app sits in
  Testing mode, and escaping that means verification.
  **Note:** App Passwords require 2FA on the account, and Google has narrowed
  their availability over time. If they are withdrawn, the fallback is OAuth
  with a published app, not a rewrite of the handlers.
- **Free routing signal:** the `To` header. Mail addressed to
  `matthowsam@me.com` is forwarded school mail; mail addressed to
  `14snapperave@gmail.com` is a direct subscription. Branch on this before any
  content inspection.
- **Dedupe on `Message-ID`.**

## Handlers

| Class | Example | Handler | Cost |
|---|---|---|---|
| SEQTA machine mail | `[TA:PC] Commendation entered for Rose Howsam (7, 7H, ANDR, ML)` | `lib/ingest/seqta.js` — regex | free, confidence 1.0 |
| Year-level bulletin | Mr Hodgetts, "Week 8" | `lib/ingest/bulletin.js` — LLM | ~1,340 tokens |
| Human threads | Parent Teacher Interview negotiation | `bulletin.js` — LLM | as above |
| Booking confirmations | Rick Shores, Liveheats | check for `.ics` / schema.org first, else LLM | low |
| Club mail with attachments | Tumbulgum FC (detail in PDF) | subject-line date only for now | free |
| Newsletters | What's On Tweed (`noreply@everi.com.au`) | `bulletin.js` — LLM | as above |

Run `lib/ingest/clean.js` before any LLM call. It strips forwarding chrome,
signature blocks and repeated Acknowledgement of Country boilerplate, and
returns the forwarded envelope so you get the *original* sender and send date
rather than the moment forward was pressed. It deliberately **keeps** quoted
text, tagged `[q1]`, `[q2]` — decisions frequently live in a quoted reply and
are never restated.

### Notes on the two hard cases

**One-to-many.** A single weekly bulletin yielded six dated items. The risk is
precision, not recall: the same email contains five PERMA wellbeing-day
descriptions that are classroom activity, not family events. The prompt carries
an explicit negative list. Being incomplete costs less than being wrong.

**Relative dates in quoted threads.** The Parent Teacher Interview was stated
once, as "5.36pm next Wednesday", by a third party, inside a quoted reply, in a
thread that also named three rejected times. Resolve relative expressions
against the *quoted* send date, not the received date. Cap confidence at 0.7
for anything resolved this way. This case is why the review queue is permanent.

## Echo suppression

Some calendar entries restate what the term layer already derives: titles like
`PE Prac`, `PE Theory`, `Sports`, `Assembly` and `Chapel`, once the person
prefix is stripped.

**The timetable is the source of truth for what happens at school.** Calendar
copies go stale; the timetable is re-entered each term. So these are dropped
from display — `TIMETABLE_ECHO` in `lib/homecal.js`.

Two things follow:

- **Suppress at display time, not fetch time.** Currently `homecal.js` drops
  them during fetch, which predates the store. Once `calendar_event` exists
  they should be stored and filtered on read, per invariant 4.
- **A uniform override is not an echo.** `Mufti Day - gold coin` must reach
  the display and beat the timetable's uniform rule, because a mufti day is
  announced by the school rather than scheduled — the timetable cannot know
  about it. `UNIFORM_OVERRIDE` catches these and they win.

## Dedupe

Candidates are checked against `calendar_event` before they are proposed, not
after. Match on same date plus fuzzy title, with person names normalised out.

**Mufti Day is the case to get right.** It appears both as a calendar event and
in a SEQTA commendation. Suppress the duplicate *proposal*; never suppress the
calendar event, which is a uniform override the fridge needs. The Week 8
bulletin items are absent from the calendar and must be proposed.
`dedupeAgainstCalendar()` in `bulletin.js` implements this.

## Timezones

The household sits on a DST-divergent border. From **4 October 2026** NSW is
+11 and Queensland stays +10. The school is in NSW, Renée works in Brisbane,
and family bookings routinely land in Burleigh and the Gold Coast. Store an
explicit IANA zone per event. This is the single most likely source of a wrong
number on the display.

**Display decision: always render in household local time**
(`Australia/Sydney`). The screen is in NSW and everyone reading it is thinking
in NSW time. A 10:00 Burleigh booking shows as 11:00 after 4 October.

This will contradict the booking confirmation email, which is disconcerting
enough that a cross-border event should show its origin — `11:00 (10:00 QLD)`
— rather than silently converting. Getting this wrong means someone is an hour
early or late at a restaurant.

`seqta.js` includes a dependency-free `zonedToUtc` that is verified correct
across the transition. All date maths elsewhere runs through
`lib/week.js#today()` for the same reason: Vercel runs UTC, and a naive
`new Date()` rolls the calendar date over at 10am Sydney time.

## Data model

```
raw_message      id, source, message_id, subject, sender, to_header,
                 received_at, raw_body, processed_at

proposed_item    id, raw_message_id, kind, person, title, starts_at, ends_at,
                 all_day, time_zone, location, action_required, source_quote,
                 confidence, duplicate_of, needs_review, approver_role,
                 created_at

item             (approved proposed_item, same shape + approved_by, approved_at,
                 display_eligible, display_until)

calendar_event   id, uid, person, title, starts_at, ends_at, all_day,
                 time_zone, location, description, description_private,
                 is_echo, uniform_override, fetched_at
```

`kind` discriminates: `event | assessment | deadline | notice | commendation |
pastoral_record`. Not everything ingested is an event — a commendation is a
record. Sort the review queue by `confidence` ascending so the shakiest
proposals surface first.

`approver_role` is `child` for a child's own assessments and `adult` otherwise.
`is_echo` and `uniform_override` are computed at write time but applied at
read time, so the classification is auditable and reversible.

## Known gotcha

Gmail's `PLAIN_TEXT` format **drops the teacher's comment** from SEQTA mail.
The message snippet contains the narrative; `plaintextBody` jumps straight from
the banner to `Entered by:`. The comment is the entire reason a commendation is
worth displaying. Fetch SEQTA messages with `FULL_CONTENT` and parse the
narrative from the HTML part.

## Build order

1. `raw_message`, `proposed_item`, `item`, `calendar_event` tables.
2. ~~iCloud ICS fetcher + person-prefix parser~~ — **built** (`lib/homecal.js`).
   Remaining: persist to `calendar_event`, move filtering to display time.
3. IMAP poller + `To`-header router.
4. `seqta.js` wired in. Deterministic, cheap, immediately useful.
5. Review queue UI (phone), with child/adult routing.
6. `bulletin.js` wired in for the unstructured stream.
7. Heartbeat: if any source returns zero parsed items twice consecutively,
   raise it in the Operations Register. A silently dead ingest is worse than
   no ingest.

Local event scraping (`whatsontweed.com.au`) is **deferred**. The site now has
a newsletter arriving via `noreply@everi.com.au`; evaluate whether that
removes the need for a scraper before writing one. `cababreak.com.au` is not
an event feed — its useful content is recurring venue facts (trivia nights,
music bingo, steak nights) which should be hand-entered once into a small
`recurring_local` table and never scraped.

## Unconfirmed

- Whether `ANDR` in the SEQTA subject codes is a house name. Left commented out
  in `CODE_MAP` rather than asserted.
- Whether Year 6 sits at Mahers Lane (`ML`) as the code implies.
- Coverage of the school mail forwarding rules. One SEQTA message arrived in 45
  days, which suggests the rules are either new or narrower than intended.
  Verify against what actually lands in `matthowsam@me.com`. Note that iCloud
  rules cannot match a domain, only full addresses — the clean fix is adding
  the family Gmail as a school contact rather than adding rules per sender.
