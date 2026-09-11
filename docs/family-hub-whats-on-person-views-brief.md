# Family Hub — What's On & Person Views Brief

**Status:** proposed, not built.
**Last updated:** 11 September 2026

Two surfaces over data that already exists or is already planned: a family
listing by date, and a view per person. Neither owns content. Claude Code
should validate this against the codebase, `docs/DECISIONS.md` and
`docs/ingestion.md` before building (see "Validate before building"), and
flag anything here that conflicts.

---

## The shape of it

Each surface answers one question.

| Surface | Question | Slices by |
|---|---|---|
| Home screen | What about today? | Now |
| What's On | When is everything? | Date, across everyone |
| Person view | What about this person? | Person, across time |

The same record can appear on all three. It is never copied. A correction
made at its source shows everywhere.

**Success condition:** a parent can answer *what's on Thursday, and who needs
picking up?* from What's On, and a child can answer *what have I got
tomorrow?* from their own view, without either of them reaching for a phone.

---

## Decisions this brief adds

Record these in `docs/DECISIONS.md`. Wording is ready to paste.

**What's On and person views are lenses, not modules.**
They own no content tables. Every entry belongs to a source (the Home
calendar, the term layer, an approved ingestion item) and is read through
`lib/whatson.js`. Nothing is built per surface.

**Two layers that never look alike: Ours and Around town.**
Calendar events and approved school items are things we are doing. Newsletter
and venue content is things we could do. A possibility beside a commitment at
equal weight is the holiday certainty problem again.

**Around town surfaces on weekends by default.**
On weekdays, possibilities don't compete with pickups. The Around town filter
shows every date.

**Filter by layer, never by type or person.**
Type doesn't exist at source, and a classifier would be wrong often enough to
cost trust. Attribution is prefix or suffix only, so most entries are
household and a person filter returns little. The person view already is the
person filter.

**The listing shows everything eligible. Only the home slot deduplicates.**
After-school activities and mufti days belong in What's On, because that's
where Thursday's pickups get checked. The home screen slot drops anything the
kids' blocks already show today.

**Sharing runs one way.**
Family content flows into person views. Personal content (goals, assignments,
chores) never flows out to What's On. Household entries such as "Dinner with
Rose and Tom" stay out of person views, or every person view rebuilds the
family list.

**One destination per person.**
The avatar and a child's block on the home screen open the same view.

**Chores and goals share a child's view, separated by tone and colour.**
Chores sit in the household register: restrained, neutral, no person tint,
and the only place in a child's view with amounts. Goals sit in the family
register, tinted to the person, with no amounts, ticks or counts. Neither
borrows the other's language.

**Nothing a child owns or is assigned takes the attention state.**
Chores, goals and assignments never use the warm accent. Staleness is marked;
nothing else is flagged. Same rule as no stall clocks on people.

**Adult views have no to-do list.**
General tasks stay in Reminders. An adult's view shows what the Hub already
knows is theirs: jobs they own, register items in `A`, and their attributed
events.

**Each child's timetable renders from their own day.**
No shared grid component. Rose's layout follows the timetable she rebuilt:
subject and icon dominant, time beside it, no teacher or room.

**Detail sheets never render event descriptions.**
Title, time, location, person and source only. Descriptions can hold private
figures (the Freedom Foundry health check), and What's On is the first
surface tempted to show them.

---

## Data: one read function

### `lib/whatson.js`

Returns normalised entries for a date range. What's On, the home slot and
person views all read through it. Eligibility is applied here, at read time,
per ingestion invariant 4.

```
entry
  id                stable, source-scoped:
                    'cal:<uid>:<date>' | 'term:<...>' | 'item:<id>' | 'local:<id>'
  layer             'ours' | 'around'
  source            'calendar' | 'term' | 'school' | 'community'
  person            existing person enum, or 'household'
  title
  date              date, Australia/Sydney calendar date
  end_date          date, last day covered; equals date unless a multi-day span
  all_day           boolean
  starts_at         timestamptz | null
  ends_at           timestamptz | null
  time_zone         IANA zone of the event's origin
  location          text | null
  uniform_override  boolean
  source_ref        what the detail sheet names or links to
  fetched_at        timestamptz, when the source was last read
```

There is no `description` field. Leaving it off the shape is what keeps it off
the screen.

### Adapters

| Adapter | Reads | Build |
|---|---|---|
| Calendar | Existing ICS fetcher, or `calendar_event` if persisted | **Now** |
| Term | Standing after-school activities, if they live in the term layer | **Now, if applicable** |
| School | `item` where `kind` in (`event`, `deadline`) and `display_eligible` | Later: needs the review queue |
| Community | Approved newsletter items and `recurring_local` | Later: needs the newsletter handler |

### Excluded at read time

