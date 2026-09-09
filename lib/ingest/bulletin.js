/**
 * bulletin.js — LLM extraction for the unstructured stream.
 *
 * Handles: year-level weekly bulletins, school newsletters, P&F mail, human
 * threads. Everything that isn't SEQTA machine mail or a booking confirmation.
 *
 * Everything this produces is a PROPOSAL. Nothing reaches the fridge without
 * an adult approving it in the review queue.
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
      kind: 'event | assessment | deadline | notice',
      person: 'Rose | Tom | Renée | Matt | household | null',
      date: 'YYYY-MM-DD',
      end_date: 'YYYY-MM-DD or null (multi-day only)',
      start_time: 'HH:MM 24h, or null if no time given',
      end_time: 'HH:MM 24h, or null',
      all_day: 'boolean',
      location: 'string or null — expand codes if you can, else omit',
      action_required: 'boolean — does a parent have to do something?',
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
- Anything without a resolvable date

Being wrong costs more than being incomplete. If it isn't a thing that goes on
a family calendar, leave it out.

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
 */
export async function extractItems({ body, subject, receivedAt, sender }) {
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
      max_tokens: 2000,
      temperature: 0,
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
    throw new Error(`Extractor returned non-JSON: ${text.slice(0, 300)}`);
  }

  return (parsed.items ?? []).map((item) => ({
    ...item,
    source: 'bulletin',
    isEvent: true,
    needsReview: true,             // always. no exceptions.
    timeZone: SCHOOL_TZ,
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
