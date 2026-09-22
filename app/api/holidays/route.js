import { NextResponse } from 'next/server';
import { addHoliday, editHoliday, deleteHoliday } from '@/lib/holidays';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

/* No fridge exception — same reasoning as the scorecard's write routes.
   Within that, per docs/identity.md's roles table a child can write "her
   own... holiday ideas" and nothing else here: adding an idea (no date) is
   open to any non-display session, but dates, nights, budget, who and the
   major flag, plus editing or deleting anything, are adult-only. Enforced
   here, not the form — a child submitting extra fields just has them
   silently dropped rather than rejected, since that's a more forgiving
   failure than a confusing error on a household-friendly feature. */
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role === 'display') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'add': {
      if (!body.title?.trim()) {
        return NextResponse.json({ error: 'title is required' }, { status: 400 });
      }
      const isAdult = session.role === 'adult';
      try {
        await addHoliday({
          title: body.title.trim(),
          major: isAdult ? body.major : false,
          startsOn: isAdult ? (body.startsOn || null) : null,
          nights: isAdult ? (body.nights ?? null) : null,
          who: isAdult ? (body.who ?? null) : null,
          budget: isAdult ? (body.budget ?? null) : null,
          note: body.note || null,
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'edit': {
      if (session.role !== 'adult') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      if (!body.id || !body.title?.trim()) {
        return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
      }
      try {
        await editHoliday({
          id: body.id, title: body.title.trim(), major: Boolean(body.major),
          startsOn: body.startsOn || null, nights: body.nights ?? null,
          who: body.who ?? null, budget: body.budget ?? null, note: body.note || null,
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'delete': {
      if (session.role !== 'adult') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await deleteHoliday(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
