'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AirplaneTakeoff } from '@phosphor-icons/react/ssr';

const VIEW_IDLE_MS = 60000;
// "An uncapped timeline fills with weekends and buries the two decisions a
// year that actually matter" (§7.6) — the risk is worse now that entries
// are unlimited, so the fridge caps how far ahead it shows. The phone
// shows everything.
const FRIDGE_LIMIT = 6;

const PEOPLE_TOGGLE = ['matt', 'renee', 'rose', 'tom'];
const PERSON_LABELS = { matt: 'Matt', renee: 'Renée', rose: 'Rose', tom: 'Tom' };

async function post(body) {
  const res = await fetch('/api/holidays', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function sanitizeDigits(value) {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

function dayShort(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', {
    timeZone: 'UTC', day: 'numeric', month: 'short',
  });
}

function dateRange(h) {
  if (!h.endsOn || h.endsOn === h.startsOn) return dayShort(h.startsOn);
  return `${dayShort(h.startsOn)} – ${dayShort(h.endsOn)}`;
}

function whenLabel(startsOn) {
  const days = Math.round((new Date(`${startsOn}T00:00:00Z`) - new Date()) / 86400000);
  if (days <= 13) return `${days} day${days === 1 ? '' : 's'}`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

/** Major trips keep the row's full weight and an airplane marker; minor
    ones are quieted down. Typography and an icon do the work — never
    colour, this app has exactly two meaning colours and neither is
    "important." */
function TripRow({ h, showWhen }) {
  return (
    <>
      {h.major && <AirplaneTakeoff size={20} weight="fill" className="row__marker" />}
      <div className="row__main">
        <span className="row__title">{h.title}</span>
        <span className="row__sub">
          {dateRange(h)}
          {h.nights != null && ` · ${h.nights} night${h.nights === 1 ? '' : 's'}`}
          {h.agesLine && ` · ${h.agesLine}`}
        </span>
      </div>
      {showWhen && (
        <div className="row__end">
          <span className="row__figure">{whenLabel(h.startsOn)}</span>
        </div>
      )}
    </>
  );
}

function IdeaRow({ h }) {
  return (
    <>
      {h.major && <AirplaneTakeoff size={20} weight="fill" className="row__marker" />}
      <div className="row__main">
        <span className="row__title">{h.title}</span>
        {h.note && <span className="row__sub">{h.note}</span>}
      </div>
    </>
  );
}

/** Add or edit a holiday. `canEditFull` gates the adult-only fields —
    dates, nights, budget, who's going, the major flag — per
    docs/identity.md's roles table: a child can only ever contribute a
    title and a note. The route enforces this too; hiding the fields here
    is the courtesy, not the boundary. */
function HolidayForm({ initial, canEditFull, onSaved, onCancel, onDelete }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [major, setMajor] = useState(initial?.major ?? false);
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? '');
  const [nights, setNights] = useState(initial?.nights != null ? String(initial.nights) : '');
  const [budget, setBudget] = useState(initial?.budget != null ? String(Math.round(initial.budget / 100)) : '');
  const [who, setWho] = useState(initial?.who ?? []);
  const [note, setNote] = useState(initial?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = Boolean(initial?.id);
  const togglePerson = (id) => setWho((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id]));

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(false);
    const res = await post({
      action: isEditing ? 'edit' : 'add',
      id: initial?.id,
      title: title.trim(),
      major,
      startsOn: startsOn || null,
      nights: nights === '' ? null : parseInt(nights, 10),
      who: who.length ? who : null,
      budget: budget === '' ? null : parseInt(budget, 10) * 100,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    const res = await post({ action: 'delete', id: initial.id });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onDelete();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Trip name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

      {canEditFull && (
        <>
          <div className="mp-switch" style={{ marginBottom: 'var(--fh-space-3)' }}>
            <button type="button" className={`mp-switch__seg${!major ? ' mp-switch__seg--active' : ''}`}
                    onClick={() => setMajor(false)}>Minor</button>
            <button type="button" className={`mp-switch__seg${major ? ' mp-switch__seg--active' : ''}`}
                    onClick={() => setMajor(true)}>Major — overseas</button>
          </div>
          <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <input placeholder="Nights" inputMode="numeric" pattern="[0-9]*"
                 value={nights} onChange={(e) => setNights(sanitizeDigits(e.target.value))} />
          <input placeholder="Budget" inputMode="numeric" pattern="[0-9]*"
                 value={budget} onChange={(e) => setBudget(sanitizeDigits(e.target.value))} />
          <div className="hol-who">
            <span className="hol-who__label">Who's going</span>
            <div className="mp-switch">
              {PEOPLE_TOGGLE.map((id) => (
                <button key={id} type="button"
                        className={`mp-switch__seg${who.includes(id) ? ' mp-switch__seg--active' : ''}`}
                        onClick={() => togglePerson(id)}>
                  {PERSON_LABELS[id]}
                </button>
              ))}
            </div>
            <p className="hol-who__hint">{who.length === 0 ? 'Whole family' : who.map((id) => PERSON_LABELS[id]).join(', ')}</p>
          </div>
        </>
      )}

      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy || !title.trim()}>
          {isEditing ? 'Save' : 'Add'}
        </button>
      </div>

      {isEditing && canEditFull && (
        <button type="button" className="mp-lib-archive" style={{ marginTop: 'var(--fh-space-4)' }}
                disabled={busy} onClick={handleDelete}>
          {confirmDelete ? 'Tap again to delete' : 'Delete'}
        </button>
      )}
    </form>
  );
}

export default function HolidaysScreen({ timeline, fridge, role }) {
  const router = useRouter();
  const viewTimer = useRef(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!fridge) return undefined;
    const arm = () => {
      clearTimeout(viewTimer.current);
      viewTimer.current = setTimeout(() => router.push('/'), VIEW_IDLE_MS);
    };
    arm();
    window.addEventListener('pointerdown', arm);
    return () => {
      window.removeEventListener('pointerdown', arm);
      clearTimeout(viewTimer.current);
    };
  }, [fridge, router]);

  const canEditFull = role === 'adult';
  const canSuggest = role === 'adult' || role === 'child';
  const upcoming = fridge ? timeline.upcoming.slice(0, FRIDGE_LIMIT) : timeline.upcoming;

  const closeForms = () => { setAdding(false); setEditingId(null); };
  const onSaved = () => { closeForms(); router.refresh(); };

  const renderRow = (h, RowInner, showWhen) => {
    if (editingId === h.id) {
      return (
        <div className="row" key={h.id}>
          <HolidayForm
            initial={h} canEditFull={canEditFull}
            onSaved={onSaved} onCancel={closeForms} onDelete={onSaved}
          />
        </div>
      );
    }
    const content = <RowInner h={h} showWhen={showWhen} />;
    if (!canEditFull) return <div className={`row${h.major ? '' : ' row--quiet'}`} key={h.id}>{content}</div>;
    return (
      <button
        type="button"
        className={`row${h.major ? '' : ' row--quiet'}`}
        style={{ border: 0, width: '100%', cursor: 'pointer' }}
        key={h.id}
        onClick={() => setEditingId(h.id)}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="hol-page">
      <div className="hol-header">
        <Link href="/" className="wo-back" aria-label="Back to the wall">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="hol-header__title">Holidays</h1>
          <p className="hol-header__note">Everything coming up, big and small.</p>
        </div>
      </div>

      {!fridge && canSuggest && !adding && (
        <button type="button" className="sc-entry-cta" style={{ marginBottom: 'var(--fh-space-6)' }}
                onClick={() => setAdding(true)}>
          {canEditFull ? 'Add a trip' : 'Suggest an idea'}
        </button>
      )}

      {!fridge && adding && (
        <div className="hol-form-wrap">
          <HolidayForm initial={null} canEditFull={canEditFull} onSaved={onSaved} onCancel={closeForms} onDelete={onSaved} />
        </div>
      )}

      {upcoming.length === 0 && <p className="hol-empty">Nothing planned yet.</p>}

      {upcoming.length > 0 && (
        <div data-register="family">
          {upcoming.map((h) => renderRow(h, TripRow, true))}
        </div>
      )}

      {!fridge && timeline.ideas.length > 0 && (
        <>
          <h2 className="group">Ideas</h2>
          <div data-register="family">
            {timeline.ideas.map((h) => renderRow(h, IdeaRow, false))}
          </div>
        </>
      )}

      {!fridge && timeline.past.length > 0 && (
        <>
          <h2 className="group">Been there</h2>
          <div data-register="family">
            {timeline.past.map((h) => renderRow(h, TripRow, false))}
          </div>
        </>
      )}
    </div>
  );
}
