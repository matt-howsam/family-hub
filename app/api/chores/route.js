import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { CHILDREN } from '@/lib/people';
import {
  claimJob, submitJob, unclaimJob, getJobOwner,
  getBonus, claimBonus,
  redoJob, approveJob, markJobDone, payAllOwed,
  notYetBonus, approveBonus, declineBonus,
  createChore, updateChore, archiveChore, restoreChore, setBonusSetting,
} from '@/lib/chores';

const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 });
const badRequest = (error) => NextResponse.json({ error }, { status: 400 });
const ok = (extra) => NextResponse.json({ ok: true, ...extra });

/* `role = 'display'` (the fridge) may claim, submit, unclaim and claim the
 * bonus — identical exception to todo_item's done_at, reused rather than
 * rebuilt (docs/family-hub-chores-brief.md's "Validate before building").
 * Everything else — review, mark done, pay, the library, the bonus
 * amount — is role = 'adult' only, rejected at the route per the brief's
 * own acceptance checks, not just hidden in the UI. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));
  const isAdult = session?.role === 'adult';
  const isDisplay = session?.role === 'display';

  switch (body.action) {
    case 'claimJob': {
      if (!body.person || !CHILDREN.includes(body.person)) return badRequest('valid child person is required');
      const isSelf = session && session.person === body.person;
      if (!isDisplay && !isSelf) return forbidden();
      try {
        await claimJob(body.choreId, body.person, isDisplay ? 'display' : 'phone');
      } catch (e) {
        return badRequest(e.message);
      }
      return ok();
    }

    case 'submitJob': {
      const job = await getJobOwner(body.id);
      if (!job) return badRequest('not found');
      const isSelf = session && session.person === job.person;
      if (!isDisplay && !isSelf) return forbidden();
      await submitJob(body.id, isDisplay ? 'display' : 'phone');
      return ok();
    }

    case 'unclaimJob': {
      const job = await getJobOwner(body.id);
      if (!job) return badRequest('not found');
      const isSelf = session && session.person === job.person;
      if (!isAdult && !isDisplay && !isSelf) return forbidden();
      await unclaimJob(body.id);
      return ok();
    }

    case 'claimBonus': {
      if (!body.person || !CHILDREN.includes(body.person)) return badRequest('valid child person is required');
      const isSelf = session && session.person === body.person;
      if (!isDisplay && !isSelf) return forbidden();
      const current = await getBonus(body.person);
      if (current.status && current.status !== 'not_yet') return badRequest('already claimed this week');
      await claimBonus(body.person, isDisplay ? 'display' : 'phone');
      return ok();
    }

    // ---- adult only, from here down ----

    case 'redoJob': {
      if (!isAdult) return forbidden();
      await redoJob(body.id, body.note);
      return ok();
    }

    case 'approveJob': {
      if (!isAdult) return forbidden();
      await approveJob(body.id, session.person || session.label || 'adult');
      return ok();
    }

    case 'markJobDone': {
      if (!isAdult) return forbidden();
      if (!body.choreId) return badRequest('choreId is required');
      await markJobDone(body.choreId, session.person || session.label || 'adult');
      return ok();
    }

    case 'notYetBonus': {
      if (!isAdult) return forbidden();
      await notYetBonus(body.id);
      return ok();
    }

    case 'approveBonus': {
      if (!isAdult) return forbidden();
      await approveBonus(body.id, session.person || session.label || 'adult');
      return ok();
    }

    case 'declineBonus': {
      if (!isAdult) return forbidden();
      await declineBonus(body.id, session.person || session.label || 'adult');
      return ok();
    }

    case 'payAllOwed': {
      if (!isAdult) return forbidden();
      if (!body.person || !CHILDREN.includes(body.person)) return badRequest('valid child person is required');
      await payAllOwed(body.person);
      return ok();
    }

    case 'createChore': {
      if (!isAdult) return forbidden();
      if (!body.title?.trim()) return badRequest('title is required');
      if (!body.frequency) return badRequest('frequency is required');
      const id = await createChore({
        title: body.title.trim(), icon: body.icon || 'Sparkle', valueCents: body.valueCents || 0,
        frequency: body.frequency, eligible: body.eligible, notes: body.notes,
      });
      return ok({ id });
    }

    case 'updateChore': {
      if (!isAdult) return forbidden();
      await updateChore(body.id, {
        title: body.title?.trim(), icon: body.icon, valueCents: body.valueCents,
        frequency: body.frequency, eligible: body.eligible, notes: body.notes,
      });
      return ok();
    }

    case 'archiveChore': {
      if (!isAdult) return forbidden();
      await archiveChore(body.id);
      return ok();
    }

    case 'restoreChore': {
      if (!isAdult) return forbidden();
      await restoreChore(body.id);
      return ok();
    }

    case 'setBonusSetting': {
      if (!isAdult) return forbidden();
      if (!Number.isFinite(body.valueCents)) return badRequest('valueCents is required');
      await setBonusSetting(body.valueCents);
      return ok();
    }

    default:
      return badRequest('unknown action');
  }
}
