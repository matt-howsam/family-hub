import { NextResponse } from 'next/server';
import { reprocessPending } from '@/lib/ingest/imap';

/* Manual retry for raw_message rows a poll stored but never finished
   extracting — see lib/ingest/imap.js#reprocessPending. Same optional
   secret gate as /api/ingest/poll, since this calls the Anthropic API and
   writes to the DB same as a real poll does. */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await reprocessPending();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ingest] reprocess failed:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
