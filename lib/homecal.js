/* ==========================================================================
   Family Hub — the Home calendar

   Reads the shared iCloud calendar via its published .ics feed. No OAuth, no
   credentials, no token expiry — but the URL is a bearer secret, so it lives
   in HOME_CALENDAR_URL and nowhere else.

   To publish: Calendar app -> the ⓘ beside Home -> Public Calendar -> copy
   the link, then swap webcal:// for https://.

   Recurrence is not hand-rolled. RRULE with EXDATE exceptions, overridden
   instances via RECURRENCE-ID, and floating vs zoned times are a genuine
   swamp; node-ical handles them and we expand into a bounded window.
   ========================================================================== */

import ical from 'node-ical';
import { TZ } from './week.js';

const DAY = 86400000;

/** People whose names prefix event titles, e.g. "Rose dance", "Tom Surfing". */
const PEOPLE = { rose: 'Rose', tom: 'Tom', matt: 'Matt', renee: 'Renée' };

/** Calendar text is written by adults for adults. Some of it isn't for the wall.
    Exported so lib/whatson.js can apply the same eligibility rule at read
    time, per its own invariant, without a second copy of the pattern. */
export const PRIVATE_HINTS = /\b(medicare|invoice|centrelink|tax|salary|super|loan|medical|specialist|counsell?or|psycholog)/i;

/**
 * Entries that restate what the timetable already derives. The timetable is
 * the source of truth for what happens at school, so these are dropped rather
 * than rendered twice — and calendar copies go stale, while the timetable is
 * re-entered each term.
 */
export const TIMETABLE_ECHO = /^(pe prac|pe theory|sports?|assembly|chapel)$/i;

/**
 * Entries that change the uniform. The timetable cannot know about these —
 * a mufti day is announced by the school, not scheduled — so the calendar
 * wins here, unlike the echoes above.
 */
const UNIFORM_OVERRIDE = /\b(mufti|free dress|casual clothes|own clothes|pyjama)/i;

