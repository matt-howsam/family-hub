# Family Hub — Wishlist Brief

**Status:** proposed, not built.
**Last updated:** 13 October 2026
**Replaces:** `family-hub-wants-brief.md` (6 October 2026). Delete that file.

**This is §7.9 of `family-hub-design-brief.md` ("Wants"), reshaped, and
designed alongside `family-hub-goals-brief.md`.** Read both before building
either. The line between them is the most important rule in each:

> **A wish is a thing with a price. A goal is something a person does.**

Tom's e-bike is on his wishlist. *Work out which e-bike and what it costs* is
Tom's goal. *Do a wheelie* is a goal with no wish at all. When something could
be either, the money goes on the wish and the actions go on the goal.

Claude Code should validate against `docs/DECISIONS.md`, the built chores
module and the built person page before building, and flag conflicts.

---

## What changed from the Wants brief

- **Phase 1 is personal wishlists.** Each person keeps a ranked list of things
  they'd like — to save for, or to be given. Birthday and Christmas ideas are
  the main use. Christmas is ten weeks out; this needs to be useful by then.
- **The household tier becomes phase 2, as *Saving for*.** One active family
  purchase, unranked pool, true cost. Specified below so the schema holds it,
  but not built first.
- **Personal lists are ranked, by drag on phones.** The household pool stays
  unranked.
- **Gifts need a hidden "I've got this" mark.** New, and the hardest part.
- **Each item fetches an image and price from its URL.**
- **Default visibility is *Family*.** A wishlist exists to be seen.

---

## The problem, precisely

Every November someone asks *what do you want for Christmas?* and nobody can
remember the thing they mentioned in August. Ideas arrive one at a time, in
passing, months before anyone is buying — and live nowhere.

Then, when the buying starts, two people get the same thing, or someone guesses
because the only list was in a kid's head.

**This module gives each person one place for the things they'd like, in the
order they'd like them, visible to the family — and lets the family quietly
coordinate who's buying what without the owner ever finding out.**

---

## Phase 1 — personal wishlists

### The item

| Field | |
|---|---|
| **Title** | Required. *E-bike*, *Noise-cancelling headphones* |
| **URL** | Optional. Pasting one fetches image and price (below) |
| **Price** | Optional. Pre-filled from the URL when possible; always editable |
| **Image** | Fetched from the URL, or attached from the share sheet, or none |
| **Note** | Optional, one line. *Size 9*, *the blue one*, *any brand is fine* |

**Adding must take under thirty seconds.** Paste a link, check the title and
price it found, save. Typing a title alone is equally valid — plenty of wishes
have no link (*Concert tickets*, *A day at Dreamworld*).

**Price is labelled with its date** — *$1,199 · Oct 2026* — on phones, because
prices move and a stale price is the most likely wrong number in this module.

### Ranking

The owner orders their own list. Top is most wanted.

- **On phones: drag to reorder, with a visible handle.** Same allowance the
  meal planner makes for its library — the no-drag rule is for the fridge,
  where nothing is editable anyway. Provide up/down buttons as well, for
  accessibility and for anyone who finds drag fiddly.
- **On the fridge and on other people's phones**, the list renders in the
  owner's order. No rank numbers — order says it.
- **New items land at the bottom.** Adding something shouldn't silently
  demote what's at the top.

There is no cap. It's their list.

### Saving for now

One item per person can be flagged *saving for now* — the thing they're
putting their own money toward. It carries three extra, optional fields:

- **Horizon** — the goals module's chips: *this term · this year · later*.
  Shared component, shared rules, resolved from existing term dates.
- **My count** — a self-entered saved figure with its date. **Owner only,
  always**, whatever the item's visibility. Labelled *Kit has the real
  number*: kids' money lives on their CommBank Kit cards, which already track
  savings. Many will leave it blank. That's fine and should feel fine.
- **The deal** — one line recording any family arrangement, written by the
  owner after the conversation: *Mum and Dad pay half once I've saved my
  half.* The app records the agreement; it computes nothing.

**Kids' money is not tracked here.** It comes from gifts, chores and Rose's
part-time job. No link to the chores module. No balance, no account, no
transactions.

### Gifts: "I've got this"

Once a list is visible, someone will buy from it. Two people buying the same
thing is the failure to prevent, and the owner must not find out.

**Anyone who can see an item, other than its owner, can mark it *I've got
this*** — from a phone, with an optional private note (*going halves with
Tom*). Others who can see the item then see *Covered by Mum* on it, and their
own covers as *Covered by you*.

