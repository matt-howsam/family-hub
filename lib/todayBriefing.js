import { UNIFORM_LABEL } from './timetable.js';
import { hourNow, SCHOOL_DAY_END_HOUR, TZ } from './week.js';

/* Layers today's after-school activity and any uniform override onto a
   child's term-layer briefing (lib/timetable.js#briefing). Shared by the
   home wall and person views so neither re-derives either one.

   "After school" has no term-layer source any more — it comes entirely
   from `entries` (lib/whatson.js#getWhatsOn's merge of the Home calendar
   and approved review-queue items), filtered to today's timed entries at
   or after SCHOOL_DAY_END_HOUR. A same-day entry earlier in the day (a
   morning appointment, say) is deliberately excluded here — it still
   surfaces on the general What's On list instead. */
export function overlayToday(b, entries, todayKey) {
  if (!b) return { briefing: null, consumed: [] };
  const isToday = (e) => e.date === todayKey;
  const consumed = [];

  const own = entries.filter((e) =>
    e.person === b.id && isToday(e) && !e.all_day && e.starts_at &&
    hourNow(TZ, new Date(e.starts_at)) >= SCHOOL_DAY_END_HOUR
  );
  if (own.length) {
    b.after = own.map((e) => (e.all_day ? e.title : `${e.title}, ${e.display_time}`)).join(' · ');
    consumed.push(...own.map((e) => e.id));
  }

  const override = entries.find((e) => isToday(e) && e.uniform_override);
  if (override) {
    // A school-mail override (lib/whatson.js's `item` adapter) carries a
    // real `uniform` value — use its own label. A calendar-sourced one
    // (homecal.js's title-regex detection) never does, and is always a
    // mufti-style day, per the existing "Mufti Day - gold coin" convention.
    b.uniformLabel = override.uniform ? UNIFORM_LABEL[override.uniform] ?? 'Uniform update' : 'Mufti day';
    b.bring = override.uniform
      ? override.title
      : override.title.replace(/^mufti day\s*[-–—:]\s*/i, '') || b.bring;
    // A school-announced override replaces the term layer's own uniform
    // logic entirely for today — any planned mid-day change (Rose's
    // Tuesday/Friday pattern) no longer applies.
    b.uniformChange = null;
    consumed.push(override.id);
  }

  return { briefing: b, consumed };
}
