/**
 * imap.js — Gmail poller. IMAP + App Password, per docs/ingestion.md: one
 * secret, no OAuth expiry. Runs from a Vercel cron via
 * app/api/ingest/poll/route.js.
 *
 * Routing (docs/family-hub-gmail-ingestion-brief.md, correction 1): the `To`
 * header is a first branch only, not a sufficient router on its own — the
 * inbox also carries Apple ID / Google account mail addressed to the Gmail
 * account that is not a subscription. The subscription branch is additionally
 * gated by a sender allowlist; anything else is logged and dropped so the
 * allowlist can be extended deliberately.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { sql, hasDb } from '../db';
import { cleanEmailBody } from './clean';
import { isSeqtaSubject, parseSeqtaMessage } from './seqta';

const SCHOOL_FORWARD_ADDRESS = 'matthowsam@me.com';
const SUBSCRIPTION_ADDRESS = '14snapperave@gmail.com';

/**
 * Confirmed senders for the subscription branch. Extend deliberately, one
 * confirmed sender at a time — see the correction this list exists to fix.
 */
const SUBSCRIPTION_SENDER_ALLOWLIST = [
  /@everi\.com\.au$/i, // What's On Tweed newsletter
];

function toHeaderMatches(toHeader, address) {
  return (toHeader ?? '').toLowerCase().includes(address.toLowerCase());
}

/**
 * @returns {'school' | 'subscription' | null}  null means drop it.
 */
function route({ toHeader, senderEmail }) {
  if (toHeaderMatches(toHeader, SCHOOL_FORWARD_ADDRESS)) return 'school';

  if (toHeaderMatches(toHeader, SUBSCRIPTION_ADDRESS)) {
    const allowed = SUBSCRIPTION_SENDER_ALLOWLIST.some((re) => re.test(senderEmail ?? ''));
    if (!allowed) {
      console.log(`[ingest] dropped subscription sender not on allowlist: ${senderEmail}`);
      return null;
    }
    return 'subscription';
  }

  // Neither address — Apple ID / Google security mail and the like.
  console.log(`[ingest] dropped, no matching To header: ${toHeader}`);
  return null;
}

/**
 * Poll the mailbox once, storing every new message in raw_message and
 * running the deterministic SEQTA parser inline (free, confidence 1.0).
 * Everything else (bulletins, newsletters) is left with processed_at null
 * for the LLM extraction pass to pick up later — see build order step 8.
 *
 * @returns {{ fetched: number, stored: number, seqtaProposed: number }}
 */
export async function pollMailbox() {
  if (!hasDb) throw new Error('no database configured');

  const user = process.env.GMAIL_IMAP_USER;
  const pass = process.env.GMAIL_IMAP_APP_PASSWORD;
  if (!user || !pass) throw new Error('GMAIL_IMAP_USER / GMAIL_IMAP_APP_PASSWORD not set');

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let fetched = 0;
  let stored = 0;
  let seqtaProposed = 0;

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Unseen only — the mailbox is dedicated to this pipeline (plus the
      // Home calendar subscription, per docs/ingestion.md), so "seen" is a
      // safe proxy for "already fetched" alongside the Message-ID dedupe.
      for await (const message of client.fetch(
        { seen: false },
        { source: true, envelope: true }
      )) {
        fetched += 1;
        const parsed = await simpleParser(message.source);

        const messageId = parsed.messageId ?? message.envelope?.messageId;
        if (!messageId) continue; // can't dedupe without one — skip rather than risk a duplicate

        const toHeader = parsed.to?.text ?? '';
        const senderEmail = parsed.from?.value?.[0]?.address ?? null;
        const subject = parsed.subject ?? '';
        const receivedAt = parsed.date ?? new Date();
        const rawBody = parsed.text ?? '';

        const kind = route({ toHeader, senderEmail });
        if (!kind) continue;

        const { text: cleanedBody } = cleanEmailBody(rawBody);
        const source = isSeqtaSubject(subject) ? 'seqta' : kind === 'school' ? 'bulletin' : 'other';

        const inserted = await sql`
          insert into raw_message
            (source, message_id, subject, sender, to_header, received_at, raw_body, cleaned_body)
          values
            (${source}, ${messageId}, ${subject}, ${senderEmail}, ${toHeader}, ${receivedAt},
             ${rawBody}, ${cleanedBody})
          on conflict (message_id) do nothing
          returning id`;

        if (inserted.length === 0) continue; // already had this Message-ID
        stored += 1;
        const rawMessageId = inserted[0].id;

        if (source === 'seqta') {
          const seqta = parseSeqtaMessage({ subject, plaintextBody: rawBody, date: receivedAt, sender: senderEmail });
          if (seqta) {
            await sql`
              insert into proposed_item
                (raw_message_id, kind, persons, title, starts_at, confidence,
                 needs_review, approver_role, source_quote)
              values
                (${rawMessageId}, ${seqta.kind}, ${[seqta.person.toLowerCase()]},
                 ${seqta.action}, ${seqta.recordFrom}, ${seqta.confidence},
                 ${!seqta.displayEligible}, 'adult', ${seqta.narrative})`;
            seqtaProposed += 1;
          }
          await sql`update raw_message set processed_at = now() where id = ${rawMessageId}`;
        }

        await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { fetched, stored, seqtaProposed };
}
