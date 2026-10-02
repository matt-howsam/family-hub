/* ==========================================================================
   Family Hub — chores: a job board + a weekly contribution bonus
   See docs/family-hub-chores-brief.md — supersedes design-brief §7.10.

   A job is offered, never assigned: a child claims it, submits (the tick),
   an adult reviews. Availability is computed at read time, never stored:
   a chore is available when `next_available <= today` and it holds no
   open (claimed/submitted/redo) chore_job. `next_available` advances on
   SUBMIT, not on approval — the clock starts the day the work was done.

   Write gates, enforced in app/api/chores/route.js, not here:
   - claim/submit/unclaim (own claim only): the person themselves, or
     role = 'display' (the fridge) — same exception as todo_item's done_at.
   - claim bonus: same.
   - everything else (library, review, mark done, pay): role = 'adult' only.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { today, TZ, mondayOf } from './week.js';
import { CHILDREN } from './people.js';

const iso = (d) => d.toISOString().slice(0, 10);
const todayStr = () => iso(today(TZ));
const weekStart = () => iso(mondayOf(today(TZ)));

/* A claim nobody ever submitted — "claimed by mistake" aside, this is the
   lapse-back-to-the-board case from docs/family-hub-chores-brief.md's
   "Open" section: no cap on open claims, but a stale one returns to the
   board rather than sitting there forever. Read-time cleanup, not a cron —
   consistent with availability itself being computed at read time. */
const LAPSE_DAYS = 3;

async function clearLapsedClaims() {
  await sql`
    delete from chore_job
    where status = 'claimed' and claimed_at < now() - make_interval(days => ${LAPSE_DAYS})`;
}

const FREQUENCY_DAYS = { weekly: 7, fortnightly: 14, monthly: 30 };

/* ---------- reads ---------- */

/** Jobs open to `person` with no current claim/submission by anyone. */
export async function listAvailableJobs(person) {
  if (!hasDb) return [];
  await clearLapsedClaims();
  const rows = await sql`
    select c.id, c.title, c.icon, c.value_cents as "valueCents"
    from chore c
    where c.archived_at is null
      and c.next_available <= ${todayStr()}
      and (c.eligible is null or ${person} = any(c.eligible))
      and not exists (
        select 1 from chore_job j
        where j.chore_id = c.id and j.status in ('claimed', 'submitted', 'redo')
      )
    order by c.position asc, c.id asc`;
  return rows;
}

/** `person`'s own in-flight claims — claimed (tap to submit), redo (tap to
    resubmit), or submitted (awaiting review, read-only). */
export async function listMyJobs(person) {
  if (!hasDb) return [];
  await clearLapsedClaims();
  const rows = await sql`
    select j.id, j.status, j.value_cents as "valueCents", j.review_note as "reviewNote",
           c.title, c.icon
    from chore_job j
    join chore c on c.id = j.chore_id
    where j.person = ${person} and j.status in ('claimed', 'submitted', 'redo')
    order by j.created_at asc`;
  return rows;
}

/** This week's bonus state for one child — null means open (unclaimed). */
export async function getBonus(person) {
  if (!hasDb) return { status: null, valueCents: 0 };
  const week = weekStart();
  const rows = await sql`
    select status, value_cents as "valueCents" from weekly_bonus
    where person = ${person} and week_start = ${week}`;
  if (rows[0]) return rows[0];
  const setting = await sql`select value_cents as "valueCents" from bonus_setting where id = true`;
  return { status: null, valueCents: setting[0]?.valueCents ?? 1200 };
}

/** This week's earnings (jobs done this week + an approved/claimed bonus)
    and the running owed total (approved, unpaid — any week). Two different
    numbers per the brief's "This week's earnings and owed to me". */
