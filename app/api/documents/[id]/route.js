import { NextResponse } from 'next/server';
import { getDocument, deleteDocument } from '@/lib/documents';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

/* No session gate on the read — "the fridge displays that documents exist
   and opens them" (§7.7). Same trust model as everywhere else in the app:
   reads are open to any paired device, writes are the boundary. */
export async function GET(request, { params }) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return new NextResponse(null, { status: 404 });

  return new NextResponse(doc.data, {
    headers: {
      'content-type': doc.contentType,
      'content-disposition': `inline; filename="${doc.filename.replace(/"/g, '')}"`,
      'content-length': String(doc.data.length),
    },
  });
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    await deleteDocument(id);
  } catch {
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
