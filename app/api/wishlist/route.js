import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import {
  getOwner, getCover, createWish, updateWish, removeWish, unremoveWish,
  moveUp, moveDown, setSavingFor, unsetSavingFor, setMyCount, setDeal,
  markGot, markGiven, coverWish, uncoverWish,
} from '@/lib/wishlist';

const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 });
const badRequest = (error) => NextResponse.json({ error }, { status: 400 });
const ok = (extra) => NextResponse.json({ ok: true, ...extra });

/* Ownership is the write gate for everything except covering — see
   docs/family-hub-wishlist-brief.md. `session.person === wish.person`, no
   adult override, and — same as Goals — no `role = 'display'` exception
   anywhere: the fridge can't write to this module at all. Covering is the
   mirror image: anyone *except* the owner, checked here, never trusted
   from the UI, since the owner must never be able to see — let alone
   write — their own item's cover. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'create': {
      if (!session || session.role === 'display') return forbidden();
      if (!body.title?.trim()) return badRequest('title is required');
      const id = await createWish({ person: session.person, title: body.title.trim(), url: body.url, note: body.note });
      return ok({ id });
    }

    case 'update': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await updateWish(body.id, body);
      return ok();
    }

    case 'remove': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await removeWish(body.id);
      return ok();
    }

    case 'unremove': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await unremoveWish(body.id);
      return ok();
    }

    case 'moveUp': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await moveUp(body.id);
      return ok();
    }

    case 'moveDown': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await moveDown(body.id);
      return ok();
    }

    case 'setSavingFor': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await setSavingFor(body.id, { person: owner.person, horizon: body.horizon, by: body.by });
      return ok();
    }

    case 'unsetSavingFor': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await unsetSavingFor(body.id);
      return ok();
    }

    case 'setMyCount': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await setMyCount(body.id, body.amount);
      return ok();
    }

    case 'setDeal': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await setDeal(body.id, body.text);
      return ok();
    }

    case 'markGot': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner.person) return forbidden();
      await markGot(body.id);
      return ok();
    }

    case 'markGiven': {
      // The coverer's own "I gave it" — not the owner.
      const owner = await getOwner(body.id);
      if (!owner || !session || session.role === 'display' || session.person === owner.person) return forbidden();
      const cover = await getCover(body.id);
      if (!cover || cover.coveredBy !== session.person) return forbidden();
      await markGiven(body.id, session.person);
      return ok();
    }

    case 'cover': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.role === 'display' || session.person === owner.person) return forbidden();
      try {
        await coverWish(body.id, session.person, body.note);
      } catch (e) {
        return badRequest('already covered');
      }
      return ok();
    }

    case 'uncover': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person === owner.person) return forbidden();
      const cover = await getCover(body.id);
      if (!cover || cover.coveredBy !== session.person) return forbidden();
      await uncoverWish(body.id, session.person);
      return ok();
    }

    default:
      return badRequest('unknown action');
  }
}
