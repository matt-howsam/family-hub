/* ==========================================================================
   Family Hub — the review queue
   See docs/ingestion.md and docs/family-hub-gmail-ingestion-brief.md.

   Invariant 1: nothing reaches the fridge unreviewed. This module is the
   "reached" half of that — turning an approved proposed_item into either an
   `item` row (the general What's On / fridge store) or a `todo_item` row
   (when it's a child's own assessment, per docs/family-hub-todo-brief.md —
   confirming there is a copy-and-link, not a special case).

   Scope note: this only handles proposals that already carry
   `needs_review = true`. A proposal SEQTA marks auto-publish-eligible
   (`needs_review = false`) never appears here — promoting those into `item`
   automatically is the still-pending What's On merge (ingestion build order
   step 9), not this module.
   ========================================================================== */

import { sql, hasDb } from './db.js';
import { createTodo } from './todo.js';

/** The caller's own queue — adults share one household-wide queue; a child
    sees only proposals naming them, per "the child confirms or discards"
    (docs/family-hub-todo-brief.md). Within each category, shakiest
    proposals first, per docs/ingestion.md: "sort the review queue by
    confidence ascending." Categorised by the raw_message it came from —
    'seqta'/'bulletin' (school-forwarded mail) sort as 'school', 'other'
    (the open subscription inbox — community newsletters, markets,
    festivals) sorts as 'community' and always after 'school', so opening
    that inbox up to any sender (lib/ingest/imap.js) can't bury a school
    item under newsletter volume. */
export async function listQueue(session) {
  if (!hasDb || !session) return [];
  if (session.role !== 'adult' && session.role !== 'child') return []; // 'display': no review UI on the fridge, ever

  // A DB error here (most likely: schema.sql not yet re-applied for a
  // migration this module needs, e.g. the reviewed_at/reviewed_by/decision
  // columns) degrades to an empty queue rather than taking the whole page
  // down — same resilience pattern as lib/db.js#getAnchor and
  // lib/whatson.js elsewhere in this codebase.
  try {
    if (session.role === 'adult') {
      return await sql`
        select pi.id, pi.raw_message_id as "rawMessageId", pi.kind, pi.persons, pi.title,
               pi.starts_at::text as "startsAt", pi.ends_at::text as "endsAt", pi.all_day as "allDay",
               pi.time_zone as "timeZone", pi.location, pi.uniform, pi.action_required as "actionRequired",
               pi.source_quote as "sourceQuote", pi.source_url as "sourceUrl", pi.confidence,
               pi.duplicate_of as "duplicateOf", pi.approver_role as "approverRole", pi.created_at as "createdAt",
               case when rm.source = 'other' then 'community' else 'school' end as category
        from proposed_item pi
        join raw_message rm on rm.id = pi.raw_message_id
        where pi.needs_review = true and pi.approver_role = 'adult' and pi.reviewed_at is null
        order by (rm.source = 'other') asc, pi.confidence asc, pi.created_at asc`;
    }

    return await sql`
      select pi.id, pi.raw_message_id as "rawMessageId", pi.kind, pi.persons, pi.title,
             pi.starts_at::text as "startsAt", pi.ends_at::text as "endsAt", pi.all_day as "allDay",
             pi.time_zone as "timeZone", pi.location, pi.uniform, pi.action_required as "actionRequired",
             pi.source_quote as "sourceQuote", pi.source_url as "sourceUrl", pi.confidence,
             pi.duplicate_of as "duplicateOf", pi.approver_role as "approverRole", pi.created_at as "createdAt",
             case when rm.source = 'other' then 'community' else 'school' end as category
      from proposed_item pi
      join raw_message rm on rm.id = pi.raw_message_id
      where pi.needs_review = true and pi.approver_role = 'child' and pi.reviewed_at is null
        and ${session.person} = any(pi.persons)
      order by (rm.source = 'other') asc, pi.confidence asc, pi.created_at asc`;
  } catch (e) {
    console.error('listQueue failed:', e.message);
    return [];
  }
}

async function getProposal(id) {
  const rows = await sql`
    select id, kind, persons, title, starts_at, ends_at, all_day, time_zone, location,
           uniform, action_required, source_quote, source_url, approver_role, reviewed_at
    from proposed_item where id = ${id}`;
  return rows[0] ?? null;
}

/** Who may act on a given proposal — checked by the route before either
    function below runs anything. No adult override on a child's own queue,
    same rule as everywhere else in this product. */
export function canReview(session, proposal) {
  if (!session || !proposal) return false;
  if (proposal.approver_role === 'adult') return session.role === 'adult';
  if (proposal.approver_role === 'child') {
    return session.role === 'child' && (proposal.persons ?? []).includes(session.person);
  }
  return false;
}

export { getProposal };

export async function approveItem(id, reviewedBy) {
  if (!hasDb) throw new Error('no database configured');
  const p = await getProposal(id);
  if (!p || p.reviewed_at) return { error: 'not found or already reviewed' };

  if (p.kind === 'assessment' && p.approver_role === 'child') {
    // Hers to confirm, per docs/family-hub-todo-brief.md — lands in her own
    // list, not the general item store. `subject` isn't derivable from a
    // proposed_item row; she (or whoever proposed it) sets it there.
    await createTodo({
      person: p.persons?.[0] ?? reviewedBy,
      title: p.title,
      description: p.source_quote,
      due: p.starts_at ? new Date(p.starts_at).toISOString().slice(0, 10) : null,
      type: 'assessment',
      proposedItemId: p.id,
    });
  } else {
    await sql`
      insert into item
        (proposed_item_id, kind, persons, title, starts_at, ends_at, all_day, time_zone,
         location, uniform, action_required, source_quote, source_url, display_eligible, approved_by)
      values
        (${p.id}, ${p.kind}, ${p.persons}, ${p.title}, ${p.starts_at}, ${p.ends_at}, ${p.all_day},
         ${p.time_zone}, ${p.location}, ${p.uniform}, ${p.action_required}, ${p.source_quote},
         ${p.source_url}, true, ${reviewedBy})`;
  }

  await sql`
    update proposed_item
    set needs_review = false, reviewed_at = now(), reviewed_by = ${reviewedBy}, decision = 'approved'
    where id = ${id}`;

  return { ok: true };
}

/** Discarding leaves the proposed_item row in place — decision = 'discarded'
    — rather than deleting it. Same reasoning as revoked_at on person_device
    and done_at on todo_item: a filtered-out row, not an erased one, is what
    keeps an audit trail an audit trail. "Discardable without trace" (the
    todo brief's acceptance check) means it stops showing up, not that the
    fact of it existing is destroyed. */
export async function discardItem(id, reviewedBy) {
  if (!hasDb) throw new Error('no database configured');
  await sql`
    update proposed_item
    set needs_review = false, reviewed_at = now(), reviewed_by = ${reviewedBy}, decision = 'discarded'
    where id = ${id} and reviewed_at is null`;
  return { ok: true };
}
