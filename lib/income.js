/* ==========================================================================
   Family Hub — household income
   See docs/family-hub-monthly-position-brief.md. One number, never a
   breakdown of sources — base pay plus top-ups is income tracking, which
   was deliberately left to the CommBank app; this module holds the
   position, not the ledger.

   A standing figure, overridden per month — the same pattern the scorecard
   uses for budget (base + event) and the term layer uses for the imported,
   hand-corrected timetable.

   Adults only, phones only, never on the fridge, in any form — stricter
   than the register's own mortgage-hiding rule. Enforced by the caller
   (app/register/page.jsx) never fetching this module at all for a non-adult
   session, not by a flag this module checks itself.

   Reads degrade the same way every other module here does: no database
   means a zero/empty result, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';

/** The standing figure, in cents. 0 if never set. */
export async function getIncomeStanding() {
  if (!hasDb) return 0;
  try {
    const rows = await sql`select income_standing_cents from income_setting where id = true`;
    return rows[0]?.income_standing_cents ?? 0;
  } catch (e) {
    console.error('getIncomeStanding failed:', e.message);
    return 0;
  }
}

/** This month's entered override, if any. */
export async function getIncomeMonth(year, month) {
  if (!hasDb) return null;
  try {
    const rows = await sql`
      select amount_cents, entered_by, entered_at::text
      from income_month where year = ${year} and month = ${month}`;
    if (!rows[0]) return null;
    return { amountCents: rows[0].amount_cents, enteredBy: rows[0].entered_by, enteredAt: rows[0].entered_at };
  } catch (e) {
    console.error('getIncomeMonth failed:', e.message);
    return null;
  }
}

/** The figure `monthly_position` should actually use for this month: the
    entered override if one exists, else the standing figure — and which of
    the two it was, since an overridden month is "visibly the trustworthy
    one," same as a term-layer correction. */
export async function getResolvedIncome(year, month) {
  const override = await getIncomeMonth(year, month);
  if (override) return { amountCents: override.amountCents, source: 'entered' };
  return { amountCents: await getIncomeStanding(), source: 'standing' };
}

export async function setIncomeStanding(cents) {
  if (!hasDb) return;
  try {
    await sql`
      update income_setting set income_standing_cents = ${cents}, updated_at = now() where id = true`;
  } catch (e) {
    console.error('setIncomeStanding failed:', e.message);
    throw e;
  }
}

export async function setIncomeMonth({ year, month, amountCents, enteredBy }) {
  if (!hasDb) return;
  try {
    await sql`
      insert into income_month (year, month, amount_cents, entered_by, entered_at)
      values (${year}, ${month}, ${amountCents}, ${enteredBy ?? null}, now())
      on conflict (year, month) do update set
        amount_cents = excluded.amount_cents, entered_by = excluded.entered_by, entered_at = now()`;
  } catch (e) {
    console.error('setIncomeMonth failed:', e.message);
    throw e;
  }
}
