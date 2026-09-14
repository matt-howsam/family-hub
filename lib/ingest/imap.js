/**
 * imap.js — Gmail poller. IMAP + App Password, per docs/ingestion.md: one
 * secret, no OAuth expiry. Runs from a Vercel cron via
 * app/api/ingest/poll/route.js.
 *
 * Routing — corrected against the first real poll (14 Sep 2026) past what
 * docs/ingestion.md and the gmail-ingestion-brief assumed. Both docs expect
 * the `To` header to distinguish forwarded school mail (→ matthowsam@me.com)
 * from a direct subscription (→ the Gmail address itself) — that assumed an
 * iCloud auto-forward rule preserving the original To:. What's actually
 * arriving is Matt manually hitting Forward in Mail, which means the To: on
 * every message in this mailbox is the mailbox's own address, full stop —
 * the forward carries no header signal at all. The real signal is the
 * sender: a forward's From is the forwarder (matthowsam@me.com), not the
 * original school address. Routed on that first; the To-header check stays
 * as a fallback for if a real auto-forward rule is ever added on top.
 *
 * Confirmed with Matt (14 Sep 2026): three paths land mail in this
 * mailbox — (1) iCloud mail rules now auto-forward school mail, active
 * going forward; (2) a seed batch he forwarded manually before setting
 * those rules up, and may forward more of by hand; (3) newsletters
 * subscribed directly with the Gmail address. (1) and (2) both need
 * routing to 'school', but an iCloud rule's "Forward" action may or may
 * not preserve the original From/To the way a true SMTP redirect does —
 * unconfirmed, no rule-forwarded example seen yet. Both branches below
 * cover either shape (sender-match for a manual-style forward, To-header
 * fallback for a header-preserving redirect); revisit once real
 * rule-forwarded mail arrives and shows which one it actually is.
 *
 * Subscriptions are still gated by a sender allowlist; anything matching
 * neither is dropped. Every dropped message comes back in the `dropped`
 * list (not just logged) so a poll's result is enough to decide whether to
 * extend either list, with no need to dig through Vercel logs.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { sql, hasDb } from '../db';
import { cleanEmailBody } from './clean';
import { isSeqtaSubject, parseSeqtaMessage } from './seqta';

const SCHOOL_FORWARD_ADDRESS = 'matthowsam@me.com';
const SUBSCRIPTION_ADDRESS = '14snapperave@gmail.com';

/**
 * Family members trusted to manually forward school mail into this mailbox
 * — the real routing signal, per the correction above. Renée doesn't
 * forward mail as of 14 Sep 2026, but her address is listed pre-emptively
 * so nothing she sends is silently dropped the day she starts.
 */
const FORWARDING_SENDERS = ['matthowsam@me.com', 'reneehowsam@me.com'];

/**
 * Confirmed senders for the subscription branch. Extend deliberately, one
 * confirmed sender at a time — see the correction this list exists to fix.
 */
const SUBSCRIPTION_SENDER_ALLOWLIST = [
  /@everi\.com\.au$/i,                          // What's On Tweed newsletter
  /@visitnsw\.destinationnsw\.com\.au$/i,        // Destination NSW / Somewhere New
];

function toHeaderMatches(toHeader, address) {
  return (toHeader ?? '').toLowerCase().includes(address.toLowerCase());
}

/**
 * @returns {{ kind: 'school' | 'subscription' } | { kind: null, reason: string }}
 */
function route({ toHeader, senderEmail }) {
  const sender = (senderEmail ?? '').toLowerCase();

  if (FORWARDING_SENDERS.includes(sender)) return { kind: 'school' };

  // Fallback for a genuine auto-forward rule, which (unlike a manual Fwd:)
  // preserves the original To: rather than replacing it with this mailbox's
  // own address.
  if (toHeaderMatches(toHeader, SCHOOL_FORWARD_ADDRESS)) return { kind: 'school' };

  if (toHeaderMatches(toHeader, SUBSCRIPTION_ADDRESS)) {
    const allowed = SUBSCRIPTION_SENDER_ALLOWLIST.some((re) => re.test(sender));
    if (!allowed) return { kind: null, reason: `subscription sender not on allowlist: ${senderEmail}` };
    return { kind: 'subscription' };
  }

  return { kind: null, reason: `no matching To header: ${toHeader}` };
}

/**
 * Poll the mailbox once, storing every new message in raw_message and
 * running the deterministic SEQTA parser inline (free, confidence 1.0).
 * Everything else (bulletins, newsletters) is left with processed_at null
 * for the LLM extraction pass to pick up later — see build order step 8.
 *
 * Every fetched message is marked \Seen exactly once, win or drop or
 * duplicate — otherwise a dropped message (Apple ID mail, an unlisted
 * sender) would be re-fetched and re-evaluated on every future poll forever,
 * since {seen: false} is the only thing telling this apart from a real
 * "nothing new" run.
 *
 * @returns {{ fetched: number, stored: number, seqtaProposed: number, dropped: object[] }}
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
  const dropped = [];
  const seenUids = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Unseen only, for IMAP fetch cost — but only a message that gets
      // fully STORED is marked seen below. A dropped message is left
      // unseen on purpose: routing and the sender allowlist are both going
      // to be corrected as real mail exposes their gaps (as the first real
      // poll already did once), and re-evaluating a small, steady set of
      // known-dropped mail each run is cheap — losing a message to a
      // since-fixed rule, with no way back short of hand-editing Gmail's
      // read state, is not a trade worth making for that saving.
      for await (const message of client.fetch(
        { seen: false },
        { source: true, envelope: true }
      )) {
        fetched += 1;
        const parsed = await simpleParser(message.source);

        const messageId = parsed.messageId ?? message.envelope?.messageId;
        const toHeader = parsed.to?.text ?? '';
        const senderEmail = parsed.from?.value?.[0]?.address ?? null;
        const subject = parsed.subject ?? '';
        const receivedAt = parsed.date ?? new Date();
        const rawBody = parsed.text ?? '';

        if (!messageId) {
          // Can't dedupe without one — skip rather than risk a duplicate.
          // Still marked seen: unlike a routing decision, a missing
          // Message-ID isn't something a future code change can fix, so
          // there's nothing to gain by re-evaluating it forever.
          dropped.push({ subject, sender: senderEmail, reason: 'no Message-ID' });
          seenUids.push(message.uid);
          continue;
        }

        const { kind, reason } = route({ toHeader, senderEmail });
        if (!kind) {
          // Left unseen — see the comment above the loop.
          dropped.push({ subject, sender: senderEmail, toHeader, reason });
          continue;
        }

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

        if (inserted.length === 0) {
          seenUids.push(message.uid); // already had this Message-ID
          continue;
        }
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

        seenUids.push(message.uid);
      }

      if (seenUids.length > 0) {
        await client.messageFlagsAdd(seenUids, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { fetched, stored, seqtaProposed, dropped };
}
