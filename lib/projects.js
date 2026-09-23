/* ==========================================================================
   Family Hub — projects & maintenance
   Digitises the household's real renovation and maintenance backlog. See
   docs/family-hub-projects-module-brief.md, which supersedes
   design-brief.md §7.1's single-pipeline model. "This module makes absence
   visible" — a job that dies at "get a quote" and nobody notices for six
   months. `last_moved_at` is the whole mechanic; a note never touches it.

   Reads degrade the same way every other module here does: no database
   means an empty view, never a thrown error.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ } from './week.js';

const DAY = 86400000;
const STALL_DAYS = 21;
const DUE_WINDOW_DAYS = 30;

/** The four pipeline presets — §1 of the projects brief. Picking one at
    creation is a four-tap choice, not a dropdown of stage names; these
    are also the full strip a job's stage indicator renders. */
export const PIPELINES = {
  contracted: ['Idea', 'Research', 'Quoting', 'Decide', 'Booked', 'In progress', 'Done'],
  diy: ['Idea', 'Plan', 'Materials', 'Build', 'Done'],
  supply_install: ['Research', 'Choose', 'Quote', 'Order', 'Delivery', 'Install', 'Done'],
  maintenance: ['Due', 'Booked', 'Done'],
};

export const PIPELINE_LABELS = {
  contracted: 'Someone else does it',
  diy: 'We do it',
  supply_install: 'Buy and install',
  maintenance: 'Recurring',
};

function daysSince(dateLike, from) {
  if (!dateLike) return null;
  return Math.round((from - new Date(dateLike)) / DAY);
}

function daysUntil(dateStr, from) {
  if (!dateStr) return null;
  return Math.round((new Date(`${dateStr}T00:00:00Z`) - from) / DAY);
}

function shapeJob(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    pipeline: row.pipeline,
    status: row.status,
    nextAction: row.next_action,
    owner: row.owner,
    due: row.due,
    lastMovedAt: row.last_moved_at,
    budgetEst: row.budget_est,
    budgetActual: row.budget_actual,
    blockedReason: row.blocked_reason,
    waitingOn: row.waiting_on,
    waitingSince: row.waiting_since,
    waitingExpected: row.waiting_expected,
    fundingSource: row.funding_source,
    blockedBy: row.blocked_by,
    blockedByTitle: row.blocked_by_title,
    assetId: row.asset_id,
    registerItemId: row.register_item_id,
    registerItemService: row.register_item_service,
    registerItemCostCents: row.register_item_cost_cents,
    stageId: row.stage_id,
    stageName: row.stage_name,
    stagePosition: row.stage_position,
    stageCount: PIPELINES[row.pipeline]?.length ?? null,
    intervalMonths: row.interval_months,
    lastDone: row.last_done,
    nextDue: row.next_due,
  };
}

const JOB_SELECT = `
  select j.id, j.title, j.type, j.pipeline, j.status, j.next_action, j.owner, j.due::text,
         j.last_moved_at, j.budget_est, j.budget_actual, j.blocked_reason,
         j.waiting_on, j.waiting_since::text, j.waiting_expected::text, j.funding_source,
         j.blocked_by, b.title as blocked_by_title, j.asset_id, j.register_item_id,
         ri.service as register_item_service, ri.cost_cents as register_item_cost_cents,
         j.stage_id, s.name as stage_name, s.position as stage_position,
         ms.interval_months, ms.last_done::text, ms.next_due::text
  from job j
  left join job b on b.id = j.blocked_by
  left join register_item ri on ri.id = j.register_item_id
  left join stage s on s.id = j.stage_id
  left join maintenance_schedule ms on ms.job_id = j.id`;

/** Which of the six groups a job belongs to — §4 of the projects brief,
    in table order. A job appears in exactly one. Maintenance is
    deliberately excluded from ever landing in Needs you by elapsed time
    alone: "maintenance only enters Stalled after next_due passes," so a
    gutter clean with no known interval never floats to the top just
    because nobody's touched it. */