export async function earningsFor(person) {
  if (!hasDb) return { thisWeekCents: 0, owedCents: 0 };
  const week = weekStart();

  const thisWeekJobs = await sql`
    select coalesce(sum(value_cents), 0) as cents from chore_job
    where person = ${person} and done_on >= ${week} and status in ('submitted', 'redo', 'approved')`;
  const thisWeekBonus = await sql`
    select coalesce(sum(value_cents), 0) as cents from weekly_bonus
    where person = ${person} and week_start = ${week} and status in ('claimed', 'approved')`;

  const owedJobs = await sql`
    select coalesce(sum(value_cents), 0) as cents from chore_job
    where person = ${person} and status = 'approved' and paid_at is null`;
  const owedBonus = await sql`
    select coalesce(sum(value_cents), 0) as cents from weekly_bonus
    where person = ${person} and status = 'approved' and paid_at is null`;

  return {
    thisWeekCents: Number(thisWeekJobs[0].cents) + Number(thisWeekBonus[0].cents),
    owedCents: Number(owedJobs[0].cents) + Number(owedBonus[0].cents),
  };
}

/** The full board for one person's personal view — everything
    components/ChoresBoard.jsx needs in one call. */
export async function boardFor(person) {
  const [available, mine, bonus, earnings] = await Promise.all([
    listAvailableJobs(person),
    listMyJobs(person),
    getBonus(person),
    earningsFor(person),
  ]);
  return { available, mine, bonus, earnings };
}

/** The wall's chores card — components/Chores.jsx. Deliberately richer
    than the brief's own suggested "one calm line": Matt asked for counts
    and dollars, both what's sitting open on the board and what each kid's
    actually done this week. Still read-only, still not where a claim or
    tick happens — just a wider glance than the brief's "Later" sketch. */
export async function getChoresDashboardTile() {
  if (!hasDb) return { availableCount: 0, availableCents: 0, kids: CHILDREN.map((person) => ({ person, doneCount: 0, doneCents: 0 })) };
  await clearLapsedClaims();
  const week = weekStart();

  const available = await sql`
    select count(*)::int as count, coalesce(sum(c.value_cents), 0) as cents
    from chore c
    where c.archived_at is null and c.next_available <= ${todayStr()}
      and not exists (
        select 1 from chore_job j where j.chore_id = c.id and j.status in ('claimed', 'submitted', 'redo')
      )`;

  const kids = await Promise.all(CHILDREN.map(async (person) => {
    const rows = await sql`
      select count(*)::int as count, coalesce(sum(value_cents), 0) as cents
      from chore_job
      where person = ${person} and done_on >= ${week} and status in ('submitted', 'redo', 'approved')`;
    return { person, doneCount: rows[0].count, doneCents: Number(rows[0].cents) };
  }));

  return { availableCount: available[0].count, availableCents: Number(available[0].cents), kids };
}

/** Parent library — every chore, active and archived (archived still needs
    to render so its history stays legible), plus whoever currently holds
    an open claim on it, if anyone — drives the "mark done" affordance
    (only offered when nobody's claimed it) and makes an abandoned claim
    visible to an adult who might want to unclaim it manually. */
export async function listLibrary() {
  if (!hasDb) return [];
  await clearLapsedClaims();
  return sql`
    select c.id, c.title, c.icon, c.value_cents as "valueCents", c.frequency, c.eligible,
           c.notes, c.next_available::text as "nextAvailable", c.position, c.archived_at as "archivedAt",
           j.id as "openJobId", j.person as "openPerson", j.status as "openStatus"
    from chore c
    left join chore_job j on j.chore_id = c.id and j.status in ('claimed', 'submitted', 'redo')
    order by (c.archived_at is not null) asc, c.position asc, c.id asc`;
}

/** Parent review queue — submitted jobs and claimed bonuses, batched per
    the brief ("built for the Sunday ritual, not a notification per claim"). */
export async function listReviewQueue() {
  if (!hasDb) return { jobs: [], bonuses: [] };
  const jobs = await sql`
    select j.id, j.person, j.status, j.value_cents as "valueCents", j.submitted_at as "submittedAt",
           j.review_note as "reviewNote", c.title, c.icon
    from chore_job j
    join chore c on c.id = j.chore_id
    where j.status in ('submitted', 'redo')
    order by j.submitted_at asc`;
  const bonuses = await sql`
    select id, person, value_cents as "valueCents", claimed_at as "claimedAt"
    from weekly_bonus
    where status = 'claimed'
    order by claimed_at asc`;
  return { jobs, bonuses };
}

