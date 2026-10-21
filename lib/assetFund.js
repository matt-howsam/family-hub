/* ==========================================================================
   Family Hub — the asset fund
   See docs/family-hub-monthly-position-brief.md. The accrual rate (what
   lib/assets.js#monthlyContribution computes per asset, summed into
   getAssetsView().sinkingFundMonthlyCents) is the expense; a draw here is
   what actually leaves the house. Counting both in the same place would
   double-count in exactly the month it hurts most — a draw never touches
   the monthly savings calculation (lib/monthlyPosition.js), only this
   module's balance.

   The balance has no history before this module existed: there is no
   accrual ledger, only the current accrual rate, and backdating today's
   rate across months it didn't apply to would be exactly the false
   precision this codebase avoids elsewhere (see lib/calendar.js's "nobody
   knows the day" rule). So the balance only ever counts accrual from
   monthly_position rows that actually got computed (going forward from
   when this shipped) minus every draw, including ones that happened
   earlier. A fund can — and initially will — open negative. That's a
   fact, not an error; it renders as a plain number, never an alarm.

   Reads degrade the same way every other module here does: no database
   means an empty/zero result, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';

function shapeDraw(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    assetName: row.asset_name,
    amountCents: row.amount_cents,
    kind: row.kind,
    occurredOn: row.occurred_on,
    vendor: row.vendor,
    note: row.note,
  };
}

/** One asset's draws, newest first — for the asset detail screen. */
export async function listDraws({ assetId }) {
  if (!hasDb) return [];
  try {
    const rows = await sql`
      select afd.id, afd.asset_id, a.name as asset_name, afd.amount_cents, afd.kind,
             afd.occurred_on::text, afd.vendor, afd.note
      from asset_fund_draw afd
      join asset a on a.id = afd.asset_id
      where afd.asset_id = ${assetId}
      order by afd.occurred_on desc, afd.id desc`;
    return rows.map(shapeDraw);
  } catch (e) {
    console.error('listDraws failed:', e.message);
    return [];
  }
}

/** Every draw across every asset, newest first — for the register's fund
    section, per the brief's "draws newest first with their assets". */
export async function listAllDraws() {
  if (!hasDb) return [];
  try {
    const rows = await sql`
      select afd.id, afd.asset_id, a.name as asset_name, afd.amount_cents, afd.kind,
             afd.occurred_on::text, afd.vendor, afd.note
      from asset_fund_draw afd
      join asset a on a.id = afd.asset_id
      order by afd.occurred_on desc, afd.id desc`;
    return rows.map(shapeDraw);
  } catch (e) {
    console.error('listAllDraws failed:', e.message);
    return [];
  }
}

/** Cumulative accrual (every `monthly_position` row ever computed) minus
    every draw. See the module comment for why this has no fabricated
    history before the feature shipped. */
export async function getFundBalanceCents() {
  if (!hasDb) return 0;
  try {
    const [[accrued], [drawn]] = await Promise.all([
      sql`select coalesce(sum(fund_accrual_cents), 0)::int as total from monthly_position`,
      sql`select coalesce(sum(amount_cents), 0)::int as total from asset_fund_draw`,
    ]);
    return accrued.total - drawn.total;
  } catch (e) {
    console.error('getFundBalanceCents failed:', e.message);
    return 0;
  }
}

export async function addDraw({ assetId, amountCents, kind, occurredOn, vendor, note }) {
  if (!hasDb) return;
  try {
    await sql`
      insert into asset_fund_draw (asset_id, amount_cents, kind, occurred_on, vendor, note)
      values (${assetId}, ${amountCents}, ${kind}, ${occurredOn}, ${vendor ?? null}, ${note ?? null})`;
  } catch (e) {
    console.error('addDraw failed:', e.message);
    throw e;
  }
}

export async function deleteDraw(id) {
  if (!hasDb) return;
  try {
    await sql`delete from asset_fund_draw where id = ${id}`;
  } catch (e) {
    console.error('deleteDraw failed:', e.message);
    throw e;
  }
}
