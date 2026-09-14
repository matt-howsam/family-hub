import { NextResponse } from 'next/server';
import { pollMailbox } from '@/lib/ingest/imap';

/* Pinged by Vercel Cron (see vercel.json) — Hobby-plan cron is capped at
   once/day, which is plenty for school mail (per docs/DECISIONS.md, unlike
   the conditions refresh which needed roughly hourly). If CRON_SECRET is
   set, only Vercel's own cron invocation (which sends it as a bearer token)
   or a manual call carrying the same secret may trigger a poll. */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await pollMailbox();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ingest] poll failed:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