/** Owed/paid per child, plus a flat history — parent phone's ledger. */
export async function owedAndHistory(person) {
  if (!hasDb) return { owedCents: 0, history: [] };
  const owedJobs = await sql`
    select coalesce(sum(value_cents), 0) as cents from chore_job
    where person = ${person} and status = 'approved' and paid_at is null`;
  const owedBonus = await sql`
    select coalesce(sum(value_cents), 0) as cents from weekly_bonus
    where person = ${person} and status = 'approved' and paid_at is null`;

  const jobHistory = await sql`
    select j.id, 'job' as kind, c.title, j.value_cents as "valueCents", j.status,
           j.done_on::text as "doneOn", j.paid_at as "paidAt"
    from chore_job j join chore c on c.id = j.chore_id
    where j.person = ${person} and j.status in ('approved', 'adult_done')
    order by j.done_on desc limit 20`;
  const bonusHistory = await sql`
    select id, 'bonus' as kind, 'Weekly bonus' as title, value_cents as "valueCents", status,
           week_start::text as "doneOn", paid_at as "paidAt"
    from weekly_bonus
    where person = ${person} and status in ('approved', 'declined')
    order by week_start desc limit 20`;

  const history = [...jobHistory, ...bonusHistory].sort((a, b) => (a.doneOn < b.doneOn ? 1 : -1));
  return { owedCents: Number(owedJobs[0].cents) + Number(owedBonus[0].cents), history };
}

/** "A single action to record a payment" (the brief's own words) — pays
    everything currently owed for one child in one go, rather than
    per-item toggling. What ends "how much do I owe you?" is one button,
    not a list of them. */
export async function payAllOwed(person) {
  if (!hasDb) return;
  await sql`update chore_job set paid_at = now() where person = ${person} and status = 'approved' and paid_at is null`;
  await sql`update weekly_bonus set paid_at = now() where person = ${person} and status = 'approved' and paid_at is null`;
}

export async function getBonusSetting() {
  if (!hasDb) return 1200;
  const rows = await sql`select value_cents as "valueCents" from bonus_setting where id = true`;
  return rows[0]?.valueCents ?? 1200;
}

/* ---------- ownership (for write-route checks) ---------- */

export async function getJobOwner(jobId) {
  if (!hasDb) return null;
  const rows = await sql`select person, status from chore_job where id = ${jobId}`;
  return rows[0] ?? null;
}

/* ---------- writes: jobs ---------- */

export async function claimJob(choreId, person, setFrom) {
  if (!hasDb) throw new Error('no database configured');
  await clearLapsedClaims();
  const chore = await sql`select value_cents as "valueCents" from chore where id = ${choreId} and archived_at is null`;
  if (!chore[0]) throw new Error('not found');
  const open = await sql`select 1 from chore_job where chore_id = ${choreId} and status in ('claimed', 'submitted', 'redo')`;
  if (open.length) throw new Error('already claimed');
  await sql`
    insert into chore_job (chore_id, person, status, value_cents, claimed_at, set_from)
    values (${choreId}, ${person}, 'claimed', ${chore[0].valueCents}, now(), ${setFrom})`;
}

/** The tick. Advances the chore's own schedule immediately — see the
    module-level note on why that happens here, not on approval. */
export async function submitJob(jobId, setFrom) {
  if (!hasDb) return;
  const rows = await sql`select chore_id as "choreId" from chore_job where id = ${jobId} and status in ('claimed', 'redo')`;
  const choreId = rows[0]?.choreId;
  if (!choreId) return;
  const today_ = todayStr();
  await sql`update chore_job set status = 'submitted', submitted_at = now(), done_on = ${today_}, set_from = ${setFrom} where id = ${jobId}`;
  await sql`
    update chore set next_available = ${today_}::date + make_interval(days => interval_days)
    where id = ${choreId}`;
}

/** "Claimed by mistake" (self) or a parent correction — only before
    submission; once submitted it's in review, not up for grabs. */
export async function unclaimJob(jobId) {
  if (!hasDb) return;
  await sql`delete from chore_job where id = ${jobId} and status = 'claimed'`;
}

export async function redoJob(jobId, note) {
  if (!hasDb) return;
  await sql`
    update chore_job set status = 'redo', review_note = ${note || null}, reviewed_at = now()
    where id = ${jobId} and status in ('submitted', 'redo')`;
}