**The owner never sees a cover. Anywhere.** This is enforced at the API, not
in the UI:

- **No route returns cover data to the item's owner.** Not a hidden field, not
  a flag in the payload, not a count. A curious 13-year-old with dev tools
  open must learn nothing.
- **No route returns cover data to `role = 'display'`.** The owner walks past
  the fridge every day. The fridge never shows covers, and the display session
  never receives them.
- **A covered item stays on the owner's list exactly as before** — same
  position, same appearance, still reorderable, still editable.

Edge cases:

- **Owner removes a covered item.** The coverer sees *Removed from Rose's
  list* on their phone, once, with the item's title, so they can decide what to
  do with a gift already bought. The owner sees nothing different.
- **Owner edits a covered item** (changes the colour in the note, say). The
  coverer sees the item marked *Changed since you covered it*.
- **One cover per item.** Going halves goes in the note. A second person
  trying to cover sees *Covered by Mum* and can't.
- **Un-covering** is available to the coverer only, and quiet.

**Giving it.** After the birthday or Christmas, either the coverer marks
*Given* or the owner marks *Got it*. Either moves the item to the owner's
*Got* list. Once given, the cover is no longer secret: *Got it · from Mum*.

### Got it

*Got it* — bought themselves or given — moves an item to a *Got* list, newest
first. Optionally, the owner can **share this win**: reuses the Announcement
card (see `docs/DECISIONS.md`, "The Announcement card" — priority 2, the
same slot Goals' own wins use) (*Tom got his e-bike*). Same rules: three
days, never 06:00–09:00, calm register, withdrawable. Off by default for gifts
— a win line on Boxing Day announcing every present isn't the point.

Removing an item without getting it is just *Remove*, with undo. No reason
needed; it's their list.

### Visibility

| Setting | Who sees it |
|---|---|
| **Family** (default) | Everyone, on phones and in the owner's Wishlist tab on the fridge |
| **Chosen people** | Owner plus the people they pick — e.g. Renée's list shown to the kids and not Matt, for her birthday |
| **Just me** | Owner only — things still being thought about |

Per item, changeable any time. *Chosen* is how a parent's list works for a
surprise: Renée can share hers with Matt and the kids, or with just the kids.

---

## Person page — the Wishlist tab

The person page behind each avatar is tabbed: School · Chores · To Do ·
What's On · Goals · **Wishlist**. There is no existing *Wants* tab to
rename — the Wants brief this replaces was reviewed but never built; only
Goals shipped. Build Wishlist fresh, after Goals in the tab order, per
`components/PersonScreen.jsx`'s existing "one tab per section that has
something in it" pattern. Match the existing tab component; don't build a
second one.

### On the fridge

- **Only items set to *Family*.** Never *Chosen*, never *Just me*.
- **In the owner's order.** *Saving for now* is marked where it sits in the
  list, not hoisted.
- **Each item: image, title, price.** Image large enough to recognise at a
  metre — it's what makes the tab worth looking at. Price shown plainly, no
  date on the fridge.
- **Never on the fridge:** covers of any kind, *my count*, *the deal*, the
  note, the URL.
- **Linked goals appear beneath an item** — *Work out which e-bike* — only if
  the goal is also *Family*. The Goals tab carries the matching *for: E-bike*
  line.
- **Plain, no taps.** No tick, no checkbox, no chevron, no row tap. No fridge
  writes in this module.
- **No *Family* items → the tab does not render.** Not an empty tab.
- **Never the tab the person page opens on.** Resets with the 60-second
  return.
- *Got* and removed items never appear on the fridge.
- Owner's avatar tint, family register.

### On a phone

- **Your own page:** the full list — add, edit, reorder, *saving for now*,
  visibility, *Got*. No covers, ever.
- **Someone else's page:** their *Family* items and any *Chosen* items naming
  you, in their order, with URL, note, price and its date, and the *I've got
  this* control. Read-only otherwise. *My count* never shown. Hidden when
  nothing is visible to you.

---

## Fetching image and price

At save time, when an item has a URL, a server route fetches the page once and
reads, in order of preference:

1. **schema.org `Product` JSON-LD** — `image`, `offers.price`,
   `offers.priceCurrency`, `name`.
2. **Open Graph** — `og:image`, `og:title`, `product:price:amount`.
3. **Twitter card** — `twitter:image`.

Rules:

- **Pre-fill, never overwrite.** Fetched title and price fill empty fields for
  the person to confirm. Anything they've typed wins.
- **Price only if the currency is AUD.** Otherwise leave it blank rather than
  showing a US price as if it were local.
- **Copy the image into the app's own storage** (Vercel Blob, or whatever the
  app already uses), resized to a sensible maximum. **Never hotlink.**
  Retailer image URLs expire and some block embedding; the fridge must never
  show a broken image.
