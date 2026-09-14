# Family Hub — Gmail Ingestion, What's On & Discovery

**Status:** proposed, not built.
**Last updated:** 13 September 2026

Extends `docs/ingestion.md`. That document made the harder architectural calls
— transport, routing key, dedupe, the review queue — and they stand. This brief
covers what wasn't decided: how relevance is determined, and where output
surfaces.

It also **corrects four things** in `docs/ingestion.md` that a fortnight of real
mail has disproved. Marked ⚠, and they should be applied to that document as
part of this work.

---

## What exists

Per the codebase audit: parsers exist and are tested, nothing is wired.

- `lib/ingest/seqta.js` — regex, deterministic, confidence 1.0
- `lib/ingest/bulletin.js` — LLM prompt builder + `dedupeAgainstCalendar()`
- `lib/ingest/clean.js` — strips forwarding chrome and signatures
- No IMAP client, no credentials, no cron, no tables, no routes.

The fetch/auth/schedule/store/route layer is a from-scratch build.

---

## Two passes, not one

The central decision in this brief.

| | **Extraction** | **Discovery** |
|---|---|---|
| Answers | What has to happen, when, for whom | What might interest this person |
| Output | Dated, attributed, actionable items | Undated suggestions with a reason |
| Cost of a miss | A form deadline passes | Nothing |
| Cost of an error | Wrong uniform, wrong day, lost trust | A suggestion gets ignored |
| Tuning | **Precision over recall** | **Recall over precision** |
| Review | Required for fridge surfaces | None |
| Surfaces on | Home screen, What's On, person pages | Person pages only, phones only |

They run as two sections of one LLM call over the same cleaned body. Discovery
is close to free because the model is already reading the email.

Applying extraction's caution to discovery is what makes recommendation features
feel locked down and useless. Don't.

---

## Pass 1 — Extraction

Produces `proposed_item` rows with a `kind`, one or more `persons`, a date where
one exists, and a confidence.

### ⚠ Four corrections to `docs/ingestion.md`

**1. The `To` header is not a sufficient router.** The existing rule — mail to
`matthowsam@me.com` is school, mail to `14snapperave@gmail.com` is a
subscription — is broken by account-transactional mail. The inbox currently
holds Apple ID verifications and Google security alerts, all addressed to the
Gmail account, none of them subscriptions. Use the header as a first branch,
then a **sender allowlist** on the subscription side. Log dropped senders so the
allowlist can be extended deliberately.

**2. Undated items are not noise.** The Year 6 Graduation Celebration is a
parent-hosted event behind a link, with a parent action and no date. Add
`kind: 'action'` — an action with no date. Never on a timeline; appears on the
parents' person page as an open item and clears when marked done.

**3. Uniform overrides arrive by email, not only by calendar.** The Year 6 Week
Ahead states it in prose: *Middle School Assembly, Tuesday — full formal uniform
including ties and blazers.* Add `kind: 'uniform_override'` with a date, person
scope and the uniform named. It feeds the same consumer as `UNIFORM_OVERRIDE` in
`lib/homecal.js` and beats the timetable rule the same way. Given the home
screen exists to answer the uniform question, this is the highest-value item
type in the pipeline.

**4. A stated year range overrides the bulletin's own year level.** The Fuse Cup
is "Year 5 to 8" — both children. Emit one item per affected person. `person`
becomes `persons[]`; retrofitting that after the person pages are built is
significantly worse than taking it now.

### Attribution rules

1. A year-level bulletin attributes to that year's child by default.
2. A stated year range overrides the default (see ⚠4).
3. Whole-school content is `household`.
4. Parent-action items attribute to `parents` regardless of which child they
   concern — a Year 6 excursion form is Tom's event and Matt's task.
5. Never infer a person from a subject the child happens to take.

---

## Pass 2 — Discovery

The ask: Rose does St John Ambulance cadets. A first aid training opportunity
buried in paragraph nine of a whole-school newsletter should reach her, even
though it names no date, no year level and no student.

Extraction will never catch that — correctly, since it isn't a commitment.
Discovery is a second pass with the opposite tuning.

