/* Layers today's calendar-sourced after-school activity and any uniform
   override onto a child's term-layer briefing (lib/timetable.js#briefing).
   Shared by the home wall and person views so neither re-derives which one
   wins — the calendar overrides the term layer only when it announces a
   change; otherwise the term layer's own standing activity stands. */
export function overlayToday(b, entries, todayKey) {
  if (!b) return { briefing: null, consumed: [] };
  const isToday = (e) => e.date === todayKey;
  const consumed = [];

  const own = entries.filter((e) => e.person === b.id && isToday(e));
  if (own.length) {
    b.after = own.map((e) => (e.all_day ? e.title : `${e.title}, ${e.display_time}`)).join(' · ');
    consumed.push(...own.map((e) => e.id));
  }

  const override = entries.find((e) => isToday(e) && e.uniform_override);
  if (override) {
    b.uniformLabel = 'Mufti day';
    b.bring = override.title.replace(/^mufti day\s*[-–—:]\s*/i, '') || b.bring;
    consumed.push(override.id);
  }

  return { briefing: b, consumed };
}