- **Fails quietly.** Some large retailers block automated fetches or render
  everything client-side. Then the item saves with what the person typed, a
  Phosphor placeholder icon, and an *Add a picture* option (share sheet or
  photo). No error dialog.
- **No refresh in phase 1.** The image and price are captured once. A
  *Refresh price* button on phones is a reasonable later addition; automatic
  price tracking is out of scope.

**This route fetches arbitrary URLs, so it must be locked down:**

- `http` and `https` only.
- Resolve the host and **reject private, loopback and link-local addresses**
  (including after redirects). No fetching the app's own internals.
- Cap time (≈5s), response size (≈2MB HTML, ≈5MB image), and redirects (≈3).
- Accept only image content types for the image download.
- Authenticated phone sessions only; never callable from `role = 'display'`.

---

## Phase 2 — Saving for (household)

Specified now so the schema holds it. **Not part of the first build.**

The household's shared purchases — a boat, a DJ mixing desk. Different rules
from personal wishlists because it's family money:

- **The pool is unranked**, sorted alphabetically. Ranking a household's
  big-ticket ideas implies decisions nobody made.
- **Anyone can add an idea**, attributed to them. Kids included.
- **One active item, promoted by Matt or Renée.** Only the active item gets a
  horizon and a saved figure (a single manual number with its date — no
  account links).
- **Retire out loud.** Releasing a household idea needs a one-line reason the
  proposer can see. A kid's suggestion rotting for three years reads as being
  ignored.
- **The true cost sits beside the price.** Estimate with its basis (*guess ·
  researched · quoted*), plus an ongoing cost per month or year with a note:
  *~$45,000 researched + ~$3,200 a year to keep.* That second number is what
  makes it a decision.
- **On *got it*:** offer a register row for the ongoing cost (Matt or
  Renée — register writes gate on `role = 'adult'` alone, reversed 23
  September 2026, see `docs/DECISIONS.md` — never silently), and an asset
  if the Assets module exists.
- **On the fridge:** the active item as the Announcement card's default
  (see `docs/DECISIONS.md`, "The Announcement card," priority 4) —
  *Saving for · Boat · around mid-2028* — tapping through to a read-only
  Saving for view. **No saved balance on the wall.**
- **Not in any person's Wishlist tab**, Matt's and Renée's included.
- A person can **suggest a wishlist item to the family**, copying it into the
  household pool with attribution.

### Phase 2 also: sharing outside the house

A read-only share link to one person's *Family* list, for grandparents and
extended family at Christmas — the most useful gift feature there is, and the
first thing in the product that leaves the house. Needs its own decisions
before building: link expiry, whether outsiders can cover items (and how
covers stay hidden from the owner if they can), and whether prices show.
**Note it; don't build it.**

---

## Links to other modules

- **Goals:** a goal carries `wish_id`. An item shows its linked goals,
  filtered by each goal's visibility. The wish holds the money; goals hold
  the actions.
- **Chores (built):** no link.
- **Register, Assets:** phase 2 handoffs on household *got it* only.
- **Holidays:** separate module. Phase 2's Saving for and holiday slots may
  later share a "what we're saving for" view.
- **Scorecard:** no link — but see Open.

---

## Data model

