import { notFound } from 'next/navigation';
import { PEOPLE } from '@/lib/people';
import { getAnchor } from '@/lib/db';
import { weekLetter, today, TZ, isSchoolDay, nextSchoolDay } from '@/lib/week';
import { briefing, dayKey, TIMETABLE, UNIFORM, UNIFORM_LABEL } from '@/lib/timetable';
import { overlayToday } from '@/lib/todayBriefing';
import { getWhatsOn } from '@/lib/whatson';
import { getRole } from '@/lib/role';
import PersonScreen from '@/components/PersonScreen';

/* Same reasoning as the wall: this never sleeps, so nothing here is cached. */
export const dynamic = 'force-dynamic';

const DAY = 86400000;

/* Both children finish by mid-afternoon and neither's exact bell times for
   every period are in the data model yet (see lib/timetable.js) — only the
   headline end time (lib/people.js#endsAt). 3:30pm Sydney is a fixed,
   approximate "has today's school day ended" cutoff for both, used only to
   decide which day the School section opens on. */
const SCHOOL_DAY_END_HOUR = 15.5;

function sydneyHour(instant) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(instant);
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h + m / 60;
}

export default async function PersonPage({ params }) {
  const { person: id } = await params;
  const p = PEOPLE[id];
  if (!p) notFound();

  const now = today(TZ);
  const todayKey = now.toISOString().slice(0, 10);
  const tomorrowKey = new Date(now.getTime() + DAY).toISOString().slice(0, 10);

  const [{ entries }, role] = await Promise.all([
    getWhatsOn({ from: now, days: 14 }),
    getRole(),
  ]);

  if (p.kind !== 'child') {
    // Adults: thin by design. Needs You has no real data yet (Projects and
    // the Register are still placeholders) — an unshipped section renders
    // nothing, not a fake one, per the brief.
    const comingUp = entries.filter((e) => e.date >= tomorrowKey && e.person === id);
    return <PersonScreen person={p} role={role} comingUp={comingUp} />;
  }

  const anchor = await getAnchor();
  const w = weekLetter(anchor, now);
  const day = dayKey(now);

  let todaySection = null;
  if (w.schoolWeek && day) {
    const { briefing: b } = overlayToday(briefing(id, w.letter, day), entries, todayKey);
    if (b) todaySection = { kind: 'school', briefing: b };
  } else {
    const own = entries.filter((e) => e.person === id && e.date === todayKey);
    if (own.length) todaySection = { kind: 'attributed', items: own };
  }

  const showTodaySchool = isSchoolDay(now) && sydneyHour(new Date()) < SCHOOL_DAY_END_HOUR;
  const schoolDate = showTodaySchool ? now : (nextSchoolDay(now) ?? now);
  const schoolLetter = weekLetter(anchor, schoolDate).letter;
  const schoolDayKey = dayKey(schoolDate);

  const comingUp = entries.filter(
    (e) => e.date >= tomorrowKey && (e.person === id || e.uniform_override)
  );

  return (
    <PersonScreen
      person={p}
      role={role}
      today={todaySection}
      school={{
        dayKey: schoolDayKey,
        letter: schoolLetter,
        isToday: showTodaySchool,
        timetable: TIMETABLE[id],
        uniformRules: UNIFORM[id],
        uniformLabel: UNIFORM_LABEL,
        tint: p.tint,
      }}
      comingUp={comingUp}
    />
  );
}
