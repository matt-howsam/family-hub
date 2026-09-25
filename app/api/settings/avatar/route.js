import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { PEOPLE } from '@/lib/people';
import { setAvatarConfig } from '@/lib/avatarIcon';

/* Adults can save anyone's; anyone else can only save their own — same
 * ownership check as app/settings/avatars/[person]/page.jsx. Checked
 * against body.person, not trusted from the client. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  if (!body.person || !PEOPLE[body.person]) return NextResponse.json({ error: 'valid person is required' }, { status: 400 });

  const isAdult = session?.role === 'adult';
  const isSelf = session?.person === body.person;
  if (!isAdult && !isSelf) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!body.cfg) return NextResponse.json({ error: 'cfg is required' }, { status: 400 });

  await setAvatarConfig(body.person, body.cfg);

  return NextResponse.json({ ok: true });
}
