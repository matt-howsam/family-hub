/**
 * qa.js — Q&A over school mail. See docs/family-hub-gmail-ingestion-brief.md.
 *
 * Postgres full-text search over `cleaned_body` plus subject, `pastoral_record`
 * content included unfiltered — the `role = 'adult'` route gate (enforced in
 * app/api/qa/route.js, never here) is the entire boundary. Top ~10 by rank
 * into one claude-sonnet-5 call — no `temperature` param, the API rejects it
 * as deprecated for this model. Answers only from what was retrieved; never
 * the model's own knowledge; no match says so.
 */

import { sql, hasDb } from './db';

const MODEL = 'claude-sonnet-5';

/**
 * "School mail" is the seqta + bulletin sources — not the subscription
 * newsletters ingested under `other`, which is a different corpus entirely.
 */
async function searchSchoolMail(question, limit = 10) {
  return sql`
    select id, subject, sender, received_at, cleaned_body,
           ts_rank(search_vector, plainto_tsquery('english', ${question})) as rank
    from raw_message
    where source in ('seqta', 'bulletin')
      and search_vector @@ plainto_tsquery('english', ${question})
    order by rank desc
    limit ${limit}`;
}

async function corpusSize() {
  const rows = await sql`select count(*)::int as n from raw_message where source in ('seqta', 'bulletin')`;
  return rows[0]?.n ?? 0;
}

function buildPrompt(question, messages) {
  const context = messages
    .map(
      (m, i) =>
        `[${i + 1}] Subject: ${m.subject}\nDate: ${new Date(m.received_at).toISOString().slice(0, 10)}\n${m.cleaned_body ?? ''}`
    )
    .join('\n\n---\n\n');

  return `You are answering a parent's question using ONLY the school emails below. Never use outside knowledge.

QUESTION
${question}

RETRIEVED EMAILS
${context}

RULES
- Answer only from what's in these emails. If the answer isn't in them, say
  "Nothing in the school mail about that." and nothing else.
- Cite every claim by its bracketed number, e.g. "Excursion forms due Friday [2]."
- Be brief and direct. No preamble, no hedging beyond what the source itself is unsure of.`;
}

async function callAnthropic(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      // claude-sonnet-5 emits an extended-thinking block by default (see
      // lib/ingest/bulletin.js's max_tokens history) and max_tokens covers
      // both that and the actual answer — 800 was sized for the answer
      // alone and worked once by luck on a short reply. Headroom for both.
      max_tokens: 2000,
      // No `temperature` — the API rejects it as deprecated for this model
      // (400 invalid_request_error). Determinism isn't available to ask
      // for the same way it was on older models.
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/**
 * @param {string} question
 * @returns {{ answer: string, sources: object[], scope: string }}
 */
export async function askSchoolMail(question) {
  if (!hasDb) throw new Error('no database configured');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const [messages, total] = await Promise.all([searchSchoolMail(question), corpusSize()]);
  const scope = `across ${total} school email${total === 1 ? '' : 's'}`;

  if (messages.length === 0) {
    return { answer: 'Nothing in the school mail about that.', sources: [], scope };
  }

  const answer = await callAnthropic(buildPrompt(question, messages));
  const sources = messages.map((m) => ({
    subject: m.subject,
    date: m.received_at,
    sender: m.sender,
  }));

  return { answer, sources, scope };
}
