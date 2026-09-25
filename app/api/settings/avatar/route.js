import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { PEOPLE } from '@/lib/people';
import { setAvatarConfig } from '@/lib/avatarIcon';

/* Adult-only, per docs/identity.md's role table — same gate as
 * /settings/devices and /settings/app-icon. */
export async function POST(request) {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.person || !PEOPLE[body.person]) return NextResponse.json({ error: 'valid person is required' }, { status: 400 });
  if (!body.cfg) return NextResponse.json({ error: 'cfg is required' }, { status: 400 });

  await setAvatarConfig(body.person, body.cfg);

  return NextResponse.json({ ok: true });
}
