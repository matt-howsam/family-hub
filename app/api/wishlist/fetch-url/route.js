import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { getOwner, applyFetchedMetadata, setWishImage } from '@/lib/wishlist';
import { fetchWishMetadata } from '@/lib/wishFetch';

// Comfortably above lib/wishFetch.js's own ~5s internal cap, with headroom
// for the page fetch and the image fetch to each take close to that.
export const maxDuration = 10;

/* Phone/adult-or-child sessions only — never `role = 'display'`, per the
   brief's own fetch-safety rules ("authenticated phone sessions only").
   Ownership of the wish itself is checked the same way every other write
   in this module is. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  if (!session || session.role === 'display') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const owner = await getOwner(body.wishId);
  if (!owner || session.person !== owner.person) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!body.url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  const { title, price, image } = await fetchWishMetadata(body.url);
  await applyFetchedMetadata(body.wishId, { title, price });
  if (image) {
    await setWishImage({ wishId: body.wishId, buffer: image.buffer, contentType: image.contentType, source: 'fetched' });
  }

  return NextResponse.json({ ok: true, title, price, hasImage: Boolean(image) });
}
