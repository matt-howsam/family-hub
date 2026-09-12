import Clock from '@/components/Clock';
import WeekLetter from '@/components/WeekLetter';
import KidCard from '@/components/KidCard';
import WaterHero from '@/components/WaterHero';
import Chores from '@/components/Chores';
import ModuleTiles from '@/components/ModuleTiles';
import WhatsOn from '@/components/WhatsOn';
import Avatars from '@/components/Avatars';
import TonightLine from '@/components/TonightLine';
import { getAnchor, hasDb } from '@/lib/db';
import { weekLetter, today, TZ } from '@/lib/week';
import { briefing, dayKey } from '@/lib/timetable';
import { overlayToday } from '@/lib/todayBriefing';
import { getWhatsOn } from '@/lib/whatson';
import { getTonight } from '@/lib/mealplanner';

/* The fridge never sleeps, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

const DAY = 86400000;
const fmt = (d, o) => d.toLocaleDateString('en-AU', { timeZone: 'UTC', ...o });

export default async function Wall() {
  const anchor = await getAnchor();
  const now = today(TZ);
  const w = weekLetter(anchor, now);
  const tonight = await getTonight();

  /* Only build briefings on a school weekday. At the weekend or in the
     holidays the children's blocks have nothing true to say, so they are
     replaced by the water/chores state rather than shown stale. */
  const day = dayKey(now);
  const kids = w.schoolWeek && day
    ? ['tom', 'rose'].map((id) => briefing(id, w.letter, day)).filter(Boolean)
    : [];

  /* One read function behind the wall, the full What's On listing and
     person views (docs/family-hub-whats-on-person-views-brief.md). Absent
     or unreachable simply means no cards — a fridge with no calendar beats
     a fridge showing an error. */
  const { entries } = await getWhatsOn({ from: now, days: 8 });
  const todayKey = now.toISOString().slice(0, 10);
  const tomorrowKey = new Date(now.getTime() + DAY).toISOString().slice(0, 10);
  const nowInstant = new Date();

  /* A child's own events belong on their card, not in a general list, so the
     same activity never appears twice on one screen. Track which entries
     that covers so the home slot can drop them by id, never by title. Same
     overlay a person view applies — see lib/todayBriefing.js. */
  const shown = new Set();
  for (const k of kids) {
    const { consumed } = overlayToday(k, entries, todayKey);
    consumed.forEach((id) => shown.add(id));
  }

  const dayLabel = (dateStr) => {
    if (dateStr === todayKey) return 'Today';
    if (dateStr === tomorrowKey) return 'Tomorrow';
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-AU', {
      timeZone: 'UTC', weekday: 'short',
    });
  };

  /* Up to three upcoming entries, dropping whatever the kids' blocks already
     show today. A multi-day span already counts as one entry — getWhatsOn
     collapsed it. */
  const onWall = entries
    .filter((e) => !shown.has(e.id))
    .filter((e) => e.all_day || !e.starts_at || new Date(e.starts_at) >= nowInstant)
    .slice(0, 3)
    .map((e) => ({
      uid: e.id,
      label: e.title,
      when: dayLabel(e.date) + (e.all_day ? '' : ` ${e.display_time}`),
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

      <TonightLine tonight={tonight} />

      {/* Family register — people. Softer radius, more air, tinted. The
          weekday payload is the kids' briefings; the weekend payload is
          the water hero and the chores in progress. */}
      <div data-register="family" style={{ marginTop: 'var(--fh-space-8)' }}>
        {schoolMorning
          ? kids.map((b) => <KidCard key={b.id} b={b} />)
          : (<><WaterHero /><Chores /></>)}
      </div>

      {/* Ordered by decay speed: What's on is wrong within hours and read by
          all four people, so it outranks the module rows, which are stable
          for months and mostly Matt-and-Renée content. */}
      <WhatsOn items={onWall} />
      <ModuleTiles />
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
