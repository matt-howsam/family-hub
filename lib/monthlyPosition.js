/* ==========================================================================
   Family Hub — monthly position
   See docs/family-hub-monthly-position-brief.md.

     Income
     − Register grand total (gross, incl. mortgage and school fees)
     − Scorecard month total (the month just closed)
     − Asset fund accrual (lib/assets.js#getAssetsView's sinkingFundMonthlyCents)
     = Savings pool

   Cached per month, mirroring lib/scorecard.js#ensurePeriod's
   lazy-create-then-freeze pattern rather than a cron (there isn't one).
   The difference from that pattern: a scorecard period freezes the moment
   it's first opened, because "opened" is the only signal available. Here,
   finality is a real fact, not a proxy for it — a month is `final` only
   once its scorecard is fully entered AND its income is confirmed, so this
   recomputes on every read UNTIL both are true, then freezes forever.
   Editing a budget or an asset estimate after that point must never move
   a month that's already final — enforced twice: the app returns early
   on a cached final row, and the upsert itself only ever touches a row
   that isn't already final.

   Reads degrade the same way every other module here does: no database
   means an empty/null result, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ } from './week.js';
import { getResolvedIncome } from './income.js';
import { getRegisterView } from './register.js';
import { getMonthView } from './scorecard.js';
import { getAssetsView } from './assets.js';
import { getFundBalanceCents, listAllDraws } from './assetFund.js';

function shapePosition(row) {
  return {
    year: row.year,
    month: row.month,
    incomeCents: row.income_cents,
    incomeSource: row.income_source,
    registerGrossCents: row.register_gross_cents,
    scorecardTotalCents: row.scorecard_total_cents,
    fundAccrualCents: row.fund_accrual_cents,
    savingsPoolCents: row.savings_pool_cents,
    state: row.state,
  };
}

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** This month's position, recomputed live while provisional, returned
    untouched once final. Never fabricates a figure for a month with no
    database — returns null, same as a past scorecard period nobody ever
    opened. */
export async function getMonthlyPosition(year, month) {
  if (!hasDb) return null;
  try {
    const existing = await sql`select * from monthly_position where year = ${year} and month = ${month}`;
    if (existing[0]?.state === 'final') return shapePosition(existing[0]);

    const [income, register, scorecard, assets] = await Promise.all([
      getResolvedIncome(year, month),
      getRegisterView(),
      getMonthView(year, month),
      getAssetsView(),
    ]);

    const registerGrossCents = register.totalMonthlyCents;
    const scorecardTotalCents = scorecard.monthTotal ?? 0;
    const fundAccrualCents = assets.sinkingFundMonthlyCents;
    const savingsPoolCents = income.amountCents - registerGrossCents - scorecardTotalCents - fundAccrualCents;

    // Both conditions, one state — a month with three of four scorecard
    // weeks entered, or still on the standing income figure, stays
    // provisional no matter how final-looking the arithmetic is.
    const state = (scorecard.monthComplete && income.source === 'entered') ? 'final' : 'provisional';

    const written = await sql`
      insert into monthly_position
        (year, month, income_cents, income_source, register_gross_cents, scorecard_total_cents,
         fund_accrual_cents, savings_pool_cents, state, computed_at)
      values (${year}, ${month}, ${income.amountCents}, ${income.source}, ${registerGrossCents},
              ${scorecardTotalCents}, ${fundAccrualCents}, ${savingsPoolCents}, ${state}, now())
      on conflict (year, month) do update set
        income_cents = excluded.income_cents, income_source = excluded.income_source,
        register_gross_cents = excluded.register_gross_cents, scorecard_total_cents = excluded.scorecard_total_cents,
        fund_accrual_cents = excluded.fund_accrual_cents, savings_pool_cents = excluded.savings_pool_cents,
        state = excluded.state, computed_at = now()
      where monthly_position.state is distinct from 'final'
      returning *`;

    // The upsert's own guard blocked the write — another request finalised
    // this exact month between the read above and here. Its version wins.
    if (written.length === 0) {
      const [refetched] = await sql`select * from monthly_position where year = ${year} and month = ${month}`;
      return shapePosition(refetched);
    }
    return shapePosition(written[0]);
  } catch (e) {
    console.error('getMonthlyPosition failed:', e.message);
    return null;
  }
}

/** The current month plus the eleven before it, oldest first, for the
    register's "last twelve months" list. Skips (never fabricates) any
    month getMonthlyPosition can't produce. */
export async function getMonthlyPositionHistory(months = 12) {
  const now = today(TZ);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  const pairs = [];
  for (let i = 0; i < months; i++) {
    pairs.unshift({ year: y, month: m });
    ({ year: y, month: m } = prevMonth(y, m));
  }
  const rows = await Promise.all(pairs.map((p) => getMonthlyPosition(p.year, p.month)));
  return rows.filter(Boolean);
}

/** Everything the register page needs for the position + fund sections —
    one call so app/register/page.jsx doesn't orchestrate the pieces
    itself. Adults-only, phones-only gating happens at the caller: this
    always computes if asked, it just must never be asked for a
    non-adult session. */
export async function getMonthlyPositionView() {
  const history = await getMonthlyPositionHistory(12);
  const current = history[history.length - 1] ?? null;
  return { current, history };
}

export async function getAssetFundView() {
  const [accrualMonthlyCents, balanceCents, draws] = await Promise.all([
    getAssetsView().then((v) => v.sinkingFundMonthlyCents),
    getFundBalanceCents(),
    listAllDraws(),
  ]);
  return { accrualMonthlyCents, balanceCents, draws };
}