const url = () => {
  const u = process.env.HOME_CALENDAR_URL?.trim();
  if (!u) return null;
  return u.replace(/^webcal:\/\//i, 'https://');
};

export const hasCalendar = Boolean(url());

/* Module-level, per-instance. On a failed fetch we fall back to the last
   parsed feed rather than going blank, and record that the result is stale
   so a caller (What's On) can say so instead of showing a confident guess.
   Resets on a cold start — an acceptable approximation, since a cold start
   fetching cleanly is the common case. */
let feedCache = { data: null, fetchedAt: null };
let lastStale = false;

async function fetchFeed(feed) {
  try {
    // Cached for 15 minutes: iCloud's published feed is itself polled and
    // cached upstream, so hammering it gains nothing.
    const res = await fetch(feed, { next: { revalidate: 900 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = ical.sync.parseICS(await res.text());
    feedCache = { data, fetchedAt: new Date() };
    lastStale = false;
    return feedCache.data;
  } catch {
    lastStale = feedCache.data != null;
    return feedCache.data;
  }
}

/** Freshness of the most recent getEvents() call, for a surface that must
    show cached content marked stale rather than an error or a spinner. */
export function calendarFreshness() {
  return { stale: lastStale, fetchedAt: feedCache.fetchedAt };
}

/** Local calendar date (YYYY-MM-DD) for an instant, in the household's zone. */
function localDate(d, tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

function localTime(d, tz = TZ) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: false,
  }).format(d);
}

/**
 * Who an event belongs to, from a leading first name.
 * "Rose dance" -> rose. "Dinner with Rose" -> null: only a prefix counts,
 * or every mention of a name would be captured as that person's commitment.
 */
export function attribute(title = '') {
  const t = title.trim();
  const match = (word) =>
    Object.entries(PEOPLE).find(
      ([id, name]) => word === id || word === name.toLowerCase()
    );

  // Prefix: "Rose dance", "Tom Surfing", "Renée drink Alesha & Lu".
  const head = match(t.split(/[\s—–-]+/)[0]?.toLowerCase() ?? '');
  if (head) {
    const label = t.slice(head[1].length).replace(/^[\s—–:-]+/, '');
    return { person: head[0], label: label || t };
  }

  // Suffix: "Assembly - Rose". Only after an explicit separator, so
  // "Dinner with Rose and Tom" stays a household event rather than becoming
  // one child's commitment.
  const tail = /^(?<label>.+?)\s*[—–-]\s*(?<who>[A-Za-zÀ-ÿ]+)$/.exec(t);
  if (tail) {
    const who = match(tail.groups.who.toLowerCase());
    if (who) return { person: who[0], label: tail.groups.label.trim() };
  }

  return { person: null, label: t };
}

/**
 * Events between `from` and `from + days`, expanded and sorted.
 * Returns [] if the calendar has never been reached; falls back to the last
 * good feed (see `calendarFreshness()`) on a failed fetch. A fridge with no
 * calendar beats a fridge showing an error.
 */
export async function getEvents({ from = new Date(), days = 7 } = {}) {
  const feed = url();
  if (!feed) return [];

  const start = new Date(Date.UTC(
    from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()
  ));
  const end = new Date(start.getTime() + days * DAY);

  const data = await fetchFeed(feed);
  if (!data) return [];

  const out = [];

  for (const ev of Object.values(data)) {
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;

    const allDay = ev.datetype === 'date';
    /* The DTSTART's own TZID, e.g. "Australia/Brisbane" for a booking made
       in another state. Lost the moment a value is wrapped in `new Date()`,
       so it's read once here, off the raw parsed start. Absent (floating
       time, or a bare date) means "assume the household's own zone". */
    const zone = allDay ? null : (ev.start.tz || null);

    const push = (s, e) => {
      const finish = e ?? s;
      if (s >= end || finish < start) return;
      const title = String(ev.summary ?? '').trim();
      if (!title || PRIVATE_HINTS.test(title)) return;
      const { person, label } = attribute(title);
      if (TIMETABLE_ECHO.test(label)) return;

      const base = {
        allDay,
        person,
        label,
        location: ev.location?.trim() || null,
        uniformOverride: UNIFORM_OVERRIDE.test(title),
        zone,
      };

      /* All-day events carry an exclusive end date, and a multi-day span must
         appear on every day it covers — otherwise "School Holidays" shows on
         28 September and is gone by the 29th. */
      if (allDay) {
        const last = new Date(Math.max(finish.getTime() - DAY, s.getTime()));
        for (let t = s.getTime(); t <= last.getTime(); t += DAY) {
          const d = new Date(t);
          if (d >= end || d < start) continue;
          out.push({ ...base, uid: `${ev.uid}:${localDate(d)}`, date: localDate(d), time: null, at: t });
        }
        return;
      }

      out.push({
        ...base,
        uid: `${ev.uid}:${s.toISOString()}`,
        date: localDate(s),
        time: localTime(s),
        at: s.getTime(),
      });
    };

    if (ev.rrule) {
      const skip = new Set(
        Object.values(ev.exdate ?? {}).map((d) => localDate(new Date(d)))
      );
      // Overridden instances arrive as their own VEVENTs, so drop the
      // generated occurrence and let the override stand on its own.
      const overridden = new Set(
        Object.keys(ev.recurrences ?? {})
      );
      for (const occ of ev.rrule.between(start, end, true)) {
        if (skip.has(localDate(occ)) || overridden.has(localDate(occ))) continue;
        push(occ, occ);
      }
      for (const r of Object.values(ev.recurrences ?? {})) {
        if (r?.start) push(new Date(r.start), new Date(r.end ?? r.start));
      }
    } else {
      push(new Date(ev.start), new Date(ev.end ?? ev.start));
    }
  }

  // Date first, then all-day above timed within that date, then by time.
  // Sorting all-day globally first would float tomorrow's bin night above
  // tonight's dinner.
  out.sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date)
    : a.allDay !== b.allDay ? (a.allDay ? -1 : 1)
    : a.at - b.at
  );
  return out;
}

/** Just today's, in the household's timezone. */
export async function getToday(now = new Date()) {
  const all = await getEvents({ from: now, days: 1 });
  const key = localDate(now);
  return all.filter((e) => e.date === key);
}
