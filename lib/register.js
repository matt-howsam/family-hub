/* ==========================================================================
   Family Hub — operations register
   Digitises the Howsam Household Operations Register — see
   docs/family-hub-design-brief.md §7.2. Every recurring household
   commitment, its renewal date and a K/R/A decision, plus the two figures
   that make the module a scoreboard and not just a chore list: the number
   being reduced, and the savings already won against it.

   `notes` carries the paper's real policy numbers, rego plates and
   "switching to X" commentary — callers building a fridge view must strip
   it themselves (see shapeItem's `notes` staying present in the shaped
   object; the screen component is what gates rendering, same as the
   calendar's PRIVATE_HINTS split between title and description).

   Reads degrade the same way every other module here does: no database
   means an empty view, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ } from './week.js';

const DAY = 86400000;

export const SECTIONS = [
  { key: 'home_utilities', label: 'Home & Utilities' },
  { key: 'digital_comms', label: 'Digital & Communications' },
  { key: 'transport', label: 'Transport' },
  { key: 'family_children_holidays', label: 'Family, Children & Holidays' },
  { key: 'health_insurance', label: 'Health & Insurance' },
];

// Only these frequencies carry a genuine renewal *decision* — a moment
// where keeping, switching or cancelling is actually a choice. Monthly and
// quarterly utility billing recurs regardless of any decision, so a
// same-again electricity bill never queues itself as an action the way the
// paper's own Action Queue never listed one. Status `a` still always
// queues, whatever the frequency — an open action doesn't stop being one
// because the bill happens to be quarterly.
const RENEWAL_FREQUENCIES = new Set(['annual', 'per_term', 'fixed_term', 'one_off']);

/** `$346.50` with cents shown only when the figure actually has them —
    the paper mixes `$23.00` and `$370` in the same column, and forcing
    one convention onto both would be its own small lie. */
