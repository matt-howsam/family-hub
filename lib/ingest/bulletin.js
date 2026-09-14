/**
 * bulletin.js — LLM extraction for the unstructured stream.
 *
 * Handles: year-level weekly bulletins, school newsletters, P&F mail, human
 * threads. Everything that isn't SEQTA machine mail or a booking confirmation.
 *
 * Everything this produces is a PROPOSAL. Nothing reaches the fridge without
 * approval in the review queue.
 *
 * Incorporates the four corrections from
 * docs/family-hub-gmail-ingestion-brief.md: `kind: 'action'` for an undated
 * parent action (correction 2), `kind: 'uniform_override'` for a uniform
 * change stated in prose rather than a calendar entry (correction 3), one
 * item emitted per person when a bulletin states a wider year range than its
 * own year level (correction 4) — correction 1 (the To-header/sender
 * routing) lives in lib/ingest/imap.js, upstream of this module entirely.
 */

const MODEL = 'claude-sonnet-5';   // swap to claude-haiku-4-5-20251001 for cost
const SCHOOL_TZ = 'Australia/Sydney';

/**
 * Household roster. Used to attribute events and to let the model know which
 * year level maps to which child — the Year 7 bulletin is Rose's, not Tom's.
 */
export const ROSTER = [
  { person: 'Rose', yearLevel: '7', className: '7H' },
  { person: 'Tom', yearLevel: '6', className: '6C' },
  { person: 'Renée', role: 'parent' },
  { person: 'Matt', role: 'parent' },
];

export const EXTRACTION_SCHEMA = {
  items: [
    {
      title: 'string — short, no year level, no room code, no person name',
      kind: 'event | assessment | deadline | notice | action | uniform_override',
      person: 'Rose | Tom | Renée | Matt | household | null',
      date: 'YYYY-MM-DD, or null — null only for kind: action',
      end_date: 'YYYY-MM-DD or null (multi-day only)',
      start_time: 'HH:MM 24h, or null if no time given',
      end_time: 'HH:MM 24h, or null',
      all_day: 'boolean',
      location: 'string or null — expand codes if you can, else omit',
      action_required: 'boolean — does a parent have to do something?',
      uniform: 'formal | sport | null — set only for kind: uniform_override',
      source_url: 'a (link-N) placeholder copied verbatim from the body, if this item\'s real detail lives behind one — else null',
      source_quote: 'string — max 15 words, verbatim, the line this came from',
      confidence: 'number 0.0-1.0',
      notes: 'string or null — only if genuinely load-bearing',
    },
  ],
};

/**
 * Build the extraction prompt.
 *
 * @param {object} args
 * @param {string} args.body        cleaned body (run cleanEmailBody first)
 * @param {string} args.subject
 * @param {Date}   args.receivedAt  when the ORIGINAL was sent, not when forwarded
 * @param {string} [args.sender]
 */
