import { NextResponse } from 'next/server';
import { getMonthView, setEntry, setReview, setBaseBudget, addBudgetEvent } from '@/lib/scorecard';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

/* Month-nav reads go through Next's own router (Link + server component),
   same as every other listing page — this GET exists for the entry screen
   to refetch its own month after a write without a full navigation. */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));
  if (!year || !month) return NextResponse.json({ error: 'year and month are required' }, { status: 400 });

  const view = await getMonthView(year, month);
  return NextResponse.json(view);
}

/* The scorecard has no fridge-write exception — unlike a chore tick, there
   is no "the person is standing right there" case for eleven dollar
   figures. And unlike the fridge check alone, this requires role = 'adult'
   specifically: docs/identity.md's roles table gives a child write access
   to only their own goals, assignments and chore ticks — the scorecard
   isn't on that list, for either the weekly numbers or the budget itself. */
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'setEntry': {
      const { year, month, weekNo, categoryKey, amount } = body;
      if (!year || !month || !weekNo || !categoryKey || amount == null) {
        return NextResponse.json({ error: 'year, month, weekNo, categoryKey and amount are required' }, { status: 400 });
      }
      try {
        await setEntry({ year, month, weekNo, categoryKey, amount, enteredBy: session.person });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'setReview': {
      const { year, month, weekNo, win, biggestUnnecessary, oneChange } = body;
      if (!year || !month || !weekNo) {
        return NextResponse.json({ error: 'year, month and weekNo are required' }, { status: 400 });
      }
      try {
        await setReview({ year, month, weekNo, win, biggestUnnecessary, oneChange });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'setBaseBudget': {
      const { categoryKey, amount } = body;
      if (!categoryKey || amount == null) {
        return NextResponse.json({ error: 'categoryKey and amount are required' }, { status: 400 });
      }
      try {
        await setBaseBudget({ categoryKey, amount });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'addBudgetEvent': {
      const { name, year, month, categoryKey, amount, note } = body;
      if (!name || !year || !month || !categoryKey || amount == null) {
        return NextResponse.json({ error: 'name, year, month, categoryKey and amount are required' }, { status: 400 });
      }
      try {
        await addBudgetEvent({ name, year, month, categoryKey, amount, note });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
