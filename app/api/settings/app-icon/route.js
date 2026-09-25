import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { setIconConfig, setIconPng } from '@/lib/appIcon';

/* Adult-only, per docs/identity.md's role table — same gate as
 * /settings/devices. Body: { cfg, png } where png is the base64-encoded
 * 1024×1024 master rendered client-side (see AppIconStudio). */
export async function POST(request) {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.cfg) return NextResponse.json({ error: 'cfg is required' }, { status: 400 });

  await setIconConfig(body.cfg);
  if (body.png) await setIconPng(body.png);

  return NextResponse.json({ ok: true });
}