- Titles matching `PRIVATE_HINTS`
- Titles matching `TIMETABLE_ECHO`
- `kind` of `assessment`, `commendation` or `pastoral_record`, and any undated
  `notice`
- School and community items not `display_eligible`

Uniform overrides are **not** excluded. They carry `uniform_override = true`
so the home slot can drop them and person views can pick them up.

### Window

Today to today + 21 days. No new tables in this build.

---

## Surface 1 — What's On

Route `/whats-on`, or whatever matches existing conventions. Fridge and
phone, one responsive view, portrait, family register.

### Groups

| Group | Contains |
|---|---|
| **Today** | Timed entries not yet ended; all-day entries until 20:30 |
| **Tomorrow** | The next date |
| **This weekend** | Saturday and Sunday not already shown above |
| **Later** | Remaining dates to +21 days, with a subhead per date |

- "Today" comes from `lib/week.js#today()`. Never `new Date()`.
- Empty groups and empty date subheads never render.
- After 20:30, Today holds only entries still to come that evening, so the
  list effectively leads with Tomorrow. Same threshold as the night state and
  the Tonight line.
- On Friday, This weekend holds only Sunday and its header reads `Sunday`.
- On Saturday and Sunday, This weekend doesn't render; the weekend is already
  Today and Tomorrow.
- Within a date: all-day entries first, then by start time.
- A multi-day all-day entry renders **once**, in the earliest group it
  overlaps, as a span: `Camp · until Thursday`. Never a row per day.

### Rows

- Time or `All day`, in a fixed-width column so titles align.
- Title.
- Person mark on attributed entries, using the existing person colour tokens.
  Household entries carry no mark.
- Quiet source icon: Home calendar, school, community. Phosphor; verify names
  against the installed package.
- Location, if present, as secondary text.
- Times render in `Australia/Sydney`. When an entry's zone and Sydney differ
  at that instant, show the origin: `11:00 (10:00 QLD)`. Label
  `Australia/Brisbane` as `QLD`.

Around town rows use the same structure, lighter, with no person mark. They
are never styled like a commitment.

### Layer filter

Three large segments: `Everything` · `Ours` · `Around town`.

- Renders **only** when more than one layer has entries in the window. With
  the calendar as the only source, the filter doesn't exist.
- `Everything` is the default and applies the weekend rule to Around town.
- View state, not a write. Resets when the view is left.

### Detail sheet

Tap a row to open a sheet: title, date and time, location, person, source
name, and `Updated 7:02am` from `fetched_at`.

- No description, ever.
- No edit controls on any surface. Edits happen at source: the iCloud
  calendar, or the review queue.
- Later, for school and community entries: on phones the source links through
  to the original. On the fridge the sheet names the source without opening
  it.
- On the fridge, the sheet closes after 30 seconds idle, and the view returns
  to the dashboard after 60 seconds.

### Freshness

- Cached first, refreshed behind. Never blank, never spinning.
- The header shows `Updated 7:02am` quietly.
- Failed fetch: cached entries, marked stale with their timestamp. Never an
  error, never a confident guess.
- Once there are several sources, staleness is per source: say which one
  failed.

### Empty

No entries in the window: `Nothing on for three weeks.` Calm.

---

## Surface 2 — The home slot

The existing What's On space on the home screen. Change its rule, not its
size.

- Up to three upcoming `ours` entries from now.
- Drop entries the kids' blocks already show today: after-school activities
  and uniform overrides. Compute this from the same data the blocks render;
  never match on titles.
- A multi-day span counts as one entry.
- Tapping the slot opens What's On. That is navigation, not a write.
- Around town never appears here in this build.

---

## Surface 3 — Person views

Route `/people/[person]`, or whatever matches existing conventions. Fridge and
phone.

### Shell

- Header: avatar, name, and year for the children. Person-tinted, family
  register.
- Sections in a fixed order. **A section with nothing in it doesn't render**,
  including sections for modules that haven't shipped. No placeholders, no
  "coming soon."
- Opens from the avatar strip and from a child's home block. Same view.
- Fridge: read-only in this build. Returns to the dashboard after 60 seconds
  idle. Never labelled private or protected. It is social privacy, not
  security.

### Children — Rose and Tom

| # | Section | Register | Source | Build |
|---|---|---|---|---|
| 1 | **Today** | Family | Same derivation as the home kids' block | Now |
| 2 | **School** | Family | Term layer; assignments later | Now (timetable) |
| 3 | **Chores** | Household | Chores module | Later |
| 4 | **Coming up** | Family | `whatson`, filtered to the child | Now |
| 5 | **Goals** | Family, person-tinted | Goals module | Later |

