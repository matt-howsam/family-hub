import { NextResponse } from 'next/server';
import { setNight, clearNight, fillFromLastWeek, addCard, archiveCard } from '@/lib/mealplanner';
import { getRole } from '@/lib/role';

/* Planning a night is the second write the fridge is allowed to make — both
   display and phone reach 'set'/'clear'/'fill'. The library is phone-only:
   the fridge never shows its controls, and this route refuses the write
   even if something tried to call it directly. */
export async function POST(request) {
  const body = await request.json();
  const role = await getRole();

  switch (body.action) {
    case 'set':
      await setNight(body.night, body.cardId, role === 'display' ? 'display' : 'phone', body.setBy ?? null);
      return NextResponse.json({ ok: true });

    case 'clear':
      await clearNight(body.night);
      return NextResponse.json({ ok: true });

    case 'fill': {
      const filled = await fillFromLastWeek(new Date(`${body.monday}T00:00:00Z`));
      return NextResponse.json({ ok: true, filled });
    }

    case 'addCard':
      if (role === 'display') return NextResponse.json({ error: 'display is read-only' }, { status: 403 });
      await addCard(body.card);
      return NextResponse.json({ ok: true });

    case 'archiveCard':
      if (role === 'display') return NextResponse.json({ error: 'display is read-only' }, { status: 403 });
      await archiveCard(body.id);
      return NextResponse.json({ ok: true });

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
