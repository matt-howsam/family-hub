# Family Hub — Home Screen Brief

A mockup brief for the single most important screen in the product. The
modules behind it aren't designed yet; this screen anchors them and sets the
visual language everything else will follow.

---

## The situation

An old iPad, mounted on a fridge, portrait, permanently powered, never
sleeping, never locked. Roughly 810 × 1080 pt, 3:4.

Nobody launches this app. It is simply on. Someone walks into the kitchen and
looks at it from a metre away, often while doing something else, often with
wet hands.

Four people in the house: Matt and Renée, Rose (13, Year 7) and Tom (11, Year
6), both at Lindisfarne Anglican Grammar.

---

## The test this screen has to pass

**A parent standing three metres away at 7:15am on a Tuesday should know what
uniform each kid needs without touching anything.**

That single question causes more morning friction than everything else
combined. If the mockup answers it instantly, the screen works. Everything
else is secondary.

The corollary: this is an **answer-first** screen, not a launcher. A grid of
module tiles asks people to know what they want and go find it. The fridge
should hand over today's answers unprompted, then offer ways in.

---

## Zones, top to bottom

### 1. Today

Time, date, and the week letter as one composed unit.

> **7:15**
> Tuesday 10 March · **Week B**

The week letter is the hinge the entire school day swings on — it decides
classes, uniform and what gets packed, and it's the thing this family
genuinely forgets. Give it real weight. It should be tappable to correct in
one touch (the school occasionally shifts the cycle), and a corrected letter
should read as chosen, not broken.

The clock earns its place: this is also the kitchen clock, and it's what makes
the thing feel like an appliance rather than an app. But it shouldn't dominate
— everyone in the room has a phone.

### 2. The kids — the hero of the screen

Two blocks, Rose and Tom. This is the payload, and it should occupy roughly
the top half of the screen below the date.

Each block answers, in priority order:

1. **What uniform?** The largest, plainest, most unmissable element.
2. **Anything unusual today** — assembly, chapel, music, excursion.
3. **What to bring** — instrument, boots, permission slip.
4. **After school** — or nothing.

Real content for the mockup, drawn from actual timetables:

> **Tom** · Year 6
> **PE uniform**
> PE Prac, middle of the day
> Surf coaching, 4:00

> **Rose** · Year 7
> **Formal uniform**
> PDHPE theory · Tech — Material Timber
> KPA, 4:00

Rose's real Tuesday in Week B, from SEQTA: PDHPE, Technology – Material
Timber, Science, English, French, HSIE. Nothing unusual, formal uniform.

**This is the right day to design against.** On a Tuesday in Week B the two
children need *different uniforms* — Tom has PE Prac and needs sport gear,
Rose has PDH theory and stays in formal. That divergence is precisely the
morning friction this screen exists to remove, and a mockup where both kids
happen to match would prove nothing.

Two structural facts from the real timetables:

**Their school days don't align.** Rose's Year 7 periods run 8:40–9:40 and
9:40–10:35 with first break at 10:35; Tom's Year 6 periods run 8:40–9:35,
9:35–10:20 and 10:20–11:10 with first break at 11:10. Different bell times,
different break times, different period counts, and Tom is met at 3:10 while
Rose finishes 3:20. Nothing on this screen can assume a shared school day.

**Neither is more complex than the other, just different.** Tom's sheet
carries teacher names and rooms; Rose's carries none but uses subject
icons. Don't force them into identical templates — let the shared elements
emerge.

**Uniform types:** formal, sports/PE, house. Consider whether colour or a
small mark could make the uniform answer readable from further away than text
allows. This is the one place worth spending a distinctive visual device.

**Rose has already designed this, and her version is the brief.**

The timetable on the fridge is not the school's. Given full SEQTA output —
subject names, teacher names, room codes, exact times — Rose rebuilt it
herself with ChatGPT because the official one is unreadable. What she chose is
the best user research available:

- **Kept:** subject, time, day, week.
- **Added:** an icon per subject — globe for HSIE, pencil for Maths, palette
  for Visual Arts, test tube for Science, dancer for Dance.
- **Removed entirely:** every teacher name and every room code.

A real SEQTA cell reads *Science, 10:55–11:50, Ms Larni Borger, S12*. She kept
*Science 🧪*. A 13-year-old with all the data decided the subject was the
payload and the rest was noise.

**Design accordingly: subject and icon dominant, teacher and room on tap or
not at all.** Do not reproduce the SEQTA grid — the product already has a
competing design from its own user, and hers is better.