### Why prompting, not embeddings

Embedding similarity matches vocabulary. It would match *first aid* to *first
aid*, and also to the first aid kit in the school office. What's needed is
reasoning: that a Red Cross volunteering drive connects to cadet training with
no shared words at all.

A model does that well. At this corpus size a vector store buys nothing and
costs a dependency, an index to maintain, and a class of silent failure that is
hard to debug. Revisit only if prompting visibly under-performs.

### Interest expansion

The profile holds what each person actually said they do. On save, one LLM call
expands each into a concept cluster, which is **stored and shown in the
editor**:

```
Rose
  stated:     St John Ambulance cadets
  expands to: first aid · CPR and resuscitation · emergency response ·
              volunteering · paramedicine and health careers ·
              community service awards
```

Expansion is stored rather than regenerated per call for three reasons: it is
stable, it makes matching legible when something odd surfaces, and Matt or Rose
can delete a branch that is pulling in noise.

**The rule that matters:** the system infers relevance *from* stated interests.
It never infers the interests themselves. Nothing a person reads, receives or
dismisses is allowed to modify their profile. They state; the system matches.

### Output

Each discovery item carries:

- `person` — exactly one. Discovery is never `household`.
- `relevance` — 0.0–1.0. Surface above 0.6 only.
- `why` — one line, plain, naming the connection: *"Because you do St John
  cadets."* Not decoration. A suggestion with a stated reason reads as
  considerate; the same suggestion without one reads as being watched.
- `source_quote` and `source_url` — tappable through to the original.

Expect one to three items a week. More than that and the threshold is too low —
fix the threshold, not the UI.

### Rules for discovery, all non-negotiable

- **Phones only. Never the fridge.** A wall screen announcing what a 13-year-old
  might like is surveillance wearing a friendly face.
- **The person owns their own.** Rose sees Rose's. Not "Matt is told what Rose
  might like." She asked for the assignments module and is an author of this
  product, not a subject of it.
- **Never an attention state.** No badge, no count, no notification, no red.
- **Dismissible, and dismissal is permanent** for that item.
- **No accumulation.** Unread items expire after 30 days. A growing list of
  unactioned suggestions is a guilt pile.
- **Each person can turn discovery off entirely**, from their own view, without
  asking anyone.

---

## Review tiers

Tiered by consequence. Requiring review for everything produces roughly fifteen
taps a week and dies by the third week.

| Content | Review |
|---|---|
| Uniform overrides, anything in the kids' morning blocks | **Required.** Where being wrong costs a real morning. |
| Parent `action` items — forms, payments, bookings | **Required.** A missed deadline is the failure this exists to prevent. |
| What's On listing items, confidence ≥ 0.9, known template sender | **Auto-publish**, marked unreviewed, one-tap removal. |
| What's On listing items below 0.9 | Required. |
| Discovery | **None.** Writes nothing, decides nothing. |
| Q&A | **None.** Read-only and cited. |
| Calendar events | **None.** A human already entered them. |
| Rose's assignments | Hers, per `DECISIONS.md`. Unchanged. |

Roughly three or four taps a week, concentrated on the only content where an
error has a cost. Sort the queue by confidence ascending; offer one batch
approve above 0.9.

---

## Surfaces

**Home screen — What's On slot.** Small, in the Today zone, today and tomorrow
only, quiet. Taps through to the listing. Navigation only. Uniform overrides do
not appear here — they merge into the kids' blocks, where the question is asked.

**What's On listing.** Today · Tomorrow · This week · Coming up. Calendar events
and extracted items look identical, because the family doesn't care where a
thing came from — but every item taps through to its source. Person tint carries
attribution; `household` is untinted.

**Person pages.** Filtered by `persons`. Parents additionally carry the `action`
list. Each person's discovery items sit below their commitments, visually
lighter, clearly a different kind of content.

**Q&A — phones and adults only.** See below.

---

## Q&A over school mail

Roughly 300 school emails a year at ~4KB cleaned: far too much for one context,
far too little to justify embeddings.

