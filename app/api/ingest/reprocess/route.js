import { NextResponse } from 'next/server';
import { reprocessPending } from '@/lib/ingest/imap';

// See app/api/ingest/poll/route.js for why this needs raising — this route
// processes pending messages sequentially, so it's actually the more
// exposed of the two if a backlog ever builds up. 60s is the Hobby-plan
// ceiling; a timeout mid-run just means fewer got done (each is marked
// processed as it completes), not corruption — call again to continue.
export const maxDuration = 60;

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