export function formatMoney(cents) {
  if (cents == null) return null;
  const hasCents = cents % 100 !== 0;
  return `$${(cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** The monthly-equivalent figure a row contributes to a section total —
    the "derived figures the design must accommodate" from §7.2. A term is
    treated as 4 per year (cost × 4 / 12), which is what the paper's own
    hand-totalled $2,402/mo family figure implies and reproduces almost to
    the cent. `paid_to_date` and `tbc` rows contribute nothing — neither is
    a recurring commitment with a monthly rate. */
function monthlyEquivalentCents(item) {
  if (item.costCents == null) return 0;
  switch (item.costPeriod) {
    case 'month': return item.costCents;
    case 'year': return item.costCents / 12;
    case 'term': return (item.costCents * 4) / 12;
    default: return 0;
  }
}

function daysUntil(dateStr, from) {
  if (!dateStr) return null;
  return Math.round((new Date(`${dateStr}T00:00:00Z`) - from) / DAY);
}

/** A row counts as a queueable renewal when it's marked `a` (always — an
    open action doesn't wait for a calendar), or when it has a genuine
    renewal date (see RENEWAL_FREQUENCIES) inside `withinDays` and in the
    future. */
function isQueueable(item, from, withinDays) {
  if (item.status === 'a') return true;
  if (!item.renewalDate || !RENEWAL_FREQUENCIES.has(item.frequency)) return false;
  const days = daysUntil(item.renewalDate, from);
  return days != null && days >= 0 && days <= withinDays;
}

function shapeItem(row) {
  return {
    id: row.id,
    section: row.section,
    service: row.service,
    provider: row.provider,
    costCents: row.cost_cents,
    costPeriod: row.cost_period,
    costKind: row.cost_kind,
    frequency: row.frequency,
    renewalDate: row.renewal_date,
    renewalLabel: row.renewal_label,
    status: row.status,
    excludedFromReducingNumber: row.excluded_from_reducing_number,
    hideCostOnFridge: row.hide_cost_on_fridge,
    notes: row.notes,
    position: row.position,
  };
}

const emptyView = {
  sections: [], reducingNumberCents: 0, totalMonthlyCents: 0, savingsWonThisYearCents: 0,
  savingsLog: [], actionQueue: [], reviewWatchlist: [],
};

/**
 * The full register: five sections in brief order, each with its rows
 * (paper order) and a monthly-equivalent subtotal; the reducing number
 * (excludes mortgage and school fees, per §7.2); the all-in total (every
 * row, mortgage and school fees included — for Matt's own savings maths
 * outside the app: income minus discretionary spend minus this); the
 * savings log and this year's total; the derived 90-day action queue; and
 * the review/lazy-tax watchlist (every `r`-status row). Section subtotals
 * are computed live from the rows, not copied from the paper's own
 * hand-totalled snapshot — expect small differences from V2026.1 as rows
 * get corrected over time.
 */
export async function getRegisterView() {
  if (!hasDb) return emptyView;
  try {
    const now = today(TZ);
    const rows = await sql`
      select id, section, service, provider, cost_cents, cost_period, cost_kind, frequency,
             renewal_date::text, renewal_label, status, excluded_from_reducing_number, hide_cost_on_fridge, notes, position
      from register_item
      order by section, position, service`;
    const items = rows.map(shapeItem);

    const sections = SECTIONS.map(({ key, label }) => {
      const sectionItems = items.filter((i) => i.section === key);
      const monthlyEquivalentCentsTotal = sectionItems.reduce((sum, i) => sum + monthlyEquivalentCents(i), 0);
      return { key, label, items: sectionItems, monthlyEquivalentCents: Math.round(monthlyEquivalentCentsTotal) };
    });

    const totalMonthlyCents = Math.round(items.reduce((sum, i) => sum + monthlyEquivalentCents(i), 0));

    const reducingNumberCents = Math.round(
      items.filter((i) => !i.excludedFromReducingNumber).reduce((sum, i) => sum + monthlyEquivalentCents(i), 0)
    );

    const savingRows = await sql`
      select rs.id, rs.happened_on::text, rs.what_changed, rs.annual_saving_cents, rs.where_it_went, ri.service as item_service
      from register_saving rs
      left join register_item ri on ri.id = rs.register_item_id
      order by rs.happened_on desc, rs.id desc`;
    const savingsLog = savingRows.map((r) => ({
      id: r.id, happenedOn: r.happened_on, whatChanged: r.what_changed,
      annualSavingCents: r.annual_saving_cents, whereItWent: r.where_it_went, itemService: r.item_service,
    }));
    const currentYear = now.getUTCFullYear();
    const savingsWonThisYearCents = savingsLog
      .filter((s) => new Date(`${s.happenedOn}T00:00:00Z`).getUTCFullYear() === currentYear)
      .reduce((sum, s) => sum + s.annualSavingCents, 0);

    const actionQueue = items
      .filter((i) => isQueueable(i, now, 90))
      .sort((a, b) => {
        const da = daysUntil(a.renewalDate, now);
        const db = daysUntil(b.renewalDate, now);
        if (da == null && db == null) return 0;
        if (da == null) return -1; // no date = open-ended action, surfaces first
        if (db == null) return 1;
        return da - db;
      });

    const reviewWatchlist = items.filter((i) => i.status === 'r');

    return { sections, reducingNumberCents, totalMonthlyCents, savingsWonThisYearCents, savingsLog, actionQueue, reviewWatchlist };
  } catch (e) {
    console.error('getRegisterView failed:', e.message);
    return emptyView;
  }
}

/** The dashboard tile: `2 renewals in 30 days · $1,449 saved` (§8).
    Attention on any `a` status or a genuine renewal under 14 days —
    exactly the brief's rule, not a softened approximation of it. */
export async function getRegisterTile() {
  if (!hasDb) return { line1: 'Not set up yet', line2: null, attention: false };
  try {
    const now = today(TZ);
    const rows = await sql`
      select id, section, service, provider, cost_cents, cost_period, cost_kind, frequency,
             renewal_date::text, renewal_label, status, excluded_from_reducing_number, hide_cost_on_fridge, notes, position
      from register_item`;
    const items = rows.map(shapeItem);

    const renewalsIn30 = items.filter((i) => {
      if (!i.renewalDate || !RENEWAL_FREQUENCIES.has(i.frequency)) return false;
      const days = daysUntil(i.renewalDate, now);
      return days != null && days >= 0 && days <= 30;
    }).length;

    const savingRows = await sql`select annual_saving_cents, happened_on::text from register_saving`;
    const currentYear = now.getUTCFullYear();
    const savedThisYear = savingRows
      .filter((s) => new Date(`${s.happened_on}T00:00:00Z`).getUTCFullYear() === currentYear)
      .reduce((sum, s) => sum + s.annual_saving_cents, 0);

    const attention = items.some((i) => i.status === 'a')
      || items.some((i) => {
        if (!RENEWAL_FREQUENCIES.has(i.frequency) || !i.renewalDate) return false;
        const days = daysUntil(i.renewalDate, now);
        return days != null && days >= 0 && days < 14;
      });

    const line1 = `${renewalsIn30} renewal${renewalsIn30 === 1 ? '' : 's'} in 30 days`;
    const line2 = savedThisYear > 0 ? `${formatMoney(savedThisYear)} saved` : null;
    return { line1, line2, attention };
  } catch (e) {
    console.error('getRegisterTile failed:', e.message);
    return { line1: 'Not set up yet', line2: null, attention: false };
  }
}

export async function addItem(fields) {
  if (!hasDb) return;
  try {
    await sql`
      insert into register_item
        (section, service, provider, cost_cents, cost_period, cost_kind, frequency,
         renewal_date, renewal_label, status, excluded_from_reducing_number, hide_cost_on_fridge, notes, position)
      values (
        ${fields.section}, ${fields.service}, ${fields.provider ?? null},
        ${fields.costCents ?? null}, ${fields.costPeriod ?? null}, ${fields.costKind ?? 'actual'},
        ${fields.frequency}, ${fields.renewalDate ?? null}, ${fields.renewalLabel ?? null},
        ${fields.status ?? 'k'}, ${Boolean(fields.excludedFromReducingNumber)}, ${Boolean(fields.hideCostOnFridge)},
        ${fields.notes ?? null},
        coalesce(${fields.position ?? null}, (
          select coalesce(max(position), 0) + 1 from register_item where section = ${fields.section}
        ))
      )`;
  } catch (e) {
    console.error('addItem failed:', e.message);
    throw e;
  }
}

export async function editItem(fields) {
  if (!hasDb) return;
  try {
    await sql`
      update register_item
      set section = ${fields.section}, service = ${fields.service}, provider = ${fields.provider ?? null},
          cost_cents = ${fields.costCents ?? null}, cost_period = ${fields.costPeriod ?? null},
          cost_kind = ${fields.costKind ?? 'actual'}, frequency = ${fields.frequency},
          renewal_date = ${fields.renewalDate ?? null}, renewal_label = ${fields.renewalLabel ?? null},
          status = ${fields.status ?? 'k'},
          status_set_at = case when status <> ${fields.status ?? 'k'} then now() else status_set_at end,
          excluded_from_reducing_number = ${Boolean(fields.excludedFromReducingNumber)},
          hide_cost_on_fridge = ${Boolean(fields.hideCostOnFridge)},
          notes = ${fields.notes ?? null}, updated_at = now()
      where id = ${fields.id}`;
  } catch (e) {
    console.error('editItem failed:', e.message);
    throw e;
  }
}

export async function deleteItem(id) {
  if (!hasDb) return;
  try {
    await sql`delete from register_item where id = ${id}`;
  } catch (e) {
    console.error('deleteItem failed:', e.message);
    throw e;
  }
}

export async function addSaving({ happenedOn, whatChanged, annualSavingCents, whereItWent, registerItemId }) {
  if (!hasDb) return;
  try {
    await sql`
      insert into register_saving (happened_on, what_changed, annual_saving_cents, where_it_went, register_item_id)
      values (${happenedOn}, ${whatChanged}, ${annualSavingCents}, ${whereItWent ?? null}, ${registerItemId ?? null})`;
  } catch (e) {
    console.error('addSaving failed:', e.message);
    throw e;
  }
}

export async function deleteSaving(id) {
  if (!hasDb) return;
  try {
    await sql`delete from register_saving where id = ${id}`;
  } catch (e) {
    console.error('deleteSaving failed:', e.message);
    throw e;
  }
}