Postgres full-text search over `cleaned_body` plus subject, `pastoral_record`
rows included — indexed unfiltered. Top ~10 by rank, stuffed into one
`claude-sonnet-5` call at temperature 0.

- Answer only from retrieved messages. Never from the model's own knowledge.
- Cite every claim with subject and date, tappable to the original.
- No match returns *"Nothing in the school mail about that."* Never construct a
  plausible answer.
- Show the scope searched — "across 47 school emails since January."
- No review. It writes nothing.

**Adults only, enforced in the route rather than the UI.** See
`docs/identity.md`'s Q&A gating: `role = 'adult'` and not `display`, checked
before retrieval runs. Because the index carries `pastoral_record` content
unfiltered — Matt's call, nothing in school mail so far warrants stricter
handling, revisit if that changes — this route check is the only thing
standing between a child or the fridge and pastoral content. Don't weaken it
without reintroducing an index-level exclusion to back it up.

---

## Data model additions

```
relevance_profile
  person            text primary key    -- Rose | Tom | Matt | Renée | parents
  year_level        text
  class_name        text
  activities        text[]              -- stated, never inferred
  interests         text[]              -- stated, never inferred
  expansions        jsonb               -- {activity: [concepts]}, generated on
                                        -- save, user-editable
  always_relevant   text[]              -- parents only
  negative_examples text[]              -- from rejections, max 20
  discovery_enabled boolean default true
  updated_at        timestamptz

discovery_item
  id
  raw_message_id    references raw_message(id)
  person            text not null       -- exactly one, never household
  title             text not null
  why               text not null       -- the stated connection
  relevance         numeric not null    -- 0.0-1.0
  source_quote      text
  source_url        text
  dismissed_at      timestamptz
  expires_at        timestamptz         -- created_at + 30 days
  created_at        timestamptz

-- proposed_item / item gain:
  kind              ... | 'action' | 'uniform_override'
  persons           text[]              -- replaces singular person
  source_url        text
  uniform           text                -- formal | sport | house
  completed_at      timestamptz         -- action items only

-- raw_message gains:
  cleaned_body      text
  search_vector     tsvector            -- generated from subject + cleaned_body
```

### Seed profile

```
Rose — Year 7, class 7H
  Activities: dance, pilates, St John Ambulance cadets
  Interests: performing arts, music

Tom — Year 6, class 6C
  Activities: fishing, surfing, mountain biking
  Interests: sport, outdoors

parents
  Always relevant: reports, payments, fees, forms requiring signature,
  excursions and permission notes, parent-teacher bookings, uniform changes,
  term dates, closures, anything with a deadline and a parent action
```

---

## New findings from real mail

**The week letter is in the bulletin subject.** *"Year 6 Week Ahead - 9A"* —
Term 3, Week 9, Week A. Parse it and assert against `lib/week.js`. If the
computed letter disagrees with the one the school just emailed, raise it rather
than silently trusting either. Given `week_anchor` is remembered state, a free
weekly check from the source of truth beats any test.

**Tracking-wrapped links.** Newsletter links are 300+ character
`url2724.lindisfarne.nsw.edu.au/ls/click?upn=...` redirects. Store as
`source_url`, never render raw, collapse to `[link]` in `clean.js` before the
LLM call.

**Signature rosters repeat weekly.** Every Year 6 bulletin carries six homeroom
teachers and their addresses. Strip in `clean.js`.

**Attachments are usually chrome.** `TASSEmailSignature-2021-100x700.png`
arrives on every school email. Filter by filename and size before treating any
attachment as content.

**Bulletins run 100–140KB raw.** Cleaning is not optional at this volume.

---

## Rules that look arbitrary

- **Precision for extraction, recall for discovery.** Tuning them the same way
  makes one useless and the other dangerous.
- **Extract past items, filter at display.** Bulletins describe a week already
  underway.
- **Store the raw message forever.** Q&A depends on it and prompts get re-run.
- **Discovery never writes to the store other modules read.** It is a leaf.
- **A discovery item without a `why` is a bug**, not a cosmetic omission.
- **Review volume is the survival condition.** If the queue exceeds roughly five
  items a week, the relevance filter is too loose. Fix the filter.