**1. Today.** The same answers as the home kids' block, with room to finish
them: uniform, everything unusual, the full bring list, after school. Reuse
the functions behind the home block (`lib/timetable.js`, `BRING`, uniform
override handling). **Do not re-derive.** On a day with no school, Today shows
what's attributed to the child that day, or doesn't render.

**2. School.**

- The day's periods in order, at that child's own bell times. Breaks are
  quiet dividers.
- Each period shows subject icon and subject, dominant, with the time beside
  it. **No teacher names or room codes.**
- Opens on today until that child's last period ends, then on the next school
  day. The next school day skips weekends, holidays and pupil-free days, and
  comes from `lib/week.js`. Header format: `Tuesday · Week B`.
- Day (Mon–Fri) and week (A/B) switches as large segments, for browsing. View
  state only. The current day and letter are marked.
- The week letter here is a label. Correction lives on the dashboard only.
- Icons are decoration here. Uniform comes from the uniform rule, never from
  an icon.
- Assignments later sit beside the matching subject. They need their own
  brief, and Rose configures them.

**3. Chores.** Later, with its own brief. It must first settle rates and
contribution versus paid work. These constraints are fixed now:

- Household register: neutral surface, tight type, no person tint.
- The only section in a child's view with amounts. Rates are stated.
- The week is the unit and resets clean. No streaks, no cross-week counts, no
  attention colour.
- The tick is the fridge's write, through the `role=display` gate. Reuse the
  meal planner's gate if it exists.
- Sits above Coming up so a child who has just done a job reaches it quickly.

**4. Coming up.** The next 14 days from `whatson`, starting tomorrow:

- Entries attributed to this child.
- Uniform overrides, whether attributed or household, because they change
  this child's uniform.
- Standing after-school activities.
- No other household entries.
- Same row, span and cross-border rules as What's On, without the person
  mark, since the whole view is theirs.

**5. Goals.** Later, with its own brief. Fixed now: person-tinted family
register; no amounts, ticks, counts, streaks or days-since; one `next_step`
line per goal; only the child edits.

### Adults — Matt and Renée

Thin by design. Mostly used on a phone.

| # | Section | Source | Build |
|---|---|---|---|
| 1 | **Needs you** | Projects owned by the person in Needs you or overdue Waiting; register `A` items (Matt) | Now |
| 2 | **Coming up** | `whatson`, filtered to the person, 14 days | Now |

**Needs you.**

- Job rows: title, next action, and days since movement, worded as the
  Projects list words it. Overdue Waiting rows read as a chase:
  `Chase Brett — quote`.
- Register rows: service, provider, renewal date. On the fridge, never policy
  or account numbers; those stay phone-only, as everywhere else.
- Tap opens the job or register row: editable on a phone, read-only on the
  fridge.
- No input field, no add button, no to-do, anywhere.

If both sections are empty, the view shows its header and
`Nothing needs you.`

---

## Design

No mockup phase. Build from the existing tokens, Plus Jakarta Sans, Phosphor
and the two registers. **If a new token seems necessary, stop and flag it**
rather than adding one.

Separating chores from goals uses the existing registers. If they don't read
as different kinds of content, flag it rather than inventing a third.

Every target is at least 44pt; segments are sized for wet hands.

Judge these standing at the fridge, not in a browser:

- What's On row height at a metre, and whether 21 days feels right.
- Whether Around town reads as lighter from across the kitchen.
- A child's view on a school day: how much of Today and School fits in
  1080pt portrait before scrolling.
- Later: whether Chores and Goals read as different kinds of content from a
  metre.

---

## Rules that look arbitrary

- **All date maths runs through `lib/week.js#today()`.** Vercel runs UTC, and
  a naive `new Date()` rolls the date over at 10am Sydney time.
- **All-day entries are dates, never instants.** An instant shifts a day
  across the 4 October DST change.
- **Attribution comes only from the existing parser.** Don't add name
  matching anywhere in these surfaces.
- **Multi-day spans appear on each covered day in a child's Today**, but only
  once in a list, per the existing look-ahead decision.
- **Filters and day/week switches are view state.** Never persisted, never
  writes.
- **What's On looks 21 days ahead; person views 14.** The family plans
  further out than one person needs to see.

---

## Scope

### Build now

- `lib/whatson.js` with the calendar adapter, plus the term adapter if
  activities live in the term layer
- What's On, fridge and phone: groups, spans, rows, detail sheet, freshness
- The home slot rule
- The person view shell for all four people
- Children: Today, School, Coming up
- Adults: Needs you, Coming up
- The `DECISIONS.md` entries above

### Later

- School adapter, once the review queue ships
- Community adapter and the layer filter, once the newsletter handler ships
- Around town in the home slot on weekends, for the Saturday state
- Chores section, after its own brief
- Assignments inside School, after its own brief
- Goals section, after its own brief

