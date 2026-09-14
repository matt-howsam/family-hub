import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { getOwner, createTodo, updateTodo, deleteTodo, setDone } from '@/lib/todo';

/* Ownership is the only write gate — see docs/family-hub-todo-brief.md.
   `session.person === person`, no adult override, checked here rather than
   trusted from the UI. The one exception: `role = 'display'` may toggle
   `done_at` only, on any item, from a personal view — nothing else, from
   nowhere else. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'create': {
      if (!session || session.person !== body.person) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      if (!body.title || !body.type) {
        return NextResponse.json({ error: 'title and type are required' }, { status: 400 });
      }
      const id = await createTodo(body);
      return NextResponse.json({ ok: true, id });
    }

    case 'update': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await updateTodo(body.id, body);
      return NextResponse.json({ ok: true });
    }

    case 'delete': {
      const owner = await getOwner(body.id);
      if (!owner || !session || session.person !== owner) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await deleteTodo(body.id);
      return NextResponse.json({ ok: true });
    }

    case 'toggle': {
      const owner = await getOwner(body.id);
      if (!owner) return NextResponse.json({ error: 'not found' }, { status: 404 });

      const isDisplay = session?.role === 'display';
      const isOwner = session && session.person === owner;
      if (!isDisplay && !isOwner) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      await setDone(body.id, Boolean(body.done), isDisplay ? 'display' : 'phone');
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
