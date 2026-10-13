import { NextResponse } from 'next/server';
import { getWishImage } from '@/lib/wishlist';

// Open read, no session gate — same precedent as app/api/documents/[id]/route.js.
export async function GET(request, { params }) {
  const { wishId } = await params;
  const image = await getWishImage(wishId);
  if (!image) return new NextResponse(null, { status: 404 });

  return new NextResponse(image.data, {
    headers: {
      'content-type': image.contentType,
      'content-length': String(image.data.length),
    },
  });
}
