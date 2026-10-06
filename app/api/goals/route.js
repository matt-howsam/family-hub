import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import {
  getMeta, countActive, listActive, MAX_ACTIVE,
  createGoal, updateGoal, promote, demote, completeGoal, release, unrelease,
  makeAim, setAimLink,
} from '@/lib/goals';

const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 });
const badRequest = (error, extra) => NextResponse.json({ error, ...extra }, { status: 400 });
const ok = (extra) => NextResponse.json({ ok: true, ...extra });

/* Ownership is the only write gate — see docs/family-hub-goals-brief.md.
   `session.person === person`, no adult override, and — unlike todo_item
   and chore_job — no `role = 'display'` exception either: "Matt cannot
   write Rose's goals," full stop. Checked here, never trusted from the UI. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'create': {
      if (!session || session.person !== body.person) return forbidden();
      if (!body.title?.trim()) return badRequest('title is required');
      const kind = body.kind === 'aim' ? 'aim' : 'goal';
      if (kind === 'goal' && !body.doneWhen?.trim()) return badRequest('a finish line is required');

      if (kind === 'goal') {
        const n = await countActive(body.person);
        if (n >= MAX_ACTIVE) {
          const active = await listActive(body.person);
          return badRequest('cap', { active });
        }
      }
      const id = await createGoal({ ...body, title: body.title.trim(), kind });
      return ok({ id });
    }

    case 'update': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      await updateGoal(body.id, body);
      return ok();
    }

    case 'promote': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();

      if (body.demoteId) {
        const demoteMeta = await getMeta(body.demoteId);
        if (!demoteMeta || demoteMeta.person !== session.person) return forbidden();
        await demote(body.demoteId);
      } else {
        const n = await countActive(session.person);
        if (n >= MAX_ACTIVE) {
          const active = await listActive(session.person);
          return badRequest('cap', { active });
        }
      }
      await promote(body.id);
      return ok();
    }

    case 'demote': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      await demote(body.id);
      return ok();
    }

    case 'complete': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      await completeGoal(body.id, body.reflection);
      return ok();
    }

    case 'release': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      const from = await release(body.id, body.note);
      return ok({ from });
    }

    case 'unrelease': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      if (!['active', 'someday'].includes(body.state)) return badRequest('invalid state');
      await unrelease(body.id, body.state);
      return ok();
    }

    case 'makeAim': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      await makeAim(body.id);
      return ok();
    }

    case 'setAim': {
      const meta = await getMeta(body.id);
      if (!meta || !session || session.person !== meta.person) return forbidden();
      if (body.aimId) {
        const aimMeta = await getMeta(body.aimId);
        if (!aimMeta || aimMeta.person !== session.person || aimMeta.kind !== 'aim') {
          return badRequest('not a valid aim');
        }
      } else if (!body.newAimTitle?.trim()) {
        return badRequest('aimId or newAimTitle is required');
      }
      const aimId = await setAimLink(body.id, {
        person: session.person, aimId: body.aimId, newAimTitle: body.newAimTitle?.trim(),
      });
      return ok({ aimId });
    }

    default:
      return badRequest('unknown action');
  }
}
