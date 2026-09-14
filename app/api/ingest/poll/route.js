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
    // imapflow's own error is a generic "Command failed" for any server
    // NO/BAD — the useful detail is on these extra fields it attaches, not
    // the message. Surface them so a credential problem doesn't look
    // identical to a bad IMAP command.
    console.error('[ingest] poll failed:', err.message, err.response, err.responseStatus, err.executedCommand);
    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        responseStatus: err.responseStatus ?? null,
        executedCommand: err.executedCommand ?? null,
        responseText: err.response?.attributes
          ?.filter((a) => a.type === 'TEXT')
          .map((a) => a.value)
          .join(' ') ?? null,
      },
      { status: 500 }
    );
  }
}
