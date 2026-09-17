import { NextResponse } from 'next/server';
import { sql, hasDb } from '@/lib/db';
import { extractItems } from '@/lib/ingest/bulletin';
import { getSession } from '@/lib/identity';

/* Read-only diagnostics for the ingestion pipeline — not part of any brief,
   built purely to answer "why didn't this email produce anything" without
   guessing. Exposes raw email content (a safety notice, anything else that
   arrives), so it's gated exactly like Q&A: adults only, checked before any
   retrieval runs — this is not a public debug endpoint. Two modes:
   - ?q=<search>   lists matching raw_message rows with their linked
     proposed_item rows (or the lack of any), so it's visible whether
     extraction produced nothing, or produced something that's just not in
     the review queue (needs_review = false).
   - ?id=<id>&dryRun=1   re-runs extraction against that exact stored body
     WITHOUT writing anything, returning the model's raw output — the
     fastest way to see whether the model saw the content and chose not to
     extract it, versus something failing before that. */
export async function GET(request) {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!hasDb) return NextResponse.json({ error: 'no database configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const dryRun = searchParams.get('dryRun') === '1';
  const q = searchParams.get('q');

  try {
    if (id && dryRun) {
      const rows = await sql`
        select id, subject, sender, received_at, cleaned_body
        from raw_message where id = ${id}`;
      const row = rows[0];
      if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

      const extracted = await extractItems({
        body: row.cleaned_body, subject: row.subject, receivedAt: row.received_at, sender: row.sender,
      });
      return NextResponse.json({
        subject: row.subject,
        cleanedBodyLength: row.cleaned_body?.length ?? 0,
        cleanedBodyPreview: row.cleaned_body?.slice(0, 500) ?? null,
        extracted,
      });
    }

    if (id) {
      const rows = await sql`
        select id, source, subject, sender, received_at, processed_at,
               length(cleaned_body) as "cleanedBodyLength"
        from raw_message where id = ${id}`;
      const proposed = await sql`
        select id, kind, persons, title, starts_at, confidence, needs_review as "needsReview",
               decision, duplicate_of as "duplicateOf"
        from proposed_item where raw_message_id = ${id}`;
      return NextResponse.json({ message: rows[0] ?? null, proposedItems: proposed });
    }

    if (q) {
      const messages = await sql`
        select id, source, subject, sender, received_at, processed_at
        from raw_message where subject ilike ${'%' + q + '%'}
        order by received_at desc`;
      const withProposed = await Promise.all(
        messages.map(async (m) => {
          const proposed = await sql`
            select id, kind, title, confidence, needs_review as "needsReview", decision
            from proposed_item where raw_message_id = ${m.id}`;
          return { ...m, proposedItems: proposed };
        })
      );
      return NextResponse.json({ messages: withProposed });
    }

    return NextResponse.json({ error: 'pass ?q=<search>, ?id=<id>, or ?id=<id>&dryRun=1' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
