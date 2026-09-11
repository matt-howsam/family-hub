# Family Hub — Meal Planner Brief

**Status:** proposed, not built.
**Last updated:** 11 September 2026

A new module, not one of the original ten. It replaces the whiteboard on the
fridge where the week's dinners are currently written. Claude Code should
validate this against the codebase and `docs/DECISIONS.md` before building
(see "Validate before building"), and flag anything here that conflicts.

---

## The problem, precisely

The whiteboard works. Dinner gets planned at the fridge, together, and
anything can go on any night. What it can't do:

- **Keep a marker.** The kids keep taking it.
- **Remember.** Each week is wiped, so nothing can be repeated and nothing is
  learned.
- **Warn about prep.** Nothing on a whiteboard says *take the mince out* at
  7am.
- **Travel.** The plan exists only on the fridge.

**Success condition: the whiteboard comes off the fridge.** If both stay up,
one goes stale within a fortnight, the same source-of-truth problem as
calendar entries echoing the timetable. Retire it the week this ships.
**Photograph it before wiping it.** That photo is the seed list.

### What the screen must keep from the whiteboard

1. **Planning happens at the fridge, as a group.** Not on a phone.
2. **Any night can hold anything.** "Leftovers" and "Eating out" are real
   plans. If filling a night needs a phone, the whiteboard wins.
3. **Tonight is readable from across the kitchen.**

---

## Decisions this module adds

Record these in `docs/DECISIONS.md`. Wording is ready to paste.

**The fridge accepts a second write: planning a night.**
Dinner is planned standing at the fridge, as a group. Sending that to a phone
kills it the same way it would kill chore ticks. Writes are confined to the
planner view. The dashboard's Tonight line is navigation only.

**Meals are placed by tap, not drag.**
Touch-drag inside a scrolling view fights iPad Safari's scroll and long-press,
and it is the fine gesture wet hands cannot do. Tap a night, tap a card. A
child leaning on the screen cannot drop anything.

**Undo, never confirm.**
A confirmation dialog turns a two-tap plan into a four-tap one. Accidental
taps are cheap to reverse, so every planner write offers a single-level undo.

**The picker's order is set by hand.**
Reordering by frequency moves cards under a reaching hand. At a metre,
position is how a card is found.

**Cards are archived, never deleted.**
Past nights reference them.

**Prep is the planner's only attention state.**
An unplanned night is calm. Nagging about dinner at 4pm reads as decoration
within a week.

**Planner weeks run Monday to Sunday, independent of school terms.**
Dinner doesn't stop in the holidays. The week letter plays no part here.

**Icons are Phosphor, not emoji.**
Emoji carry their own full colour, which competes with the warm accent
reserved for attention. Phosphor icons take the palette like everything else.

---

## Surfaces

### 1. Dashboard — the Tonight line

**Not a tile.** Tonight's dinner decays within hours and doesn't answer "does
this need me?", so it sits in the Today zone, under the date and week letter,
as one quiet line.

> Tonight · Tacos

| Time (Australia/Sydney) | Shows |
|---|---|
| 06:00–20:30 | `Tonight ·` today's card |
| 20:30 onwards | `Tomorrow ·` the next day's card |
| No card | `Tonight · nothing planned`, calm |

Rule: target date is today before 20:30, otherwise tomorrow. Label is
`Tonight` when the target is today, `Tomorrow` otherwise. 20:30 matches the
existing night state.

**Prep adds a second line, in the attention state:**

- A card with `prep_when = morning` shows its prep note on that day,
  06:00–09:00: `Take the mince out`
- A card with `prep_when = night_before` shows its prep note the evening
  before, 17:00–20:30: `For tomorrow: marinate the chicken`

Outside those windows prep is invisible. There is no tick to dismiss it; the
fridge dashboard stays read-only.

Tapping the line opens the planner. That is navigation, not a write.

### 2. The planner — fridge and phone

One responsive view. Portrait.

