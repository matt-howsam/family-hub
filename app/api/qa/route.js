import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { askSchoolMail } from '@/lib/qa';

/* Adults only, checked before any retrieval runs — see docs/identity.md's
   Q&A gating. The index carries pastoral_record content unfiltered, so this
   check is the entire boundary between that content and a child's phone or
   the fridge. Don't relax it without reintroducing an index-level
   exclusion to back it up. */
export async function POST(request) {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  try {
    const result = await askSchoolMail(body.question.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error('[qa] failed:', err.message);
    return NextResponse.json({ error: 'Something went wrong answering that.' }, { status: 500 });
  }
}