function groupOf(job, now) {
  if (job.status === 'done') return null;
  if (job.status === 'parked') return 'queued';
  if (job.blockedBy) return 'queued';
  if (job.blockedReason === 'funds') return 'ready';

  if (job.waitingOn) {
    const expectedPassed = job.waitingExpected != null && daysUntil(job.waitingExpected, now) < 0;
    // "Once the expected date passes it becomes your move" — a chase, not
    // a stall, but it lifts into Needs you exactly like one. Unset
    // expected dates (we don't know when to expect it back) stay Waiting
    // indefinitely rather than a guessed deadline quietly expiring.
    if (!expectedPassed) return 'waiting';
    return 'needsYou';
  }

  if (job.type === 'maintenance') {
    const due = daysUntil(job.nextDue, now);
    if (due != null && due <= DUE_WINDOW_DAYS) return 'due';
    return 'moving'; // never Needs you — no false stall from an unset interval
  }

  const stalled = daysSince(job.lastMovedAt, now) > STALL_DAYS;
  return stalled ? 'needsYou' : 'moving';
}

const GROUP_DEFS = [
  { key: 'needsYou', label: 'Needs you' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'moving', label: 'Moving' },
  { key: 'ready', label: 'Ready' },
  { key: 'queued', label: 'Queued' },
  { key: 'due', label: 'Due' },
];