export function buildPrompt({ body, subject, receivedAt, sender }) {
  const received = new Date(receivedAt);
  const receivedLocal = received.toLocaleString('en-AU', {
    timeZone: SCHOOL_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `You are extracting calendar items from a school email for a family household display.

CONTEXT
Received: ${receivedLocal} (${SCHOOL_TZ})
Subject: ${subject}
${sender ? `Sender: ${sender}` : ''}

Household:
- Rose — Year 7, class 7H
- Tom — Year 6, class 6C
- Renée and Matt — parents

If the email is addressed to a single year level, attribute every item to that
child. A Year 7 bulletin is Rose's. A Year 6 bulletin is Tom's. Whole-school
content is "household". Never guess a person from a subject the child happens
to take.

If an item states a year range wider than the bulletin's own year level (e.g.
"Year 5 to 8" inside a Year 7 bulletin), that stated range overrides the
default — emit ONE ITEM PER AFFECTED CHILD in range, each a separate object
in "items". This is the one case "person" holds more than one name — return
it as "Rose, Tom" (comma-separated) rather than two items, since it's the
same single task, not two.

A parent-action item (forms, payments, bookings, permission notes) always
attributes to the parents regardless of which child it concerns — return
"Renée, Matt" for person — even when the underlying event is a specific
child's, e.g. a Year 6 excursion form is Tom's event and a parent's task.

DATE RESOLUTION
- Dates usually appear without a year ("Monday, 7 September"). Resolve against
  the received date above. Prefer the nearest matching date; a bulletin
  published on a Sunday describes the week that follows.
- Relative expressions ("next Wednesday", "tomorrow") resolve against the date
  the message containing them was SENT, which for quoted replies is the quoted
  date, not the received date above.
- Cross-check any stated weekday against the date you resolved. If they
  disagree, trust the date and drop confidence to 0.5.
- Items already in the past are still valid. Extract them. Do not filter by
  date — that happens downstream.

QUOTED THREADS
Lines prefixed [q1], [q2] are quoted at that depth. The most recent message is
unquoted. A decision may be stated in a quoted reply and never restated. When a
thread proposes several options and one is accepted, extract ONLY the accepted
one and set confidence no higher than 0.7. Never extract rejected options.

WHAT IS NOT AN ITEM
Do not extract:
- Descriptions of in-class activities the family does not attend or act on
  (wellbeing programs, lesson content, classroom routines, daily themes)
- General encouragement or advice ("check in at home", "reach out to teachers")
- Statements about where information lives ("dates are visible on SEQTA")
- Anything without a resolvable date — UNLESS it's a genuine parent action
  (see ACTIONS below), which is the one deliberate exception.

Being wrong costs more than being incomplete. If it isn't a thing that goes on
a family calendar, leave it out.

ACTIONS — undated is not the same as noise
A parent-hosted event behind a link, a form with no stated due date, or
anything else that needs a parent to do something but names no date, IS an
item: kind "action", date null. Never invent a date to satisfy the schema.
This is the one kind allowed to have no date at all.

UNIFORM OVERRIDES
A uniform requirement stated in prose — "Middle School Assembly, Tuesday —
full formal uniform including ties and blazers" — is kind
"uniform_override", not "notice" or "event". Set "uniform" to "formal" or
"sport" matching what's stated, and "date" to the day it applies. This beats
the household's usual timetable rule for that day, so get the date right.

LINKS
Long links in the body already appear as short placeholders — (link-1),
(link-2), etc — never the real URL. If an item's real detail lives behind
one, copy that placeholder into "source_url" EXACTLY as shown, e.g. "link-3".
Never invent a URL and never copy a link that isn't already a placeholder.

TITLES
Short and plain. Strip the person's name, the year level, and room codes from
the title — those are separate fields. "Students vs Staff Volleyball", not
"Year 7 Students vs. Staff Volleyball in NGAH".

CONFIDENCE
1.0  explicit date and time, stated once, unambiguous
0.8  explicit date, time absent or approximate
0.6  date inferred from weekday or relative expression
0.4  ambiguous, contradictory, or buried in a negotiation

OUTPUT
Return ONLY a JSON object matching this shape. No preamble, no markdown fences.
If there are no items, return {"items": []}.

${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}

EMAIL BODY
---
${body}
---`;
}

/**
 * Call the API and parse. Server-side only — never expose the key to the PWA.
 *
 * @param {Record<string, string>} [links]  the `links` map from
 *   lib/ingest/clean.js#cleanEmailBody — resolves a "link-N" placeholder the
 *   model copies into source_url back to the real URL. A ref the model
 *   invents (not in this map) resolves to null rather than leaking a
 *   plausible-looking fake link.
 */
export async function extractItems({ body, subject, receivedAt, sender, links = {} }) {
  const prompt = buildPrompt({ body, subject, receivedAt, sender });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      // 2000, then 4000, both still truncated real output — turns out
      // claude-sonnet-5 emits an extended-thinking block ahead of the JSON
      // by default (content types come back as "thinking,text"), and
      // max_tokens covers both. A bulletin with several items needs real
      // headroom for both, not just the JSON itself. 14 Sep 2026.
      max_tokens: 8000,
      // No `temperature` — the API rejects it as deprecated for this model
      // (400 invalid_request_error). See lib/qa.js for the same fix.
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .replace(/^```(?:json)?\s*|\s*```$/g, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // An empty `text` here has a different cause than a truncated one (see
    // the max_tokens fix above) — stop_reason and the raw content block
    // types are the fastest way to tell which, without another
    // guess-and-redeploy cycle over live mail.
    throw new Error(
      `Extractor returned non-JSON (stop_reason: ${data.stop_reason}, ` +
      `content types: ${data.content.map((b) => b.type).join(',') || 'none'}): ${text.slice(0, 300)}`
    );
  }

  return (parsed.items ?? []).map((item) => ({
    ...item,
    source: 'bulletin',
    isEvent: true,
    needsReview: true,             // always. no exceptions.
    timeZone: SCHOOL_TZ,
    source_url: item.source_url ? links[item.source_url] ?? null : null,
  }));
}

/**
 * Suppress proposals that already exist on the Home calendar.
 * Same person (or household), same date, fuzzy title match.
 */
export function dedupeAgainstCalendar(items, calendarEvents) {
  const norm = (s) =>
    (s ?? '')
      .toLowerCase()
      .replace(/\b(rose|tom|renée|renee|matt)\b/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const index = new Map();
  for (const ev of calendarEvents) {
    const date = (ev.start?.dateTime ?? ev.start?.date ?? '').slice(0, 10);
    if (!date) continue;
    if (!index.has(date)) index.set(date, []);
    index.get(date).push(norm(ev.summary));
  }

  return items.map((item) => {
    const sameDay = index.get(item.date) ?? [];
    const t = norm(item.title);
    const hit = sameDay.find(
      (existing) => existing && (existing.includes(t) || t.includes(existing))
    );
    return { ...item, duplicateOf: hit ?? null, needsReview: !hit };
  });
}