export async function approveJob(jobId, reviewedBy) {
  if (!hasDb) return;
  await sql`
    update chore_job set status = 'approved', reviewed_by = ${reviewedBy}, reviewed_at = now()
    where id = ${jobId} and status in ('submitted', 'redo')`;
}

/** No claim, no review, $0 — an adult just did it. Quiet on the fridge:
    nothing here is person-specific to either child's view. */
export async function markJobDone(choreId, adultName) {
  if (!hasDb) return;
  const today_ = todayStr();
  await sql`
    insert into chore_job (chore_id, person, status, value_cents, done_on, reviewed_by, reviewed_at, set_from)
    values (${choreId}, ${adultName}, 'adult_done', 0, ${today_}, ${adultName}, now(), 'phone')`;
  await sql`
    update chore set next_available = ${today_}::date + make_interval(days => interval_days)
    where id = ${choreId}`;
}

/* ---------- writes: weekly bonus ---------- */

export async function claimBonus(person, setFrom) {
  if (!hasDb) return;
  const week = weekStart();
  const setting = await getBonusSetting();
  await sql`
    insert into weekly_bonus (person, week_start, status, value_cents, claimed_at, set_from)
    values (${person}, ${week}, 'claimed', ${setting}, now(), ${setFrom})
    on conflict (person, week_start) do update
      set status = 'claimed', claimed_at = now(), set_from = excluded.set_from
      where weekly_bonus.status = 'not_yet'`;
}

export async function notYetBonus(id) {
  if (!hasDb) return;
  await sql`update weekly_bonus set status = 'not_yet', reviewed_at = now() where id = ${id} and status = 'claimed'`;
}

export async function approveBonus(id, reviewedBy) {
  if (!hasDb) return;
  await sql`
    update weekly_bonus set status = 'approved', reviewed_by = ${reviewedBy}, reviewed_at = now()
    where id = ${id} and status in ('claimed', 'not_yet')`;
}

export async function declineBonus(id, reviewedBy) {
  if (!hasDb) return;
  await sql`
    update weekly_bonus set status = 'declined', reviewed_by = ${reviewedBy}, reviewed_at = now()
    where id = ${id} and status in ('claimed', 'not_yet')`;
}

/* ---------- writes: library ---------- */

export async function createChore({ title, icon, valueCents, frequency, eligible, notes }) {
  if (!hasDb) throw new Error('no database configured');
  const intervalDays = FREQUENCY_DAYS[frequency] ?? 7;
  const next = await sql`select coalesce(max(position), -1) + 1 as next from chore`;
  const rows = await sql`
    insert into chore (title, icon, value_cents, frequency, interval_days, eligible, notes, next_available, position)
    values (${title}, ${icon}, ${valueCents}, ${frequency}, ${intervalDays}, ${eligible || null}, ${notes || null}, ${todayStr()}, ${next[0].next})
    returning id`;
  return rows[0].id;
}

export async function updateChore(id, { title, icon, valueCents, frequency, eligible, notes }) {
  if (!hasDb) return;
  const rows = await sql`select title, icon, value_cents as "valueCents", frequency, eligible, notes from chore where id = ${id}`;
  const current = rows[0];
  if (!current) return;
  const nextFrequency = frequency ?? current.frequency;
  await sql`
    update chore set
      title = ${title ?? current.title},
      icon = ${icon ?? current.icon},
      value_cents = ${valueCents ?? current.valueCents},
      frequency = ${nextFrequency},
      interval_days = ${FREQUENCY_DAYS[nextFrequency] ?? 7},
      eligible = ${eligible !== undefined ? eligible : current.eligible},
      notes = ${notes !== undefined ? notes : current.notes}
    where id = ${id}`;
}

export async function archiveChore(id) {
  if (!hasDb) return;
  await sql`update chore set archived_at = now() where id = ${id}`;
}

export async function restoreChore(id) {
  if (!hasDb) return;
  await sql`update chore set archived_at = null where id = ${id}`;
}

export async function setBonusSetting(cents) {
  if (!hasDb) return;
  await sql`
    insert into bonus_setting (id, value_cents) values (true, ${cents})
    on conflict (id) do update set value_cents = excluded.value_cents`;
}
