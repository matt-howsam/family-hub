/* ==========================================================================
   Family Hub — assets & replacement forecast
   "Nothing in the system currently owns a thing. This module does." See
   docs/family-hub-design-brief.md §7.8. Framed there as §7.1 maintenance
   with a lifespan and a price — the household's original hot water unit,
   rainwater pump and pool pump, each with a real or estimated replacement
   date, so nobody is surprised by a $4,000 bill with no warning.

   Reads degrade the same way every other module here does: no database
   means an empty view, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ } from './week.js';

/** `$1,400` with cents shown only when the figure actually has them. */
export function formatMoney(cents) {
  if (cents == null) return null;
  const hasCents = cents % 100 !== 0;
  return `$${(cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function shapeAsset(row, currentYear) {
  const yearsRemaining = row.expected_replacement_year != null
    ? row.expected_replacement_year - currentYear
    : null;
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    installDate: row.install_date,
    purchaseCost: row.purchase_cost,
    warrantyExpiry: row.warranty_expiry,
    expectedLifeYears: row.expected_life_years,
    expectedReplacementYear: row.expected_replacement_year,
    replacementEstimate: row.replacement_estimate,
    estimateYear: row.estimate_year,
    notes: row.notes,
    yearsRemaining,
  };
}

/** Each asset's slice of "$X per month to not be surprised" — the capital
    counterpart to the register's $2,462/mo (§7.8). Needs both a real
    estimate and a real target year; either missing contributes nothing,
    same as an unfilled register row contributes nothing to that total.
    A year already due or overdue is treated as due within the next twelve
    months (divide by one), never a negative or infinite monthly figure. */
function monthlyContribution(asset) {
  if (asset.replacementEstimate == null || asset.yearsRemaining == null) return 0;
  const years = Math.max(asset.yearsRemaining, 1);
  return asset.replacementEstimate / years / 12;
}

const emptyView = { assets: [], sinkingFundMonthlyCents: 0 };

export async function getAssetsView() {
  if (!hasDb) return emptyView;
  try {
    const now = today(TZ);
    const currentYear = now.getUTCFullYear();
    const rows = await sql`
      select id, name, location, install_date::text, purchase_cost, warranty_expiry::text,
             expected_life_years, expected_replacement_year, replacement_estimate, estimate_year, notes
      from asset order by name`;
    const assets = rows.map((r) => shapeAsset(r, currentYear));
    const sinkingFundMonthlyCents = Math.round(
      assets.reduce((sum, a) => sum + monthlyContribution(a), 0)
    );
    return { assets, sinkingFundMonthlyCents };
  } catch (e) {
    console.error('getAssetsView failed:', e.message);
    return emptyView;
  }
}

export async function getAsset(idParam) {
  if (!hasDb) return null;
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  try {
    const now = today(TZ);
    const rows = await sql`
      select id, name, location, install_date::text, purchase_cost, warranty_expiry::text,
             expected_life_years, expected_replacement_year, replacement_estimate, estimate_year, notes
      from asset where id = ${id}`;
    if (rows.length === 0) return null;
    return shapeAsset(rows[0], now.getUTCFullYear());
  } catch (e) {
    console.error('getAsset failed:', e.message);
    return null;
  }
}

export async function addAsset(fields) {
  if (!hasDb) return;
  try {
    await sql`
      insert into asset (name, location, install_date, purchase_cost, warranty_expiry,
                          expected_life_years, expected_replacement_year, replacement_estimate, estimate_year, notes)
      values (${fields.name}, ${fields.location ?? null}, ${fields.installDate ?? null}, ${fields.purchaseCost ?? null},
              ${fields.warrantyExpiry ?? null}, ${fields.expectedLifeYears ?? null}, ${fields.expectedReplacementYear ?? null},
              ${fields.replacementEstimate ?? null}, ${fields.estimateYear ?? null}, ${fields.notes ?? null})`;
  } catch (e) {
    console.error('addAsset failed:', e.message);
    throw e;
  }
}

export async function editAsset(fields) {
  if (!hasDb) return;
  try {
    await sql`
      update asset set
        name = ${fields.name}, location = ${fields.location ?? null}, install_date = ${fields.installDate ?? null},
        purchase_cost = ${fields.purchaseCost ?? null}, warranty_expiry = ${fields.warrantyExpiry ?? null},
        expected_life_years = ${fields.expectedLifeYears ?? null},
        expected_replacement_year = ${fields.expectedReplacementYear ?? null},
        replacement_estimate = ${fields.replacementEstimate ?? null}, estimate_year = ${fields.estimateYear ?? null},
        notes = ${fields.notes ?? null}, updated_at = now()
      where id = ${fields.id}`;
  } catch (e) {
    console.error('editAsset failed:', e.message);
    throw e;
  }
}

export async function deleteAsset(id) {
  if (!hasDb) return;
  try {
    await sql`delete from asset where id = ${id}`;
  } catch (e) {
    console.error('deleteAsset failed:', e.message);
    throw e;
  }
}
