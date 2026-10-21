# Family Hub — Monthly Position & Asset Fund Brief

**Status:** proposed, not built.
**Last updated:** 19 October 2026

Adds a savings calculation to the Operations Register, and the repair
allowance and draw log to the (built) Assets module that make its number
honest.

**This is not a new module.** It is one derived figure in the register, one
new field (income), and two additions to assets. Claude Code should validate
against `docs/DECISIONS.md`, the built assets module and the register before
building, and flag conflicts.

Companion documents: `family-hub-spending-scorecard-brief.md` (where the
month's discretionary total comes from) and §7.8 of
`family-hub-design-brief.md` (the assets module).

---

## The problem, precisely

The product already tracks three kinds of money and relates none of them:

- **Recurring** — the register, `$2,462/mo` excluding mortgage and school fees
- **Discretionary** — the scorecard, a monthly target against weekly actuals
- **Capital** — asset replacement, specified in §7.8 and never computed

What's missing is the arithmetic. Nobody can answer *what did we actually
save last month*, and more usefully, *how much should be sitting in the
offset so the next failure isn't a decision*.

Two real events made this concrete. A pool pump failed in September and cost
$1,400. A Defender air-conditioning compressor failed in October and cost
$1,490. Neither belongs on the scorecard — they aren't behaviour and no
weekly habit would have prevented them — but both left the house, and the
app currently has nowhere to put them.

**This brief adds one number to the register, and the mechanism behind it.**

---

## The calculation

```
Income (entered, per month)
− Register grand total (gross, incl. mortgage and school fees)
− Scorecard month total (the month just closed)
− Asset fund accrual (computed, see below)
= Savings pool
```

### Three traps, each of which silently produces a wrong number

**1. The register's `$2,462` is the wrong figure to subtract.**
That number is *known recurring excluding mortgage and school fees* — it is a
reduction target, deliberately scoped, and it is the headline of the register
module. Subtracting it here overstates savings by the household's two largest
commitments. This calculation uses the grand total, which already exists as a
separate field.

The register must label the two so they can never be confused. They look
interchangeable and are not.

**2. Never subtract both the accrual and the actual repair.**
The accrual *is* the expense. When the compressor is paid, that is a **draw**
on a balance already expensed — not a new expense. Subtracting both
double-counts, and does so in exactly the month that already felt bad.

> The accrual is the expense. The repair is a draw on the fund.

An actual asset repair or replacement therefore appears **nowhere** in this
calculation, and nowhere on the scorecard. It reduces the fund balance, which
is a separate number answering a separate question: *can the offset cover
what's coming?*

**3. A partial month must never render a savings figure as final.**
The scorecard's month total isn't complete until Week 4 is entered, which on
the current routine is the 4th of the following month. Income may also still
be showing its standing value rather than the month's actual. Either one makes
the figure an estimate.

**One state, two reasons.** A month is `final` only when all four scorecard
weeks are entered *and* income is confirmed for that month. Until then it is
`provisional` and visibly so. A flattering provisional number that nobody
knows is provisional is worse than no number.

---

## Income

A standing monthly figure, overridden per month.

This is the same pattern the product already uses twice: the scorecard's
`base + event`, and the term layer's imported timetable corrected by hand.
Keep it consistent.

- **`income_standing`** — one value, edited when it changes.
- **`income_month`** — an optional per-month actual that overrides it.
- An overridden month is **visibly the trustworthy one**, as with term-layer
  corrections. A month still on the standing figure is an estimate and marks
  the position `provisional`.

**One number per month, never a breakdown.** Base pay plus top-ups is
income tracking, which was deliberately left to the CommBank app in September
— the app holds the position, not the ledger. Splitting it into salary,
consulting and other turns this field into the thing that decision rejected.

### Visibility

**Adults only, phones only. Never on the fridge, in any form.**

The register's existing rule keeps the mortgage payment off the wall. Household
income is strictly more sensitive and sits on a screen Rose and Tom walk past
several times a day. This is not a tile, not a line in zone 1, and not behind
an avatar tap. It exists on Matt's and Renée's phones and nowhere else.

---

## The asset fund

The assets module is built. It needs two additions before its number is
trustworthy.

### Addition 1 — a repair allowance per asset

§7.8 computes replacement estimate ÷ years remaining. That caught the pool
pump, which genuinely was a replacement. **It would not have caught the
compressor**, which was a repair to an asset nobody is replacing.

Repairs are the more frequent draw, so a fund built on replacement
amortisation alone runs systematically short. Each asset carries a second
figure:

- **`repair_allowance_annual`** — entered, or derived as a percentage of
  replacement value, with its basis recorded the same way estimates are.

On a 20-year-old Defender the repair line may well exceed the replacement
line. That is the correct result, not an error.

```
accrual_monthly = Σ over assets of (
    replacement_estimate / years_remaining / 12
  + repair_allowance_annual / 12
)
```

### Addition 2 — a draw log

The accrual rate is what moves to the offset each month. What is actually in
the offset is a different number, and if it lives in someone's head the fund
will be over- or under-drawn.

```
asset_fund_draw
  id
  asset_id        references asset(id)
  amount          int not null          -- cents
  kind            text not null         -- 'repair' | 'replacement'
  occurred_on     date not null
  vendor          text
  note            text
  created_at      timestamptz not null default now()
```

Every draw attaches to an asset. Two consequences:

- **The fund balance becomes real** — cumulative accrual minus draws.
- **The next estimate gets better.** §7.8 already wants service history to
  inform the replacement forecast. A logged draw history is that, for free.
  The pool pump's predecessor failed at 3.5 years; the second time that
  happens it will be a fact rather than a memory.

### Seed the two known draws

| Date | Asset | Amount | Kind |
|---|---|---:|---|
| 8 Sep 2026 | Pool pump | $1,400 | replacement |
| 14 Oct 2026 | Defender — A/C compressor | $1,490 | repair |

### Vehicles are assets

The module's worked examples are all house infrastructure — pool pump, hot
water, rainwater pump, dishwasher, aircon. The Defender and the Mazda belong
there too, and the Defender in particular is producing exactly the pattern
the module exists to catch.

Note the seam with the projects module: vehicle servicing is already a
maintenance job on the register, and §7.1 says maintenance jobs attach to
assets. The annual Defender service is a maintenance job; the compressor is a
fund draw. Both hang off the same asset.

---

## Quoted work is not unplanned

A distinction worth protecting, because it is easy to lose.

Gooding Automotive has flagged roughly **$1,500 of further Defender repairs in
December**. The moment work is quoted and dated it stops being a surprise and
becomes a commitment. It belongs in the register's 90-day action queue and as
a maintenance job with a due date — not in a category named for things nobody
saw coming.

Without this line, "unplanned" quietly becomes "things I would rather not have
budgeted for", and the register loses the ability to show what is actually
coming.

The December work will be a **fund draw** when paid, like the compressor. The
fund balance is how you know in advance whether it is already covered — which
is the entire point of the exercise.

---

## Why this isn't on the scorecard

Stated once, plainly, because the pressure to merge them will recur.

The scorecard is a **weekly behaviour instrument**. Its categories are things
a household can decide differently next week. Its Unplanned Spending line is
impulse buys, Amazon and eBay — a behaviour category, and one the household
consistently wins: $65 against $250 in August, $16 in September Week 4.

Letting a $1,490 compressor land there destroys the only question that line
answers. It also breaks the card mechanically: the scorecard has no concept of
a balance, no carry-forward, and resets every month. An accruing fund is a
different kind of object and needs a different home.

**A failed compressor is not a spending decision.** Nothing about it belongs
on an instrument designed to change spending decisions.

---

## Surfaces

**Register, phone — the monthly position.** One small section. Income, the
three deductions, the savings pool, and its `provisional | final` state. Last
twelve months available, because one month in isolation says very little and
the year-to-date figure is the honest one.

**Register, phone — the fund.** Accrual per month, current balance, draws
newest first with their assets. One line answering *is the offset ahead of
what's coming?*

**Register, fridge — nothing.** No income, no savings pool, no fund balance.
The register's fridge variant is unchanged by this brief.

**Assets, phone — repair allowance** on the asset form, and that asset's
draws on its detail screen.

**Assets, fridge — unchanged.** An asset past its replacement date stays a
quiet dated fact, per §7.8.

---

## Data model

```
monthly_position            -- derived, cached per month
  year, month               primary key
  income                    int          -- cents; resolved value
  income_source             text         -- 'standing' | 'entered'
  register_gross            int
  scorecard_total           int
  fund_accrual              int
  savings_pool              int          -- derived
  state                     text         -- 'provisional' | 'final'
  computed_at               timestamptz

income_setting
  income_standing           int not null -- cents

income_month
  year, month               primary key
  amount                    int not null
  entered_by                text
  entered_at                timestamptz
```

Plus, on the existing `asset`:

```
  repair_allowance_annual   int          -- cents
  repair_basis              text         -- 'entered' | 'percent_of_value'
```

Notes:

- **All figures in cents**, matching the scorecard.
- `monthly_position` is cached rather than computed on read, so a historical
  month doesn't silently change when a budget or an asset estimate is edited
  later. Recompute on demand; never retroactively.
- `savings_pool` can be negative. It renders as a plain number, not an alarm —
  a month with a $1,490 compressor and a Brisbane trip in it is a fact, not a
  failure. Same tone rule as the register's existing figures.
- Match existing id and timestamp conventions.

---

## Decisions this adds

Record in `docs/DECISIONS.md`. Wording ready to paste.

**The accrual is the expense; the repair is a draw.**
An asset repair or replacement never appears in the savings calculation or on
the scorecard. It reduces the fund balance, which was already expensed through
the monthly accrual. Counting both double-counts, in the month it hurts most.

**The savings calculation uses the register's grand total, never `$2,462`.**
That figure excludes mortgage and school fees by design — it is a reduction
target, not an outgoing.

**The asset fund accrues for repairs as well as replacements.**
Replacement amortisation alone misses the more frequent draw. A pool pump was
a replacement; a Defender compressor was a repair.

**Every fund draw attaches to an asset.**
The balance becomes real and the next estimate is based on history rather than
a guess.

**Income is a standing figure overridden per month, as one number.**
Same pattern as scorecard events and term-layer corrections. No breakdown of
sources — the position, not the ledger.

**Income never reaches the fridge.**
Not a tile, not a line, not behind an avatar tap. Stricter than the mortgage
payment, for the same reason.

**A month's position is provisional until the scorecard is complete and
income is confirmed.**
Both conditions, one state.

**Quoted, dated work is a commitment, not unplanned.**
It belongs in the register's action queue with a due date.

---

## Scope

### Build now

- `income_setting`, `income_month`, `monthly_position` tables
- `repair_allowance_annual` on `asset`; vehicles added as assets
- `asset_fund_draw` table, seeded with the pool pump and the compressor
- Accrual calculation in the assets module
- Monthly position section on the register, phones only
- Fund balance and draw log on the register, phones only
- `DECISIONS.md` entries above

### Later

- Year-to-date and rolling twelve-month savings
- Whether the fund accrual should be compared against what is actually in the
  offset account, entered manually
- Surfacing an asset whose logged draws have outrun its remaining-life estimate

### Not this

- **Income tracking or categorisation.** One number per month.
- **Bank or offset-account integration.**
- **Net worth, superannuation, investments.** The register holds outgoings and
  the position, not a balance sheet of the household.
- **Forecasting beyond the accrual.** No projections, no scenarios.
- Anything on the fridge.

---

## Acceptance checks

- [ ] The savings calculation uses the register grand total; the `$2,462`
      reduction-target figure is not referenced anywhere in it
- [ ] An asset repair paid in a month does not reduce that month's savings
      pool — only the fund balance
- [ ] The same repair appears nowhere on the spending scorecard
- [ ] A month with three of four scorecard weeks entered renders
      `provisional`, never a final savings figure
- [ ] A month on the standing income figure renders `provisional`; entering
      the actual makes it `final` once the scorecard is complete
- [ ] An entered income month overrides the standing figure and is visibly
      the corrected value
- [ ] Editing an asset estimate does not retroactively change a computed
      past month
- [ ] The fund accrual includes both replacement amortisation and the repair
      allowance for every asset
- [ ] Each seeded draw attaches to its asset and reduces the balance
- [ ] A negative savings pool renders as a plain figure, never in the
      attention state
- [ ] `role = 'display'` receives no income, savings or fund data from any
      route — asserted at the route, not the UI
- [ ] Nothing from this brief renders on the fridge

---

## Validate before building

- **Does the register already hold the grand total field?** Matt added one;
  confirm its scope includes mortgage and school fees before wiring it in.
- **How does the built assets module store estimates and their basis?** Match
  that pattern for `repair_basis` rather than inventing a second one.
- **Does the scorecard module exist yet?** If not, the position is built with
  the scorecard total as a nullable input and renders `provisional`
  indefinitely until it lands. That is correct behaviour, not a blocker.
- **Check the vehicle maintenance jobs already on the register** before adding
  the Defender and Mazda as assets, so servicing isn't duplicated.
- Match id, timestamp and cents conventions in the existing schema SQL.

---

## Open

- **What the fund accrual actually comes to.** Three draws in four months —
  $1,400, $1,490, and roughly $1,500 due in December — is too small a sample
  to annualise, but it says the figure is not a token amount. Derive it from
  the asset list once vehicles are in, rather than picking a number.
- Whether the offset account balance should be entered manually so the fund's
  *target* and its *actual* can be compared. Probably yes, eventually; it is
  one number and it closes the loop.
- Whether a month's position should be visible to Renée by default or require
  a deliberate share. The role table gives her everything except the register,
  and this lives in the register.
- Whether the three money numbers §12.9 asks to show together — recurring,
  capital, discretionary — are now four, with income, or whether income sits
  apart from that trio.