```
wish
  id
  scope            text not null default 'personal'   -- 'personal' | 'household' (phase 2)
  person           text not null      -- owner (personal) or proposer (household)
  title            text not null
  url              text
  note             text
  price            numeric            -- AUD
  price_as_at      date
  price_source     text               -- 'fetched' | 'entered'
  image_key        text               -- app storage key; never a retailer URL
  image_source     text               -- 'fetched' | 'uploaded'
  position         int                -- personal only: owner's order
  visibility       text not null default 'family'     -- 'me' | 'chosen' | 'family'
  state            text not null default 'listed'     -- 'listed' | 'got' | 'removed'
  saving_for       boolean not null default false     -- personal: one per person
  horizon          text               -- 'term' | 'year' | 'later' | 'date'
  by               date
  my_count         numeric            -- owner-only, always
  my_count_as_at   date
  deal             text
  got_at           date
  win_shared_at    timestamptz
  created_at       timestamptz not null default now()
  updated_at       timestamptz not null default now()

  -- phase 2, household only:
  active           boolean            -- one per household
  estimate_basis   text               -- 'guess' | 'researched' | 'quoted'
  ongoing_cost     numeric
  ongoing_period   text               -- 'month' | 'year'
  ongoing_note     text
  saved            numeric
  saved_as_at      date
  release_note     text
  suggested_from   references wish(id)

wish_cover
  wish_id          references wish(id) primary key   -- one cover per item
  covered_by       text not null
  note             text               -- private to coverers
  given_at         date
  created_at       timestamptz not null default now()
  owner_changed_at timestamptz        -- set when the owner edits after cover

wish_supporter       -- for visibility = 'chosen'
  wish_id, person
```

Notes:

- **`wish_cover` is a separate table so it can be excluded wholesale.** Every
  read of a person's list joins it only when `session.person !== wish.person`
  and the session isn't `display`. Test this at the route, with an owner
  session and a display session, and assert the response contains no cover
  data at all.
- `position` is maintained per owner; reorder writes the whole affected range
  in one transaction. New items get `max(position) + 1`.
- `saving_for` is unique per person among `listed` personal items — enforce
  with a partial unique index.
- **Removing is soft** (`state = 'removed'`), so a coverer can be told. Purge
  later if ever needed.
- All dates are `date`, never `timestamptz`.
- `wish_supporter` mirrors `goal_supporter`; use one shared `supporter` table
  if the schema conventions allow — there are now two near-identical tables
  rather than one speculative one, so this is worth actually doing this
  time, not just noting.
- Match existing id and timestamp conventions. **`goal` already exists** —
  shipped with Goals, before this brief was written. It carries an unused,
  FK-less `want_id` placeholder column (`schema.sql`, never read or
  written anywhere in `lib/goals.js`) added in anticipation of this
  module. Create `wish` first as planned, then `alter table goal add
  column if not exists wish_id int references wish(id)` and drop the
  stray `want_id` in the same pass — a rename-in-place, not the
  create-before-goal sequencing this brief assumed.

---

## Ownership

| Action | Who |
|---|---|
| Add, edit, reorder, remove, set visibility, *saving for now*, *got it* | The owner only — `session.person === wish.person` |
| *I've got this*, cover note, *given* | Anyone who can see the item, except its owner |
| Un-cover | The coverer only |
| Anything, from `role = 'display'` | Nothing |

Phase 2 household rules are as specified above.

---

## Decisions this module adds

Record in `docs/DECISIONS.md`. Wording ready to paste.

**A wish is a thing with a price; a goal is something a person does.**
Money lives on the wish. Actions live on the goal. They link; they never
merge.

**Personal wishlists are ranked by their owner. The household pool is not.**
A gift-giver needs to know what's wanted most. A household's big purchases
shouldn't look pre-decided by list order.

**Drag to reorder is allowed on phones, never on the fridge.**

**The owner never sees who has covered a gift — enforced at the API.**
No route returns cover data to the item's owner or to the display. The
fridge is walked past daily by the person the surprise is for.

**Wishlist items default to Family visibility.** Unlike goals, a wishlist
exists to be seen.

**Kids' money is tracked on their Kit cards, not here.**
*My count* is optional, self-entered and owner-only. Chores income is not
linked.

**Images are copied into app storage, never hotlinked.**

**Fetched prices pre-fill and are always labelled with their date.**

**Household Saving for and outside sharing are phase 2.**

---

## Scope

### Not this module

- Bank or Kit integration, balances, transactions.
- Reading chores income or computing what anyone can afford.
- Price tracking, deal alerts, scheduled re-scraping.
- Buying, checkout, affiliate links.
- Birthday countdowns or reminders. The calendar has the dates.

### Deferred

- *Refresh price* button.
- Phase 2: household Saving for, suggest-to-family, outside share links.

---

## Build order

1. `wish`, `wish_cover`, `wish_supporter` tables (before `goal`).
2. Phone: own list — add with title, price, note; reorder; remove; visibility.
3. URL fetch: image and price, with the SSRF rules and quiet fallback.
4. Phone: someone else's list, with *I've got this*. **Route tests for
   cover-hiding before this ships.**
