import { NextResponse } from 'next/server';
import { addDocument, MAX_UPLOAD_BYTES } from '@/lib/documents';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

/* PDFs and phone photos — HEIC/HEIF included, since that's what an iPhone
   captures natively unless "Most Compatible" is set. Anything else is
   rejected outright rather than stored as an opaque, unopenable blob. */
const ALLOWED_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
]);

/* Adult-only upload — the brief is explicit that the fridge only ever
   displays and opens a document, never uploads one. */
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid form data' }, { status: 400 });

  const file = form.get('file');
  const assetId = form.get('assetId');
  const jobId = form.get('jobId');
  // Optional — "pick file, tap upload" is the common case, and a label
  // nobody typed shouldn't block it. Falls back to the filename itself.
  const label = form.get('label')?.trim() || file?.name || 'Document';

  if (!(file instanceof Blob) || !file.size) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!assetId && !jobId) {
    return NextResponse.json({ error: 'assetId or jobId is required' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_UPLOAD_BYTES }, { status: 413 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const id = await addDocument({
      assetId: assetId ? Number(assetId) : null,
      jobId: jobId ? Number(jobId) : null,
      label,
      filename: file.name || 'document',
      contentType: file.type,
      buffer,
      uploadedBy: session.person,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('document upload failed:', e.message);
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
}
