import Clock from '@/components/Clock';
import WeekLetter from '@/components/WeekLetter';
import KidCard from '@/components/KidCard';
import DayCard from '@/components/DayCard';
import { getAnchor, hasDb } from '@/lib/db';
import { weekLetter, today, TZ } from '@/lib/week';
import { briefing, dayKey } from '@/lib/timetable';
import { getEvents } from '@/lib/homecal';

/* The fridge never sleeps, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

const fmt = (d, o) => d.toLocaleDateString('en-AU', { timeZone: 'UTC', ...o });

export default async function Wall() {
  const anchor = await getAnchor();
  const now = today(TZ);
  const w = weekLetter(anchor, now);

  /* Only build briefings on a school weekday. At the weekend or in the
     holidays the children's blocks have nothing true to say, so they are
     absent rather than stale. */
  const day = dayKey(now);
  const kids = w.schoolWeek && day
    ? ['tom', 'rose'].map((id) => briefing(id, w.letter, day)).filter(Boolean)
    : [];

  /* The Home calendar. Absent or unreachable simply means no cards — a fridge
     with no calendar beats a fridge showing an error. */
  const events = await getEvents({ from: now, days: 8 });
  const todayKey = now.toISOString().slice(0, 10);
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
  const todayEvents = events.filter(
    (e) => isToday(e) && !kidIds.has(e.person) && e !== override
  );

  /* A multi-day span appears once per day it covers, which is right for
     "today" and wrong for a look-ahead list — otherwise school holidays fill
     it with fifteen identical rows. Keep the first occurrence of each. */
  const seen = new Set();
  const ahead = events
    .filter((e) => !isToday(e))
    .filter((e) => {
      const base = e.uid.split(':')[0];
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    })
    .slice(0, 4)
    .map((e) => ({
      ...e,
      when: new Date(e.date + 'T00:00:00Z').toLocaleDateString('en-AU', {
        timeZone: 'UTC', weekday: 'short',
      }) + (e.time ? ` ${e.time}` : ''),
    }));

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

      {/* Family register — people. Softer radius, more air, tinted. */}
      {kids.length > 0 && (
        <div data-register="family" style={{ marginTop: 'var(--fh-space-8)' }}>
          {kids.map((b) => <KidCard key={b.id} b={b} />)}
        </div>
      )}

      <div data-register="household">
        <DayCard today={todayEvents} ahead={ahead} />
      </div>

      {/* Household register — the ledger. Tight radius, dense rows, flat white.
          Static until the projects module lands; the markup is the shape the
          API will fill. */}
      <div data-register="household">
        <h2 className="group group--attention">
          Needs you <span className="group__count">3 · longest first</span>
        </h2>
        <div className="card">
          <div className="row row--attention">
            <span className="row__main">
              <span className="row__title">Remodel kids&rsquo; bathrooms</span>
              <span className="row__sub">Write down what actually needs to change</span>
            </span>
            <span className="row__end">
              <span className="row__figure">84</span>
              <span className="row__meta">Days · Idea</span>
            </span>
          </div>
          <div className="row row--attention">
            <span className="row__main">
              <span className="row__title">Paint the house</span>
              <span className="row__sub">Chase Brett — the quote was due 11 days ago</span>
            </span>
            <span className="row__end">
              <span className="row__figure">21</span>
              <span className="row__meta">Days · Quoting</span>
            </span>
          </div>
          <div className="row">
            <span className="row__main">
              <span className="row__title">Front landscaping</span>
              <span className="row__sub">Decide turf or native beds before quoting</span>
            </span>
            <span className="row__end">
              <span className="row__figure row__figure--none">no estimate</span>
              <span className="row__meta">Research</span>
            </span>
          </div>
        </div>

        <h2 className="group">Ready when you are <span className="group__count">1</span></h2>
        <div className="card">
          <div className="row row--ready">
            <span className="row__main">
              <span className="row__title">Upstairs bathroom cupboard sliders</span>
              <span className="row__sub">Quote in hand. Say yes and it&rsquo;s ordered.</span>
            </span>
            <span className="row__end"><span className="row__figure">$500</span></span>
          </div>
        </div>

        <h2 className="group">Queued <span className="group__count">1</span></h2>
        <div className="card">
          <div className="row row--sunken">
            <span className="row__main">
              <span className="row__title">Downstairs flooring</span>
              <span className="row__sub">Waiting on the kitchen. Nothing to do.</span>
            </span>
            <span className="row__end"><span className="row__meta">Idea</span></span>
          </div>
        </div>
      </div>

      <div className="house">
        <span>Sunrise 5:47 · the pool is 19°, which is a matter of opinion</span>
        <span className="house__built">
          {w.term ? `${w.term.name} · Term ${w.term.term}` : 'School holidays'}
          {hasDb ? '' : ' · no database'}
        </span>
      </div>
    </main>
  );
}