5. Fridge: Wishlist tab on the person page.
6. *Saving for now*, *my count*, *the deal*; *got it* and *given*; shared win.
7. The goal ↔ wish link (with Goals step 2 done).

Steps 1–5 are the module, and should land before December.

---

## Design

Family register, owner's avatar tint, Phosphor icons, existing tokens. **If a
new token seems necessary, stop and flag it.**

Images carry this tab. Use a consistent aspect ratio with the image fitted
(not cropped) on a neutral token background, so a tall shoe box and a wide
bike sit together without the row heights jumping.

On phones, *Covered* must be unmistakable to the people who see it — a quiet
mark in the item's corner and the coverer's name — and the same item on the
owner's phone must be pixel-identical to an uncovered one.

| Where | Copy |
|---|---|
| Tab | *Wishlist* |
| Add | *What would you like?* · *Paste a link, or just type it* |
| Fetch failed | *Couldn't grab a picture — add one?* |
| Cover | *I've got this* |
| Covered (others) | *Covered by Mum* · *Covered by you* |
| Removed (coverer) | *Removed from Rose's list* |
| Changed (coverer) | *Changed since you covered it* |
| Saving for now | *Saving for this* |
| My count | *My count* · *Kit has the real number* |
| Deal | *Any deal with the family?* |
| Got | *Got it* · *Got it · from Mum* |
| Empty (own phone) | *Nothing yet. Start with the thing you keep mentioning.* |

### Design examples — not seed data

Tom: *E-bike* at the top, saving for this, horizon *this year*, deal *Mum and
Dad pay half once I've saved my half*, linked goal *Work out which e-bike*.
Below it, a couple of smaller gift ideas with images. **Do not seed.** Each
person enters their own.

---

## Acceptance checks

- [ ] Only the owner can add, edit, reorder, remove or change visibility of
      their items — the route rejects others
- [ ] New items default to *Family* and land at the bottom of the list
- [ ] Drag reorder on a phone persists; up/down buttons do the same
- [ ] The fridge and other people's phones render the owner's order
- [ ] **An owner session's list response contains no cover data — no field,
      no flag, no count** (route test)
- [ ] **A display session's response contains no cover data** (route test)
- [ ] The owner's own item looks identical whether or not it's covered
- [ ] Only one cover per item; a second person sees who has it
- [ ] The owner cannot cover their own item
- [ ] Removing a covered item notifies the coverer once on their phone; the
      owner sees nothing different
- [ ] Editing a covered item marks it *Changed since you covered it* for the
      coverer
- [ ] *Given* or *Got it* moves the item to *Got*; the giver is then shown
- [ ] Pasting a URL with Product JSON-LD pre-fills image, title and AUD price
- [ ] A non-AUD price is not pre-filled
- [ ] A typed title or price is never overwritten by a fetch
- [ ] A blocked fetch saves the item with a placeholder and *add a picture*,
      no error dialog
- [ ] Images are served from app storage; no retailer image URL is rendered
- [ ] The fetch route rejects non-http(s) schemes, private and loopback
      addresses (including after redirect), and oversized responses
- [ ] The fetch route rejects `role = 'display'`
- [ ] The fridge Wishlist tab shows *Family* items only: image, title, price;
      never covers, *my count*, *the deal*, note or URL
- [ ] A person with no *Family* items has no Wishlist tab on the fridge
- [ ] The fridge Wishlist tab has no taps and is never the tab the page opens
      on
- [ ] Only one *saving for now* per person
- [ ] *My count* is never returned to anyone but the owner
- [ ] A linked goal shows beneath an item only when the goal is also *Family*
- [ ] `role = 'display'` cannot write anything in this module
- [ ] Dates survive DST changes without shifting

---

## Open

- **Prices on the fridge** — shown by default here. If a $1,199 item on a
  kid's wall list invites the wrong conversations, make it phone-only.
- **Does the family match kids' savings?** *The deal* records whatever is
  agreed and computes nothing. Worth deciding before Tom asks.
- **Big purchases on the scorecard.** An e-bike top-up or a phase 2 boat will
  land on a card and swamp a weekly category. That's a categorisation rule
  for the scorecard routine, not this module — settle it before the first big
  *got it*.
- **Can the kids cover items on a parent's list?** Yes as specified; worth
  checking that Tom covering Matt's birthday present feels right, since he
  may then need help paying for it.