Note the school also hides real meaning in its icons: PDHPE appears with a
shirt on practical days and an apple on theory days, and only the shirt means
sport uniform. Icons can carry semantics here, so decide deliberately which
ones do and which are decoration.

### 3. Module tiles

Four or five, not nine. Each carries **one line answering "does this need
me?"** — never a total. `47 subscriptions` tells you nothing; `2 renewals in
30 days` makes you look.

| Tile | Line |
|---|---|
| Projects | `3 stalled` |
| Spending | `Week 2 · $610 of $1,128` |
| Register | `2 renewals in 30 days · $1,449 saved` |
| Holidays | `Straddie in 11 weeks` |

Two states only — calm and attention. No gradient of urgency; a wall of amber
reads as decoration within a week.

Note the register tile carries a debt and a win together. That pairing is
deliberate: a renewal list is a chore, a savings tally is a scoreboard.

Modules deliberately absent from this level: goals (behind avatars, private by
nature), assets, wants, chores. They exist; they don't need a permanent tile.

### 4. Avatar strip

Four illustrated characters — Matt, Renée, Rose, Tom — within thumb reach at
the bottom. One tap opens that person's own view: their full day, their goals,
their chores.

Use an illustrated character set (Big Heads or similar) rather than photos.
Each person picks their own. Choose four background colours deliberately so
each is identifiable at a glance from across the kitchen.

---

## Two states, both required

The screen must be materially different at different times, not just a
greeting string swapped out.

**State 1 — Tuesday, 7:15am.** School morning. The kids' blocks dominate; the
uniform answer is readable from the doorway. Module tiles are quiet.

**State 2 — Saturday, 10:00am.** No school. The kids' blocks have nothing
urgent to say. Something else should take that space — projects surfacing for
the weekend, the holiday countdown, or a small daily rotating item (a fact, a
word, a joke) that gives someone a reason to look when nothing needs them.

The second state is the harder problem and the more interesting one. A
dashboard that looks identical at 7am and 9pm reads as a spreadsheet no matter
how good the illustration is.

---

## Aesthetic direction

This is a kitchen object, sitting alongside a calendar, a shopping list and a
child's drawing. It replaces two printed documents that were themselves
carefully typeset — restrained colour, a serif display face, a warm accent
used only where attention is needed. That instinct is right and worth carrying
across.

- **Not** an enterprise dashboard: no dense tables, no charts, no sidebar
  navigation, no grey-on-grey.
- **Not** a children's app either. Two adults read it daily. Warm and
  characterful, not cartoonish.
- Illustration and colour carry the warmth; the information stays disciplined.
- Legible at a metre. That constraint alone kills most conventional dashboard
  layouts, which is a good thing.

Spend the boldness on the avatars and the uniform indicator. Keep the module
tiles quiet by comparison.

**Copy matters as much as layout.** This household already has a voice, taken
from the paper it's replacing: *"Every dollar has a job. Every week has a
number."* · *"Nothing renews without a conscious decision."* Write like that,
not like task management software. This is a house, not a backlog.

---

## Constraints

- **Portrait.** Vertical stacking; more rows visible; reads like the page it
  replaces.
- **Nothing under 44px.** Wet hands, standing up, one-handed.
- **Read-only, with one exception.** The fridge shows; phones edit. The only
  write it permits is ticking a chore, which happens inside a personal view,
  not on this screen. **No edit affordances here at all** — no disabled
  buttons, no greyed-out fields. A button that can never be pressed is worse
  than an absent one.
- **Never blank, never spinning.** Cached values render instantly and refresh
  behind. If a fetch fails, show the last known value marked stale with its
  timestamp — never an error, never a confident guess.
- **No account numbers, policy numbers, rego plates or the mortgage payment.**
  Those exist in the data and render on phones only.

---

## What to deliver

1. A short design plan first — palette as named hex values, typefaces and
   their roles, layout approach. Worth reviewing before pixels.
2. **Home screen, State 1** (Tuesday 7:15am, school morning).
3. **Home screen, State 2** (Saturday morning).
4. The uniform indicator on its own, at the size it would actually be read
   from across a room.
5. A module tile in both calm and attention states, side by side.

---

## Questions the mockup should answer

- Can the uniform answer genuinely be read from three metres, or does it need
  a non-text device — colour, shape, an icon?
- How much room do the kids' blocks need before the module tiles stop fitting?
  Is four tiles right, or three?
- What fills the kids' space on a Saturday without feeling like a hole?
- How does the week letter look important without shouting? It's the most
  consequential character on the screen and also just one letter.
- Does a permanently-on screen need a visual rest state — dimmer at night,
  quieter when nothing needs attention — and what does that look like?
