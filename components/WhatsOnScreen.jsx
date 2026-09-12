'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarBlank, ArrowLeft } from '@phosphor-icons/react/ssr';
import { PEOPLE } from '@/lib/people';

/* An open sheet closes after 30s idle; the whole view returns to the
   dashboard after 60s idle — same budget as a person view, so a fridge
   nobody is standing at settles back to the thing it's for. Both timers
   reset on any touch. Client-only: the fridge's idle behaviour has no
   meaning to a server render. */
const SHEET_IDLE_MS = 30000;
const VIEW_IDLE_MS = 60000;

const weekdayName = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'long' });

const subheadFor = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short',
  });

function Row({ entry, onOpen }) {
  const time = entry.all_day ? 'All day' : entry.display_time;
  const span = entry.end_date > entry.date ? ` · until ${weekdayName(entry.end_date)}` : '';
  return (
    <button className={`wo-row${entry.layer === 'around' ? ' wo-row--around' : ''}`} onClick={() => onOpen(entry)}>
      <span className="wo-time">{time}</span>
      <span className="wo-main">
        <span className="wo-titlerow">
          {entry.person !== 'household' && (
            <span
              className="wo-mark"
              style={{ background: `var(--fh-${entry.person}-disc)`, color: `var(--fh-${entry.person}-ink)` }}
            >
              {PEOPLE[entry.person]?.initial}
            </span>
          )}
          <span className="wo-name">
            {entry.title}
            {span}
            {entry.display_time_origin && ` (${entry.display_time_origin})`}
          </span>
        </span>
        {entry.location && <span className="wo-location">{entry.location}</span>}
      </span>
      <CalendarBlank size={18} className="wo-icon" />
    </button>
  );
}

function Sheet({ entry, fetchedAt, onClose }) {
  const updated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : null;
  return (
    <div className="wo-sheet-backdrop" onClick={onClose}>
      <div className="wo-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="wo-sheet__title">{entry.title}</div>
        <div className="wo-sheet__row">
          <span className="wo-sheet__label">Date</span>
          <span className="wo-sheet__value">
            {weekdayName(entry.date)}
            {entry.end_date > entry.date ? ` – ${weekdayName(entry.end_date)}` : ''}
          </span>
        </div>
        <div className="wo-sheet__row">
          <span className="wo-sheet__label">Time</span>
          <span className="wo-sheet__value">
            {entry.all_day ? 'All day' : entry.display_time}
            {entry.display_time_origin && ` (${entry.display_time_origin})`}
          </span>
        </div>
        {entry.location && (
          <div className="wo-sheet__row">
            <span className="wo-sheet__label">Location</span>
            <span className="wo-sheet__value">{entry.location}</span>
          </div>
        )}
        {entry.person !== 'household' && (
          <div className="wo-sheet__row">
            <span className="wo-sheet__label">Person</span>
            <span className="wo-sheet__value">{PEOPLE[entry.person]?.name ?? entry.person}</span>
          </div>
        )}
        <div className="wo-sheet__row">
          <span className="wo-sheet__label">Source</span>
          <span className="wo-sheet__value">{entry.source_ref}{updated ? ` · Updated ${updated}` : ''}</span>
        </div>
        <button className="wo-sheet__close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function WhatsOnScreen({ groups, stale, fetchedAt, empty, fridge = false }) {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const sheetTimer = useRef(null);
  const viewTimer = useRef(null);

  const armTimers = () => {
    if (!fridge) return;
    clearTimeout(sheetTimer.current);
    clearTimeout(viewTimer.current);
    if (selected) sheetTimer.current = setTimeout(() => setSelected(null), SHEET_IDLE_MS);
    viewTimer.current = setTimeout(() => router.push('/'), VIEW_IDLE_MS);
  };

  useEffect(() => {
    if (!fridge) return undefined;
    armTimers();
    const reset = () => armTimers();
    window.addEventListener('pointerdown', reset);
    return () => {
      window.removeEventListener('pointerdown', reset);
      clearTimeout(sheetTimer.current);
      clearTimeout(viewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, fridge]);

  const updated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : null;

  const weekendLabel = groups.weekend.length === 1 ? weekdayName(groups.weekend[0].date) : 'This weekend';

  return (
    <main className="wo-page">
      <Link className="wo-back" href="/" aria-label="Back to the wall"><ArrowLeft size={24} /></Link>
      <div className="wo-header">
        <span className="wo-header__title">What&rsquo;s on</span>
        {updated && (
          <span className={`wo-updated${stale ? ' wo-updated--stale' : ''}`}>
            {stale ? `Home calendar stale · ${updated}` : `Updated ${updated}`}
          </span>
        )}
      </div>

      {empty && <div className="wo-empty">Nothing on for three weeks.</div>}

      {groups.today.length > 0 && (
        <div className="wo-group">
          <div className="wo-group__label">Today</div>
          <div className="wo-rows">
            {groups.today.map((e) => <Row entry={e} key={e.id} onOpen={setSelected} />)}
          </div>
        </div>
      )}

      {groups.tomorrow.length > 0 && (
        <div className="wo-group">
          <div className="wo-group__label">Tomorrow</div>
          <div className="wo-rows">
            {groups.tomorrow.map((e) => <Row entry={e} key={e.id} onOpen={setSelected} />)}
          </div>
        </div>
      )}

      {groups.weekend.length > 0 && (
        <div className="wo-group">
          <div className="wo-group__label">{weekendLabel}</div>
          {groups.weekend.map(({ date, items }) => (
            <div key={date}>
              {groups.weekend.length > 1 && <div className="wo-subhead">{weekdayName(date)}</div>}
              <div className="wo-rows">
                {items.map((e) => <Row entry={e} key={e.id} onOpen={setSelected} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.later.length > 0 && (
        <div className="wo-group">
          <div className="wo-group__label">Later</div>
          {groups.later.map(({ date, items }) => (
            <div key={date}>
              <div className="wo-subhead">{subheadFor(date)}</div>
              <div className="wo-rows">
                {items.map((e) => <Row entry={e} key={e.id} onOpen={setSelected} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <Sheet entry={selected} fetchedAt={fetchedAt} onClose={() => setSelected(null)} />}
    </main>
  );
}
