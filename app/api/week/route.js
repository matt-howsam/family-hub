import { NextResponse } from 'next/server';
import { getAnchor, setAnchor, hasDb } from '@/lib/db';
import { weekLetter, today, TZ } from '@/lib/week';

export const dynamic = 'force-dynamic';

export async function GET() {
  const anchor = await getAnchor();
  return NextResponse.json({ anchor, ...weekLetter(anchor, today(TZ)), persisted: hasDb });
}

export async function POST(req) {
  const { letter, setBy } = await req.json().catch(() => ({}));
  if (letter !== 'A' && letter !== 'B') {
    return NextResponse.json({ error: 'letter must be A or B' }, { status: 400 });
  }
  const anchor = await setAnchor(letter, setBy || 'Matt');
  return NextResponse.json({ anchor, ...weekLetter(anchor, today(TZ)), persisted: hasDb });
}
