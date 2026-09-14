import { NextResponse } from 'next/server';
import { getSession, listDevices, revokeDevice } from '@/lib/identity';

/* Device management — adults only, per docs/identity.md's role table. */
export async function GET() {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ devices: await listDevices() });
}

export async function POST(request) {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await revokeDevice(body.id);
  return NextResponse.json({ ok: true });
}
