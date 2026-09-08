# Family Hub

Release 1 shell. Next.js App Router on Vercel, Postgres on Neon.

## Deploy

    npm install
    git init && git add -A && git commit -m "shell"
    # push to GitHub, then import at vercel.com/new

It deploys and renders **before** you connect a database. Without
`DATABASE_URL` the week letter falls back to the seeded anchor and the
correction button is disabled — the footer says `no database`, so the state is
never ambiguous. Connect Neon and it becomes writable.

## Connect Neon

1. Vercel project → Storage → Create Database → Neon. `DATABASE_URL` is set
   for you across all environments.
2. Run the schema once:

       psql "$DATABASE_URL" -f schema.sql

3. Redeploy. The footer note disappears and the week letter becomes tappable.

## What's here

    app/page.jsx           the wall — server component, force-dynamic
    app/api/week/route.js  GET current letter, POST a correction
    components/Clock       client — the server has no idea what time it is
    components/WeekLetter  client — one tap to correct
    lib/week.js            the cycle logic, no UI, fully testable
    lib/calendar.js        Lindisfarne term dates 2026-27
    lib/db.js              Neon, with a graceful no-database path
    app/tokens.css         the design system, untouched
    schema.sql             one table

## The week letter

Remembered state, not a calculation from a distant origin. The school's A/B
cycle carries across term breaks and years with no reset, so a fixed anchor
drifts silently. `week_anchor` holds the last known letter and the Monday it
applied to; `weekLetter()` rolls forward one flip per **school** week.
Holiday weeks hold the letter rather than consuming a flip. Any correction
becomes the new anchor, so a wrong letter is wrong once.

Confirmed by Matt, Monday 7 September 2026: **Week B**, whole school, one
cycle for every year level. This independently validates the model — the SEQTA
reading of 10 August (Week B) rolls forward four school weeks and four flips
to land on B.

`isSchoolWeek` tests **overlap**, not membership. Terms 4 in both years begin
on a Tuesday because the Monday is a pupil-free day; those are still school
weeks. Testing the Monday alone would drop the week and invert the letter for
the rest of the year.

**Watch 12 October.** That is the first real test — the pupil-free Monday, the
holiday hold, and the Term 4 flip to A all land at once. Check it against
SEQTA that morning.

## Timezone

All date maths runs on `Australia/Sydney` via `lib/week.js#today()`. Vercel
servers are UTC; using `new Date()` directly for a calendar date would roll it
over at 10am Sydney time and change the week letter mid-morning. Never call
`new Date()` for a date — call `today()`.

## Not built yet

Nothing writes except the week letter. The household and family cards are
static markup in the shape the API will fill. Read-only is the default for
every surface; the fridge and phones share one responsive layout, and edit
controls appear only when the device identifies as a person rather than
`role=display`.