**Seven rows, Monday to Sunday, not seven columns.** At ~810pt wide, seven
columns leave ~110pt each and every title truncates. Rows show the day, the
date and the card (icon and title). Tonight is marked. All seven rows should
fit on the fridge without scrolling.

**Header:** `This week` / `Next week`, two large segments. **On Sunday the
view opens on next week**, because this week has one night left and Sunday is
when planning happens.

**Past nights** render quieter and do not respond to touch. They carry no
button styling, so they don't read as disabled controls. They stay visible
because they are what next week gets copied from.

**Placing a card:**

1. Tap a night. A picker sheet opens over most of the screen.
2. Tap a card. It lands on that night, the sheet closes, and an undo toast
   appears for 8 seconds.

In the picker, not-cooking cards sit in their own row above the meals and read
lighter. A night that already has a card shows it marked; picking another
replaces it. `Clear this night` sits at the foot of the sheet. Both are
undoable.

**Fill empty nights from last week.** One button, shown only when the target
week has empty future nights and the previous week has cards. It fills each
empty future night with the same weekday's card from the previous week. It
never overwrites a planned night and never touches past nights. One undo
reverts the whole fill.

**Idle behaviour on the fridge:** an open sheet closes after 30 seconds, and
the planner returns to the dashboard after 60 seconds, matching personal
views.

On a phone the same view is denser. It is also where the library lives.

### 3. The library — phones only

Matt and Renée add, edit, reorder and archive cards. The fridge never shows a
library control.

| Field | |
|---|---|
| Title | Required. `Tacos`, `Spag bol` |
| Icon | Required. Picked from a grid, never typed |
| Kind | `meal` or `not_cooking` |
| Prep note | Optional, one line. `Take the mince out` |
| Prep when | `morning` or `night before`. Required if there is a prep note |

**Adding a card must take under thirty seconds.** Reordering on the phone can
use a drag handle or up/down buttons; the no-drag rule is for the fridge.

Archived cards leave the picker but still render on past nights.

**Seed content:**

- *Not cooking (create these):* Leftovers, Eating out, Takeaway, Fend for
  yourself, Away. All editable.
- *Meals:* **do not invent them.** Leave the meal library empty until it is
  entered from the whiteboard photo. The fridge picker's empty state reads:
  *No meals yet. Add them from a phone.*

---

## Icons

Use the app's Phosphor set, via a curated food subset of roughly 20–30 icons
in the library's icon picker (cooking pot, bowl, pizza, burger, fish, egg,
bread, carrot and so on). **Verify every name against the installed Phosphor
version rather than trusting this list.**

The icon helps find a card from a metre away. The title is the card's
identity. Two cards can share an icon, and that's fine.

---

## Design

No mockup phase. The design system exists: tokens, Plus Jakarta Sans,
Phosphor, and the two-register system. The planner belongs in the **family
register** (warmer, rounded). Nights aren't attributed to people in v1, so
nothing is person-tinted.

Build from existing tokens. **If a new token seems necessary, stop and flag
it** rather than adding one.

Two things can only be judged standing at the fridge, not in a browser:

- Picker card size at a metre. Target cards at least 88pt tall, with icons at
  least 40pt.
- Whether seven rows plus header and toolbar fit 1080pt portrait without
  scrolling.

---

## Data model

```
meal_card
  id
  title          text not null
  icon           text not null          -- Phosphor icon name
  kind           text not null          -- 'meal' | 'not_cooking'
  prep_note      text                   -- one line
  prep_when      text                   -- 'morning' | 'night_before' | null
  position       int not null           -- not `order`, reserved word
  archived_at    timestamptz
  created_at     timestamptz not null default now()

  check ((prep_note is null) = (prep_when is null))

meal_plan
  night          date primary key       -- one dinner per night
  meal_card_id   not null references meal_card(id)
  set_from       text not null          -- 'display' | 'phone'
  set_by         text                   -- person enum from a phone; null from display
  updated_at     timestamptz not null default now()
```

Notes:

- **`night` is a `date`, never a `timestamptz`.** Same rule as all-day
  calendar events. An instant will shift a night across the 4 October DST
  change.
