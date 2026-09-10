import Clock from '@/components/Clock';
import WeekLetter from '@/components/WeekLetter';
import KidCard from '@/components/KidCard';
import WaterHero from '@/components/WaterHero';
import Chores from '@/components/Chores';
import ModuleTiles from '@/components/ModuleTiles';
import WhatsOn from '@/components/WhatsOn';
import Avatars from '@/components/Avatars';
import { getAnchor, hasDb } from '@/lib/db';
import { weekLetter, today, TZ } from '@/lib/week';
import { briefing, dayKey } from '@/lib/timetable';
import { getEvents } from '@/lib/homecal';

/* The fridge never sleeps, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

const DAY = 86400000;
const fmt = (d, o) => d.toLocaleDateString('en-AU', { timeZone: 'UTC', ...o });

export default async function Wall() {
  const anchor = await getAnchor();
  const now = today(TZ);
  const w = weekLetter(anchor, now);

  /* Only build briefings on a school weekday. At the weekend or in the
     holidays the children's blocks have nothing true to say, so they are
     replaced by the water/chores state rather than shown stale. */
  const day = dayKey(now);
  const kids = w.schoolWeek && day
    ? ['tom', 'rose'].map((id) => briefing(id, w.letter, day)).filter(Boolean)
    : [];

  /* The Home calendar. Absent or unreachable simply means no cards — a fridge
     with no calendar beats a fridge showing an error. */
  const events = await getEvents({ from: now, days: 8 });
  const todayKey = now.toISOString().slice(0, 10);
  const tomorrowKey = new Date(now.getTime() + DAY).toISOString().slice(0, 10);
  const isToday = (e) => e.date === todayKey;

  /* A child's own events belong on their card, not in a general list, so the
     same activity never appears twice on one screen. */
  const mine = (id) => events.filter((e) => e.person === id && isToday(e));
  for (const k of kids) {
    const own = mine(k.id);
    if (own.length) {
      k.after = own.map((e) => (e.time ? `${e.label}, ${e.time}` : e.label)).join(' · ');
    }
  }

  /* A mufti day is announced by the school, not scheduled, so the timetable
     cannot know about it. When the calendar says the uniform changes, it wins. */
  const override = events.find((e) => isToday(e) && e.uniformOverride);
  if (override) {
    for (const k of kids) {
      k.uniformLabel = 'Mufti day';
      k.bring = override.label.replace(/^mufti day\s*[-–—:]\s*/i, '') || k.bring;
    }
  }

  const kidIds = new Set(kids.map((k) => k.id));

  const dayLabel = (dateStr) => {
    if (dateStr === todayKey) return 'Today';
    if (dateStr === tomorrowKey) return 'Tomorrow';
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-AU', {
      timeZone: 'UTC', weekday: 'short',
    });
  };

  /* The household's own events — not a child's. A multi-day span appears
     once per day it covers, which is right for a kid's "today" but wrong
     here, so keep the first occurrence of each. */
  const seen = new Set();
  const onWall = events
    .filter((e) => !kidIds.has(e.person) && e !== override)
    .filter((e) => {
      const base = e.uid.split(':')[0];
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    })
    .slice(0, 4)
    .map((e) => ({
      uid: e.uid,
      label: e.label,
      when: dayLabel(e.date) + (e.time ? ` ${e.time}` : ''),
    }));

  const schoolMorning = kids.length > 0;
  const builtAt = new Date()
    .toLocaleTimeString('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();

  return (
    <main className="wall">
      <section className="today">
        <Clock tz={TZ} />
        <WeekLetter
          letter={w.letter}
          schoolWeek={w.schoolWeek}
          setBy={anchor.setBy}
          since={fmt(new Date(anchor.monday + 'T00:00:00Z'), { day: 'numeric', month: 'short' })}
          resumes={w.resumesOn ? fmt(w.resumesOn, { day: 'numeric', month: 'short' }) : ''}
          canWrite={hasDb}
        />
      </section>

      {/* Family register — people. Softer radius, more air, tinted. The
          weekday payload is the kids' briefings; the weekend payload is
          the water hero and the chores in progress. */}
      <div data-register="family" style={{ marginTop: 'var(--fh-space-8)' }}>
        {schoolMorning
          ? kids.map((b) => <KidCard key={b.id} b={b} />)
          : (<><WaterHero /><Chores /></>)}
      </div>

      <ModuleTiles />
      <WhatsOn items={onWall} />
      <Avatars />

      <div className="house">
        <span>
          {schoolMorning
            ? 'Sunrise 5:47 · the pool is 19°, which is a matter of opinion'
            : '103 days until the mango tree does anything at all'}
        </span>
        <span className="house__built">
          {schoolMorning ? 'Built' : 'Updated'} {builtAt}
          {hasDb ? '' : ' · no database'}
        </span>
      </div>
    </main>
  );
}