---

## Build order

1. `raw_message` with `cleaned_body` and `search_vector`.
2. IMAP poller (`imapflow`, App Password) on a Vercel cron. `To`-header branch
   plus sender allowlist. Dedupe on `Message-ID`.
3. Identity and device pairing — see `docs/identity.md`.
4. **Q&A.** Ships here.
5. `seqta.js` wired. Deterministic, free, immediately useful.
6. `proposed_item`, `item`, `relevance_profile` tables.
7. Review queue on phones, with the profile editor beside it.
8. `bulletin.js` wired — extraction pass only, with the four corrections above.
9. `lib/whatson.js` adapter. Merge approved items with `calendar_event`.
10. Home screen slot, listing page, person page filters.
11. Discovery pass, person pages, profile expansion editor.
12. Heartbeat — if any source returns zero parsed items twice running, raise it
    in the Operations Register.

**Q&A is deliberately fourth.** It needs the raw store, the poller and identity
— nothing else. No extraction, no review queue, no `proposed_item` schema, and
no risk of a wrong date reaching the wall, because it writes nothing. It is the
cheapest genuinely useful thing in this brief and the first thing a parent will
value.

It also improves on its own while the rest is built, because the poller is
accumulating corpus from step 2 onward. Seed it by bulk-forwarding whatever
school mail is still sitting in `matthowsam@me.com` — retrieval quality is a
function of corpus size, and a fortnight is thin.

Steps 5 and 7 then prove the routing and review loop at zero LLM cost before
any extracted date is trusted.

---

## Acceptance checks

- [ ] Apple and Google account mail to the Gmail address is dropped, not
      extracted
- [ ] *Year 6 Week Ahead - 9A* yields week letter A and asserts against
      `lib/week.js`
- [ ] The Tuesday assembly uniform line becomes a `uniform_override` for Tom and
      beats the timetable rule on the home screen
- [ ] The Fuse Cup (Year 5 to 8) attributes to both Rose and Tom
- [ ] The Year 6 Graduation Celebration becomes an undated `action` on the
      parents' page
- [ ] SWELL, already on the Home calendar, is suppressed rather than proposed
- [ ] PERMA wellbeing-day descriptions yield no extracted items
- [ ] A first-aid or volunteering mention with no date and no year level
      produces a discovery item for Rose with a stated `why`
- [ ] A discovery item never appears on `role=display`
- [ ] Rose can disable discovery from her own view without an adult
- [ ] Dismissing a discovery item is permanent; unread items expire at 30 days
- [ ] Nothing in a kids' morning block reaches the wall unreviewed
- [ ] Q&A is unreachable on `role=display` and from child accounts
- [ ] Q&A with no matching mail says so rather than answering
- [ ] Every What's On item taps through to its source

---

## Decided since this shipped

**Link content is never auto-fetched during ingestion.** An `action` item's
`source_url` (a parent-hosted event page, a ticketing link) stays a tappable
link, exactly as this brief originally specified — the poller doesn't follow
it. Raised 14 Sep 2026 against a real example (a Humanitix-hosted Year 6
event with no date in the email body, only behind the link). Fetching
arbitrary third-party URLs on every cron run adds a failure mode ingestion
doesn't currently have, and a ticketing SPA often won't hand a date or
location to a plain fetch anyway — it needs JSON-LD or OpenGraph parsing,
which works for some platforms and silently fails for others. If a preview
is ever wanted, it belongs as an on-demand fetch from the review queue
(step 7) — a human tap, only for links someone cares about, degrading to
"just the link" when a site doesn't cooperate — not a pipeline stage.

## Open

- Do parent `action` items belong on the person page, or are they a small module
  of their own? They behave more like projects than events.
- Whether Rose sees her own SEQTA commendations, or only the household does. She
  authors her assignments but is a subject of pastoral records — worth resolving
  before this ships.
- Whether discovery should read the Holidays and Wants modules too. A Darwin
  fishing trip sitting in the pool and a fishing charter in a local newsletter
  are the same match, and that module already holds stated interests.