- An empty night is the absence of a row. Clearing deletes the row; undo
  reinserts the previous one.
- `set_from` exists so a mystery change can be traced to the fridge.
- Match the existing schema's id type and naming conventions.

---

## Rules that look arbitrary

- **All date maths runs through `lib/week.js#today()`.** Vercel runs UTC, and
  a naive `new Date()` rolls tonight over to tomorrow at 10am Sydney time.
- **Monday-of-week comes from `lib/week.js`.** Add a helper there if one
  doesn't exist; don't compute it locally.
- **Writes are optimistic.** On failure, retry in the background. After 10
  seconds of failure, the row shows `Not saved yet` quietly. Never revert
  silently, never show a dialog.
- **Reads are cached first.** The plan renders instantly and refreshes behind.
  If a fetch fails, show the cached plan marked stale with its timestamp.
- **Last write wins** if the fridge and a phone edit the same night.

---

## Scope

### Build now

- Schema and not-cooking seed cards
- Planner view, fridge and phone, with picker, clear and undo
- Fill empty nights from last week
- Library on phones
- Tonight line and prep attention on the dashboard
- `DECISIONS.md` entries above

### Later, once the whiteboard is gone

- Sunday afternoon surfacing: `Next week · 3 of 7 planned`
- A person on a night. Undecided whether it means who picked or who cooks
- Each night's evening commitments shown quietly (KPA, surf coaching), read
  from the term layer and calendar, so busy nights get quick meals
- Kids adding cards from their phones

### Not this module

- **Recipes.** A card is a name, not instructions.
- **Shopping lists.** Reminders already does this.
- **Breakfast and lunch.** The whiteboard is dinners.
- **Links to the Groceries scorecard line.** Different ritual, different
  number.
- Nutrition, pantry inventory, meal suggestions.

---

## Acceptance checks

- [ ] Tuesday 07:00, Tacos planned for today: dashboard reads `Tonight · Tacos`
- [ ] 20:31 the same day: reads `Tomorrow ·` with Wednesday's card
- [ ] 09:59 and 10:01 Sydney time show the same night
- [ ] A plan for Sunday 4 October 2026 stays on Sunday across the DST change
- [ ] Morning prep shows in attention 06:00–09:00 and is gone at 09:01
- [ ] Night-before prep shows 17:00–20:30 the previous day
- [ ] No card tonight: `Tonight · nothing planned`, never in attention
- [ ] Tap a night, tap a card: saved. Undo within 8 seconds restores the
      previous state, whether that was another card or empty
- [ ] Fill from last week changes only empty future nights; one undo reverts
      all of them
- [ ] An archived card is absent from the picker and still renders on past
      nights
- [ ] On `role=display`: no library controls anywhere; outside the planner
      view, no edit affordances at all
- [ ] Past nights have no touch response and no button styling
- [ ] Every target is at least 44pt; night rows and picker cards are at least
      88pt
- [ ] Failed fetch: cached plan shown, marked stale with its timestamp, never a
      spinner
- [ ] Failed write: `Not saved yet` on the row, retried, no dialog
- [ ] On Sunday the planner opens on next week
- [ ] On the fridge, the planner returns to the dashboard after 60 seconds idle

---

## Validate before building

- **Does the Today zone exist yet?** If not, ship the planner at its own route
  and add the Tonight line when the zone lands.
- **Is there a write-from-display path yet?** If chore ticks aren't built,
  this module builds the `role=display` write gate, and chore ticks reuse it.
  Don't build two.
- Match id and timestamp conventions in the existing schema SQL.
- Verify Phosphor icon names against the installed package.
- Check `lib/week.js` for a Monday-of-week helper.

---

## Open

- A person on a night: who picked, or who cooks? One field, one meaning.
- Should kids add cards? It would give them ownership the way holiday ideas
  do, but a library of eleven desserts is a real risk.
- The Tonight line competes for space in the Today zone with the kids'
  blocks on a school morning. Check it against the home screen brief's
  budget.