### Not this brief

- **To-do lists**, for anyone. Reminders does this.
- **A "we're going" button.** Add the event to the Home calendar; it returns
  through the feed into Ours. No new write path, one source of truth.
- **Writing to any calendar.** The feed is read-only.
- **Event types, categories or tagging.**
- **Scraping.** Deferred in `ingestion.md`.
- **Teacher names and room codes.**
- **Notifications.**

---

## Acceptance checks

### What's On

- [ ] Tuesday 07:00: Today, Tomorrow, then later dates; empty groups absent
- [ ] 09:59 and 10:01 Sydney time show the same Today
- [ ] 20:31: today's all-day entries are gone; a 21:00 entry today still shows
- [ ] Friday: This weekend holds only Sunday, headed `Sunday`
- [ ] Saturday: no This weekend group
- [ ] A 15-day multi-day all-day event renders as one span row
- [ ] `Rose dance` and `Assembly - Rose` carry Rose's mark;
      `Dinner with Rose and Tom` carries none
- [ ] Timetable echo titles and `PRIVATE_HINTS` titles never render
- [ ] A mufti day renders in What's On
- [ ] A 10:00 `Australia/Brisbane` booking after 4 October 2026 renders
      `11:00 (10:00 QLD)`
- [ ] An all-day entry on Sunday 4 October 2026 stays on Sunday
- [ ] The detail sheet shows source and update time; an event with a
      description never shows it
- [ ] With the calendar as the only source, no layer filter renders
- [ ] Failed fetch: cached entries marked stale with their timestamp; no
      spinner, no error
- [ ] On `role=display`: no edit affordance anywhere; returns to the dashboard
      after 60 seconds idle

### Home slot

- [ ] Shows at most three entries
- [ ] An after-school activity shown in a kids' block today doesn't repeat in
      the slot
- [ ] A uniform override today doesn't appear in the slot
- [ ] Tapping the slot opens What's On

### Person views

- [ ] Rose's avatar and Rose's home block open the same view
- [ ] Rose's School shows subject, icon and time; no teacher or room anywhere
      in her view
- [ ] Rose's and Tom's timetables each render their own bell and break times
- [ ] School opens on today during school hours, and on the next school day
      after that child's last period
- [ ] Sunday 11 October 2026: School opens on Tuesday 13 October (Monday is
      pupil-free) with the letter `lib/week.js` returns
- [ ] The week letter in a person view has no correction affordance
- [ ] Coming up excludes household entries, except uniform overrides, which
      appear for both children
- [ ] No Chores, Goals or Assignments section renders before those modules
      exist
- [ ] Matt's Needs you lists jobs he owns in Needs you or overdue Waiting,
      each with its next action
- [ ] On `role=display`, register rows in Matt's view show no policy or
      account numbers
- [ ] No add or input control in any adult view
- [ ] Returns to the dashboard after 60 seconds idle on the fridge

---

## Validate before building

- **Which file holds the ICS fetcher.** `docs/ingestion.md` names
  `lib/homecal.js`; the initial build shipped `lib/calendar.js`. Extend the
  existing one. Don't write a second.
- **Whether `calendar_event` is persisted yet.** If so, read from it. If not,
  read the cached live fetch and keep that detail behind the adapter.
- **Where filtering happens.** If `TIMETABLE_ECHO` and `PRIVATE_HINTS` still
  run at fetch time, leave them for this build and apply eligibility in
  `whatson.js` as well. Moving them is ingestion work, not this brief.
- **The recurrence expansion window** covers 21 days.
- **Where standing after-school activities live**: the term layer, recurring
  calendar events, or both. If both, flag it. That is an echo and needs a
  decision, not a second suppression list.
- **What renders the home kids' blocks and the existing What's On slot.**
  Reuse both.
- **The person enum, person colour tokens and avatar component.** Match them.
- **Whether projects can be queried by owner and the register by status.**
- **Whether the `role=display` write gate exists.** Not needed in this build;
  note the answer for chores.
- **Phosphor icon names** against the installed package.

---

## Open

- **Private goals and assignments on the fridge.** Do private items render in
  a child's fridge view, with the avatar as social privacy, or only on their
  own phone? Recommendation: phone only. *Ask Rose.* This blocks the Goals and
  Assignments sections, not this build.
- **Renée's Needs you.** Register rows have no owner, so `A` items go to
  Matt's view only. Does Renée want them too? *Matt and Renée.*
- **Teacher and room for Tom.** His school sheet carries them; Rose removed
  hers. Tom may want his rooms. *Ask Tom.*
- **Around town's weekend default.** Test once community content exists. It
  may belong on Fridays too.
- **Section order once Chores ships.** Whether Chores above Coming up keeps
  it within easy reach on the fridge.
