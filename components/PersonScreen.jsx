'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TShirt, ArrowLeft } from '@phosphor-icons/react/ssr';
import { subjectIcon } from '@/lib/subjectIcons';
import { resolveUniform } from '@/lib/timetable';
import TodoSection from '@/components/TodoSection';
import HubIcon from '@/components/HubIcon';

/* Same idle budget as What's On: nobody standing at the fridge for 60s means
   the fridge should be showing the wall, not one person's day. */
const VIEW_IDLE_MS = 60000;

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_NAME = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' };

const weekdayName = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'long' });

/* Weekday + date, same format /whats-on uses. Coming up spans 14 days, so a
   weekday-only subhead makes two different Mondays look identical. */
const subheadFor = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short',
  });

function ComingUpRow({ e }) {
  const time = e.all_day ? 'All day' : e.display_time;
  const span = e.end_date > e.date ? ` · until ${weekdayName(e.end_date)}` : '';
  return (
    <div className="wo-row">
      <span className="wo-time">{time}</span>
      <span className="wo-main">
        <span className="wo-name">
          {e.title}{span}
          {e.display_time_origin && ` (${e.display_time_origin})`}
        </span>
        {e.location && <span className="wo-location">{e.location}</span>}
      </span>
    </div>
  );
}

function ComingUp({ entries }) {
  if (!entries.length) return null;
  const grouped = new Map();
  for (const e of entries) {
    if (!grouped.has(e.date)) grouped.set(e.date, []);
    grouped.get(e.date).push(e);
  }
  return (
    <div className="pv-section">
      <div className="pv-section__label">Coming up</div>
      {[...grouped.entries()].map(([date, items]) => (
        <div key={date}>
          <div className="wo-subhead">{subheadFor(date)}</div>
          <div className="wo-rows">
            {items.map((e) => <ComingUpRow e={e} key={e.id} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TodaySection({ today, tint }) {
  if (!today) return null;
  if (today.kind === 'attributed') {
    return (
      <div className="pv-section">
        <div className="pv-section__label">Today</div>
        <div className="pv-card">
          {today.items.map((e) => (
            <div className="pv-note" key={e.id}>
              {e.all_day ? e.title : `${e.title}, ${e.display_time}`}
            </div>
          ))}
        </div>
      </div>
    );
  }
  const b = today.briefing;
  return (
    <div className="pv-section">
      <div className="pv-section__label">Today</div>
      <div className="pv-card" style={{ '--fh-slab-ink': `var(--fh-${tint}-slab-ink)` }}>
        <TShirt size={32} className="pv-uniform__icon" style={{ color: 'var(--fh-slab-ink)' }} />
        <div className="pv-uniform__word" style={{ color: 'var(--fh-slab-ink)' }}>{b.uniformLabel}</div>
        {b.uniformChange && (
          <div className="pv-note">Changes to {b.uniformChange.label.toLowerCase()} during the day</div>
        )}
        {b.headline && <div className="pv-headline">{b.headline}</div>}
        {b.bring && <div className="pv-note">{b.bring}</div>}
        {b.after && (
          <div className="pv-after">
            <div className="pv-after__label">After school</div>
            <div className="pv-after__value">{b.after}</div>
          </div>
        )}
        {!b.headline && !b.bring && !b.after && !b.uniformChange && (
          <div className="pv-note">Ordinary day. Nothing to bring.</div>
        )}
      </div>
    </div>
  );
}

function SchoolSection({ school }) {
  const [selDay, setSelDay] = useState(school.dayKey);
  const [selLetter, setSelLetter] = useState(school.letter);

  const periods = school.timetable?.[selLetter]?.[selDay] ?? [];
  const { wear: uniform, changeTo } = resolveUniform(school.uniformRules?.[selLetter]?.[selDay]);

  // The "next school day" qualifier only means something while looking at
  // the section's own opening view — once someone browses elsewhere with
  // the day/week segments, it's just reference material, not an answer.
  const isDefaultView = selDay === school.dayKey && selLetter === school.letter;

  return (
    <div className="pv-section">
      <div className="pv-section__label">
        {DAY_NAME[selDay]} · Week {selLetter}
        {isDefaultView && !school.isToday && (
          <span className="pv-section__qualifier"> · next school day</span>
        )}
      </div>

      <div className="pv-card" style={{ '--fh-slab-ink': `var(--fh-${school.tint}-slab-ink)` }}>
        <TShirt size={32} className="pv-uniform__icon" style={{ color: 'var(--fh-slab-ink)' }} />
        <div className="pv-uniform__word" style={{ color: 'var(--fh-slab-ink)' }}>
          {school.uniformLabel[uniform]}
        </div>
        {changeTo && (
          <div className="pv-note">Changes to {school.uniformLabel[changeTo].toLowerCase()} during the day</div>
        )}
      </div>

      <div className="pv-switch" style={{ marginTop: 'var(--fh-space-6)' }}>
        {DAY_ORDER.map((d) => (
          <button
            key={d}
            className={`pv-switch__seg${d === selDay ? ' pv-switch__seg--active' : ''}`}
            onClick={() => setSelDay(d)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="pv-switch pv-switch--letters">
        {['A', 'B'].map((l) => (
          <button
            key={l}
            className={`pv-switch__seg${l === selLetter ? ' pv-switch__seg--active' : ''}`}
            onClick={() => setSelLetter(l)}
          >
            Week {l}
          </button>
        ))}
      </div>
      <div className="pv-card" style={{ padding: 0 }}>
        {periods.length === 0 && <div className="pv-note" style={{ padding: 'var(--fh-space-5)' }}>No periods recorded.</div>}
        {periods.map((subject, i) => {
          const Icon = subjectIcon(subject);
          return (
            <div className="pv-period" key={`${subject}-${i}`}>
              <Icon size={20} className="pv-period__icon" />
              <span className="pv-period__name">{subject}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PersonScreen({ person, role, today, school, comingUp = [], todo }) {
  const router = useRouter();
  const timer = useRef(null);
  const fridge = role === 'display';
  const todoEmpty = !todo || todo.items.length === 0;

  useEffect(() => {
    if (!fridge) return undefined;
    const arm = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => router.push('/'), VIEW_IDLE_MS);
    };
    arm();
    window.addEventListener('pointerdown', arm);
    return () => {
      window.removeEventListener('pointerdown', arm);
      clearTimeout(timer.current);
    };
  }, [fridge, router]);

  const nothing = !today && (!school) && comingUp.length === 0 && todoEmpty;

  return (
    <main className="pv-page">
      <Link className="wo-back" href="/" aria-label="Back to the wall"><ArrowLeft size={24} /></Link>
      <div className="pv-header">
        <HubIcon icon={person.icon} size={80} />
        <div>
          <div className="pv-header__name">{person.name}</div>
          {person.year && <span className="pv-header__year">Year {person.year}</span>}
        </div>
      </div>

      {nothing && <div className="pv-empty">Nothing needs you.</div>}

      <TodaySection today={today} tint={person.tint} />
      {school && <SchoolSection school={school} />}
      {todo && (
        <TodoSection
          person={person.id}
          personKind={person.kind}
          subjects={todo.subjects}
          items={todo.items}
          now={todo.now}
          canWrite={todo.canWrite}
          fridge={fridge}
        />
      )}
      <ComingUp entries={comingUp} />
    </main>
  );
}
