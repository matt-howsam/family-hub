import Clock from '@/components/Clock';
import WeekLetter from '@/components/WeekLetter';
import KidCard from '@/components/KidCard';
import WaterHero from '@/components/WaterHero';
import Chores from '@/components/Chores';
import ModuleTiles from '@/components/ModuleTiles';
import WhatsOn from '@/components/WhatsOn';
import Avatars from '@/components/Avatars';
import TonightLine from '@/components/TonightLine';
import AutoRefresh from '@/components/AutoRefresh';
import StaleGuard from '@/components/StaleGuard';
import { getAnchor, hasDb } from '@/lib/db';
import { weekLetter, today, TZ, hourNow } from '@/lib/week';
import { briefing, dayKey } from '@/lib/timetable';
import { overlayToday } from '@/lib/todayBriefing';
import { getWhatsOn } from '@/lib/whatson';
import { getTonight } from '@/lib/mealplanner';
import { getStoredConditions } from '@/lib/conditions';
import { eveningLine } from '@/lib/todo';
import { getSession } from '@/lib/identity';
import { getProjectsTile } from '@/lib/projects';
import { getSpendingTile } from '@/lib/scorecard';
import { getRegisterTile } from '@/lib/register';
import { getHolidayTile } from '@/lib/holidays';

/* Tom's met at 3:10, Rose finishes 3:20 — after this the water card becomes
   relevant again even on a school day, per the conditions data spec. */
const SCHOOL_DAY_END_HOUR = 15.5;

/* The fridge never sleeps, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

const DAY = 86400000;

export default async function Wall() {
  const session = await getSession();
  const anchor = await getAnchor();
  const now = today(TZ);
  const w = weekLetter(anchor, now);
  const tonight = await getTonight();
  const projectsTile = await getProjectsTile();
  const spendingTile = await getSpendingTile();
  const registerTile = await getRegisterTile();
  const holidayTile = await getHolidayTile();

  /* Only build briefings on a school weekday. At the weekend or in the
     holidays the children's blocks have nothing true to say, so they are
     replaced by the water/chores state rather than shown stale. */
  const day = dayKey(now);
  const kids = w.schoolWeek && day
    ? ['tom', 'rose'].map((id) => briefing(id, w.letter, day)).filter(Boolean)
    : [];
  const isSchoolDayToday = kids.length > 0;

  // The one evening line from docs/family-hub-todo-brief.md — 17:00-20:30,
  // an item due tomorrow, never a count. eveningLine() itself no-ops outside
  // that window, same pattern as getTonight()'s prep line.
  await Promise.all(
    kids.map(async (k) => {
      k.todoLine = await eveningLine(k.id, new Date());
    })
  );

  /* Reads the persisted store, never Open-Meteo directly — see the
     conditions data spec. Always fetched: the weather line in the Today
     zone is always-on, and the water card can now appear on a school-day
     afternoon too, not just weekends. */
  const conditions = await getStoredConditions();
  const showWater = !isSchoolDayToday || hourNow() >= SCHOOL_DAY_END_HOUR;

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
     show today plus every uniform override regardless of date — per
     docs/family-hub-whats-on-person-views-brief.md, those never appear on
     the home slot at all, they merge into the kids' blocks on their own
     day. `shown` alone only catches TODAY's override (overlayToday only
     ever looks at today), so a future one needs its own filter here. A
     multi-day span already counts as one entry — getWhatsOn collapsed it. */
  const onWall = entries
    .filter((e) => !shown.has(e.id) && !e.uniform_override)
    .filter((e) => e.all_day || !e.starts_at || new Date(e.starts_at) >= nowInstant)
    .slice(0, 3)
    .map((e) => ({
      uid: e.id,
      label: e.title,
      when: dayLabel(e.date) + (e.all_day ? '' : ` ${e.display_time}`),
    }));

  const builtAt = nowInstant
    .toLocaleTimeString('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
  const builtAtIso = nowInstant.toISOString();

  return (
    <main className="wall">
      <AutoRefresh />
      <StaleGuard builtAt={builtAtIso} />
      <section className="today">
        <Clock tz={TZ} daily={conditions?.daily} stale={conditions?.stale} />
        <WeekLetter letter={w.letter} schoolWeek={w.schoolWeek} canWrite={hasDb} />
      </section>

      <TonightLine tonight={tonight} />

      {/* Family register — people. Softer radius, more air, tinted. Kid
          cards run the whole school day; the water card is additive once
          there's time to act on it — a non-school day, or after pickup —
          rather than only ever replacing the kids' blocks. */}
      <div data-register="family" style={{ marginTop: 'var(--fh-space-8)' }}>
        {isSchoolDayToday && kids.map((b) => <KidCard key={b.id} b={b} />)}
        {showWater && <WaterHero conditions={conditions} />}
        {!isSchoolDayToday && <Chores />}
      </div>

      {/* Ordered by decay speed: What's on is wrong within hours and read by
          all four people, so it outranks the module rows, which are stable
          for months and mostly Matt-and-Renée content. */}
      <WhatsOn items={onWall} />
      <ModuleTiles projectsTile={projectsTile} spendingTile={spendingTile} registerTile={registerTile} holidayTile={holidayTile} />
      <Avatars showSettings={session?.role === 'adult'} />

      <div className="house">
        <span>
          {isSchoolDayToday
            ? 'Sunrise 5:47 · the pool is 19°, which is a matter of opinion'
            : '103 days until the mango tree does anything at all'}
        </span>
        <span className="house__built">
          {isSchoolDayToday ? 'Built' : 'Updated'} {builtAt}
          {hasDb ? '' : ' · no database'}
        </span>
      </div>
    </main>
  );
}
