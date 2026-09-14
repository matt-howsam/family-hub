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
import { isSeqtaSubject, parseSeqtaMessage, zonedToUtc } from './seqta';
import { extractItems, dedupeAgainstCalendar } from './bulletin';
import { getEvents } from '../homecal';

const SCHOOL_FORWARD_ADDRESS = 'matthowsam@me.com';
const SUBSCRIPTION_ADDRESS = '14snapperave@gmail.com';
const SCHOOL_TZ = 'Australia/Sydney';

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

const PERSON_ID = { rose: 'rose', tom: 'tom', matt: 'matt', renée: 'renee', renee: 'renee', household: 'household' };

/** bulletin.js's `person` is a display name, or a comma-separated list for
    the one case a single item names more than one — see the year-range and
    parent-action corrections in lib/ingest/bulletin.js's prompt. Maps to
    the lowercase ids proposed_item.persons and lib/people.js both use. */
function mapPersons(personField) {
  if (!personField) return ['household'];
  const ids = personField
    .split(',')
    .map((s) => PERSON_ID[s.trim().toLowerCase()])
    .filter(Boolean);
  return ids.length ? ids : ['household'];
}

/** bulletin.js's date/start_time strings, in the school's own zone, to a
    UTC instant — zonedToUtc is seqta.js's DST-verified implementation,
    reused rather than duplicated. Null date (a kind: 'action' item) stays
    null; a date with no time is treated as that day's midnight in zone,
    which is enough for lib/whatson.js to recover the correct calendar date
    even though it's never rendered as a clock time. */
function combineDateTime(dateStr, timeStr, tz = SCHOOL_TZ) {
  if (!dateStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = (timeStr ?? '00:00').split(':').map(Number);
  return zonedToUtc(y, mo, d, h, mi, 0, tz);
}

/** dedupeAgainstCalendar() was written against a Google-Calendar-API-shaped
    event ({summary, start: {dateTime|date}}) — homecal.js's own real event
    shape is entirely different ({label, date, at, allDay, ...}). Without
    this adapter every `ev.summary` read would be undefined and nothing
    would ever dedupe. */
function toDedupeShape(homecalEvents) {
  return homecalEvents.map((e) => ({
    summary: e.label,
    start: e.allDay ? { date: e.date } : { dateTime: new Date(e.at).toISOString() },
  }));
}

/** Per docs/ingestion.md's "who approves what": an assessment naming
    exactly one child routes to that child; everything else — household
    items, parent actions, multi-person items — routes to adults. */
function approverRoleFor(kind, persons) {
  const child = persons.length === 1 && ['rose', 'tom'].includes(persons[0]);
  return kind === 'assessment' && child ? 'child' : 'adult';
}

/**
 * The LLM extraction pass for a bulletin/newsletter raw_message — everything
 * SEQTA's regex parser can't handle. Dedupes against the live Home calendar
 * (never suppressing the calendar event itself, only the redundant
 * proposal) before inserting, per docs/ingestion.md's Dedupe section.
 */
async function extractAndPropose({ rawMessageId, cleanedBody, links, subject, receivedAt, senderEmail, calendarShaped }) {
  const extracted = await extractItems({
    body: cleanedBody, subject, receivedAt, sender: senderEmail, links,
  });
  const deduped = dedupeAgainstCalendar(extracted, calendarShaped);

  for (const it of deduped) {
    const persons = mapPersons(it.person);
    await sql`
      insert into proposed_item
        (raw_message_id, kind, persons, title, starts_at, ends_at, all_day, time_zone,
         location, uniform, action_required, source_quote, source_url, confidence,
         duplicate_of, needs_review, approver_role)
      values
        (${rawMessageId}, ${it.kind}, ${persons}, ${it.title},
         ${combineDateTime(it.date, it.start_time, it.timeZone)},
         ${it.end_date ? combineDateTime(it.end_date, it.end_time, it.timeZone) : null},
         ${Boolean(it.all_day)}, ${it.timeZone}, ${it.location ?? null}, ${it.uniform ?? null},
         ${Boolean(it.action_required)}, ${it.source_quote ?? null}, ${it.source_url ?? null},
         ${it.confidence ?? 0.5}, ${it.duplicateOf ?? null}, ${it.needsReview},
         ${approverRoleFor(it.kind, persons)})`;
  }

  return deduped.length;
}

/**
 * Poll the mailbox once: store every new message, run the deterministic
 * SEQTA parser inline (free, confidence 1.0), and run the LLM extraction
 * pass inline for everything else (bulletins, newsletters) — one pass per
 * message, not a separate deferred job.
 *
 * Every fetched message is marked \Seen exactly once, win or drop or
 * duplicate — otherwise a dropped message (Apple ID mail, an unlisted
 * sender) would be re-fetched and re-evaluated on every future poll forever,
 * since {seen: false} is the only thing telling this apart from a real
 * "nothing new" run. A message whose extraction call itself fails (a
 * network blip, the API down) is the one exception worth naming: it's
 * still marked seen once stored, so it won't be retried automatically —
 * there's no separate "reprocess unprocessed raw_message rows" pass yet.
 *
 * @returns {{ fetched: number, stored: number, seqtaProposed: number, bulletinProposed: number, dropped: object[] }}
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
  let bulletinProposed = 0;
  const dropped = [];
  const seenUids = [];

  // Fetched once per poll, not once per message — homecal.js caches the
  // underlying feed for 15 minutes anyway. A 60-day window catches bulletin
  // items further out than What's On's own 21-day display window; dedupe
  // accuracy matters more here than fetch size.
  const calendarShaped = toDedupeShape(await getEvents({ from: new Date(), days: 60 }));

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

        const { text: cleanedBody, links } = cleanEmailBody(rawBody);
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
        } else {
          try {
            bulletinProposed += await extractAndPropose({
              rawMessageId, cleanedBody, links, subject, receivedAt, senderEmail, calendarShaped,
            });
          } catch (e) {
            console.error(`[ingest] extraction failed for "${subject}":`, e.message);
          }
        }

        await sql`update raw_message set processed_at = now() where id = ${rawMessageId}`;
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

  return { fetched, stored, seqtaProposed, bulletinProposed, dropped };
}