function sortGroup(key, jobs, now) {
  switch (key) {
    // Worst offender at the top — that's the point.
    case 'needsYou': return jobs.sort((a, b) => daysSince(b.lastMovedAt, now) - daysSince(a.lastMovedAt, now));
    case 'waiting': return jobs.sort((a, b) => {
      const da = daysUntil(a.waitingExpected, now); const db = daysUntil(b.waitingExpected, now);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    case 'due': return jobs.sort((a, b) => {
      const da = daysUntil(a.nextDue, now); const db = daysUntil(b.nextDue, now);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    case 'moving': return jobs.sort((a, b) => new Date(b.lastMovedAt) - new Date(a.lastMovedAt));
    default: return jobs.sort((a, b) => a.title.localeCompare(b.title));
  }
}

const emptyView = { groups: [] };

/** The grouped list — the most important screen in the module. Empty
    groups disappear entirely rather than rendering a header with nothing
    under it. */
export async function getProjectsView() {
  if (!hasDb) return emptyView;
  try {
    const now = today(TZ);
    const rows = await sql([JOB_SELECT, 'order by j.title'].join('\n'));
    const jobs = rows.map(shapeJob);

    const byGroup = {};
    for (const job of jobs) {
      const key = groupOf(job, now);
      if (!key) continue;
      (byGroup[key] ??= []).push({ ...job, daysSinceMoved: daysSince(job.lastMovedAt, now) });
    }

    const groups = GROUP_DEFS
      .map(({ key, label }) => ({ key, label, jobs: sortGroup(key, byGroup[key] ?? [], now) }))
      .filter((g) => g.jobs.length > 0);

    return { groups };
  } catch (e) {
    console.error('getProjectsView failed:', e.message);
    return emptyView;
  }
}

/** One job's full detail: the job itself, its whole stage strip (all
    pipeline stages, reached or not), notes newest-first, and quotes. */
export async function getJobDetail(idParam) {
  if (!hasDb) return null;
  // idParam arrives as the URL segment string (Next's [id] route) or, from
  // an internal caller, already a number — coerce once, explicitly, rather
  // than trust the driver's implicit text-to-integer cast for a value that
  // isn't guaranteed numeric at all (a stray /projects/abc).
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  try {
    const rows = await sql([JOB_SELECT, 'where j.id = $1'].join('\n'), [id]);
    if (rows.length === 0) return null;
    const job = shapeJob(rows[0]);

    const stages = await sql`
      select id, name, position, entered_at, completed_at from stage
      where job_id = ${id} order by position`;

    const notes = await sql`
      select id, author, body, created_at from note
      where job_id = ${id} order by created_at desc`;

    const quotes = await sql`
      select id, vendor, contact, amount, valid_until::text, status, requested_at::text from quote
      where job_id = ${id} order by requested_at desc nulls last, id desc`;

    return { job, stages, notes, quotes };
  } catch (e) {
    console.error('getJobDetail failed:', e.message);
    return null;
  }
}

/** The dashboard tile: `3 stalled` (§8). Attention on any job unmoved over
    21 days — the same threshold `groupOf` uses for Needs you. Maintenance
    counts here only once actually overdue (`next_due` passed), a stricter
    bar than the Due *group* on the list screen, which also surfaces jobs
    approaching within 30 days for planning — upcoming isn't the same as
    needing you, so the tile doesn't shout for it. */
export async function getProjectsTile() {
  if (!hasDb) return { line: 'Not set up yet', attention: false };
  try {
    const now = today(TZ);
    const rows = await sql`
      select id, type, status, last_moved_at, blocked_by, blocked_reason, waiting_on,
             next_due::text
      from job left join maintenance_schedule on maintenance_schedule.job_id = job.id
      where status not in ('done', 'parked') and blocked_by is null
        and blocked_reason is distinct from 'funds' and waiting_on is null`;

    const stalled = rows.filter((r) => {
      if (r.type === 'maintenance') {
        const due = daysUntil(r.next_due, now);
        return due != null && due <= 0;
      }
      return daysSince(r.last_moved_at, now) > STALL_DAYS;
    }).length;

    return {
      line: stalled === 0 ? 'Nothing stalled' : `${stalled} stalled`,
      attention: stalled > 0,
    };
  } catch (e) {
    console.error('getProjectsTile failed:', e.message);
    return { line: 'Not set up yet', attention: false };
  }
}

async function insertStages(jobId, pipeline) {
  const names = PIPELINES[pipeline];
  for (let i = 0; i < names.length; i++) {
    await sql`
      insert into stage (job_id, name, position, entered_at)
      values (${jobId}, ${names[i]}, ${i + 1}, ${i === 0 ? new Date() : null})`;
  }
}

export async function addJob({ title, type, pipeline, nextAction, owner, budgetEst }) {
  if (!hasDb) return;
  try {
    const rows = await sql`
      insert into job (title, type, pipeline, next_action, owner, budget_est)
      values (${title}, ${type}, ${pipeline}, ${nextAction ?? null}, ${owner ?? null}, ${budgetEst ?? null})
      returning id`;
    const jobId = rows[0].id;
    await insertStages(jobId, pipeline);
    const stageRows = await sql`select id from stage where job_id = ${jobId} and position = 1`;
    await sql`update job set stage_id = ${stageRows[0].id} where id = ${jobId}`;
    if (type === 'maintenance') {
      await sql`insert into maintenance_schedule (job_id) values (${jobId})`;
    }
  } catch (e) {
    console.error('addJob failed:', e.message);
    throw e;
  }
}

/** Everything a phone edit screen can change in one pass, except stage
    (see advanceStage/backStage — a stage change is a bigger event than a
    field edit) and notes/quotes (append-only, their own functions). */
export async function editJob(fields) {
  if (!hasDb) return;
  try {
    await sql`
      update job set
        title = ${fields.title}, next_action = ${fields.nextAction ?? null},
        owner = ${fields.owner ?? null}, due = ${fields.due ?? null},
        budget_est = ${fields.budgetEst ?? null}, budget_actual = ${fields.budgetActual ?? null},
        status = ${fields.status ?? 'active'},
        blocked_reason = ${fields.blockedReason ?? null},
        blocked_by = ${fields.blockedBy ?? null},
        funding_source = ${fields.fundingSource ?? null},
        waiting_on = ${fields.waitingOn ?? null},
        waiting_since = ${fields.waitingSince ?? null},
        waiting_expected = ${fields.waitingExpected ?? null},
        register_item_id = ${fields.registerItemId ?? null}
      where id = ${fields.id}`;
  } catch (e) {
    console.error('editJob failed:', e.message);
    throw e;
  }
}

export async function deleteJob(id) {
  if (!hasDb) return;
  try {
    await sql`delete from job where id = ${id}`;
  } catch (e) {
    console.error('deleteJob failed:', e.message);
    throw e;
  }
}

/** Advance to the next stage. For a maintenance job already at its last
    stage (Done), this is the cycle reset the brief describes — "Due →
    Booked → Done → resets to next due" — rather than a fourth stage that
    doesn't exist: it re-opens the existing three stage rows instead of
    growing a per-cycle history the brief's own schema doesn't carry, logs
    `last_done`, and derives `next_due` from the interval where known. */
export async function advanceStage(jobId) {
  if (!hasDb) return;
  try {
    const rows = await sql`
      select j.id, j.pipeline, j.type, s.position, s.id as stage_id
      from job j join stage s on s.id = j.stage_id where j.id = ${jobId}`;
    const job = rows[0];
    if (!job) return;
    const names = PIPELINES[job.pipeline];

    if (job.type === 'maintenance' && job.position === names.length) {
      const sched = (await sql`select interval_months from maintenance_schedule where job_id = ${jobId}`)[0];
      const nextDue = sched?.interval_months
        ? new Date(Date.now() + sched.interval_months * 30 * DAY).toISOString().slice(0, 10)
        : null;
      await sql`
        update maintenance_schedule set last_done = current_date, next_due = ${nextDue}
        where job_id = ${jobId}`;
      await sql`update stage set entered_at = null, completed_at = null where job_id = ${jobId}`;
      const first = await sql`
        update stage set entered_at = now() where job_id = ${jobId} and position = 1 returning id`;
      await sql`update job set stage_id = ${first[0].id}, last_moved_at = now() where id = ${jobId}`;
      return;
    }

    if (job.position >= names.length) return; // already Done, no further stage to enter

    await sql`update stage set completed_at = now() where id = ${job.stage_id}`;
    const next = await sql`
      update stage set entered_at = now() where job_id = ${jobId} and position = ${job.position + 1}
      returning id`;
    // Maintenance never terminates at Done — the cycle-reset branch above
    // handles that case before this line is ever reached for it, but the
    // type check stays here too as the guard against ever setting
    // status='done' on a maintenance job by this path.
    const doneNow = job.type !== 'maintenance'
      && job.position + 1 === names.length && names[names.length - 1] === 'Done';
    await sql`
      update job set stage_id = ${next[0].id}, last_moved_at = now(),
                      status = ${doneNow ? 'done' : 'active'}
      where id = ${jobId}`;
  } catch (e) {
    console.error('advanceStage failed:', e.message);
    throw e;
  }
}

/** Back to the previous stage — must exist and be unremarkable; jobs
    genuinely go backwards when a quote falls through. Still a real stage
    change, so `last_moved_at` updates same as advancing does. */
export async function backStage(jobId) {
  if (!hasDb) return;
  try {
    const rows = await sql`
      select j.id, s.position, s.id as stage_id from job j
      join stage s on s.id = j.stage_id where j.id = ${jobId}`;
    const job = rows[0];
    if (!job || job.position <= 1) return;

    await sql`update stage set entered_at = null, completed_at = null where id = ${job.stage_id}`;
    const prev = await sql`
      update stage set completed_at = null where job_id = ${jobId} and position = ${job.position - 1}
      returning id`;
    await sql`update job set stage_id = ${prev[0].id}, last_moved_at = now(), status = 'active' where id = ${jobId}`;
  } catch (e) {
    console.error('backStage failed:', e.message);
    throw e;
  }
}

export async function addNote(jobId, author, body) {
  if (!hasDb) return;
  try {
    await sql`insert into note (job_id, author, body) values (${jobId}, ${author}, ${body})`;
  } catch (e) {
    console.error('addNote failed:', e.message);
    throw e;
  }
}

export async function addQuote({ jobId, vendor, contact, amount, validUntil, status }) {
  if (!hasDb) return;
  try {
    await sql`
      insert into quote (job_id, vendor, contact, amount, valid_until, status, requested_at)
      values (${jobId}, ${vendor ?? null}, ${contact ?? null}, ${amount ?? null}, ${validUntil ?? null},
              ${status ?? 'requested'}, current_date)`;
  } catch (e) {
    console.error('addQuote failed:', e.message);
    throw e;
  }
}

export async function editQuote({ id, vendor, contact, amount, validUntil, status }) {
  if (!hasDb) return;
  try {
    await sql`
      update quote set vendor = ${vendor ?? null}, contact = ${contact ?? null}, amount = ${amount ?? null},
                        valid_until = ${validUntil ?? null}, status = ${status ?? 'requested'}
      where id = ${id}`;
  } catch (e) {
    console.error('editQuote failed:', e.message);
    throw e;
  }
}
