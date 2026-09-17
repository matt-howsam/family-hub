'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { formatDollars } from '@/lib/scorecard';

const RETRY_MS = 4000;
const SHOW_FAILED_AFTER_MS = 10000;
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function post(body) {
  const res = await fetch('/api/scorecard', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function sanitizeDigits(value) {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

function BaseBudgets({ categories }) {
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries(categories.map((c) => [c.key, String(Math.round(c.base / 100))])));
  const saved = useRef(Object.fromEntries(categories.map((c) => [c.key, c.base])));
  const [status, setStatus] = useState({});
  const retryTimers = useRef({});

  const commit = (key, rawValue) => {
    const dollars = rawValue === '' ? 0 : parseInt(rawValue, 10);
    const cents = dollars * 100;
    if (cents === saved.current[key]) return;

    clearTimeout(retryTimers.current[key]);
    setStatus((s) => ({ ...s, [key]: 'saving' }));
    const startedAt = Date.now();

    const attempt = async () => {
      try {
        const res = await post({ action: 'setBaseBudget', categoryKey: key, amount: dollars });
        if (!res.ok) throw new Error('write failed');
        saved.current[key] = cents;
        setStatus((s) => ({ ...s, [key]: 'saved' }));
      } catch {
        setStatus((s) => ({ ...s, [key]: Date.now() - startedAt > SHOW_FAILED_AFTER_MS ? 'failed' : 'saving' }));
        retryTimers.current[key] = setTimeout(attempt, RETRY_MS);
      }
    };
    attempt();
  };

  return (
    <div className="sc-entry-list" data-register="household">
      {categories.map((c) => (
        <div className="sc-entry-row" key={c.key}>
          <div className="sc-entry-row__label">
            <span className="sc-entry-row__title">{c.label}</span>
            {status[c.key] === 'failed' && <span className="sc-entry-row__flag">Not saved yet</span>}
          </div>
          <input
            className="sc-entry-row__input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amounts[c.key]}
            onChange={(e) => setAmounts((a) => ({ ...a, [c.key]: sanitizeDigits(e.target.value) }))}
            onBlur={(e) => commit(c.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function AddEventForm({ categories, onAdded }) {
  const now = new Date();
  const [name, setName] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categoryKey, setCategoryKey] = useState(categories[0]?.key ?? '');
  const [direction, setDirection] = useState('raises');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const signedAmount = amount === '' ? 0 : (direction === 'lowers' ? -1 : 1) * parseInt(amount, 10);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !categoryKey || amount === '') return;
    setBusy(true);
    setError(false);
    const res = await post({
      action: 'addBudgetEvent', name: name.trim(), year: now.getFullYear(), month,
      categoryKey, amount: signedAmount, note: note.trim() || null,
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    setName(''); setAmount(''); setNote('');
    onAdded();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Event name — e.g. Rose birthday" value={name}
             onChange={(e) => setName(e.target.value)} />
      <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
        {MONTH_NAMES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>
        {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <div className="mp-switch" style={{ marginBottom: 'var(--fh-space-3)' }}>
        <button type="button" className={`mp-switch__seg${direction === 'raises' ? ' mp-switch__seg--active' : ''}`}
                onClick={() => setDirection('raises')}>Raises the category</button>
        <button type="button" className={`mp-switch__seg${direction === 'lowers' ? ' mp-switch__seg--active' : ''}`}
                onClick={() => setDirection('lowers')}>Lowers the category</button>
      </div>
      <input placeholder="Amount" inputMode="numeric" pattern="[0-9]*"
             value={amount} onChange={(e) => setAmount(sanitizeDigits(e.target.value))} />
      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {amount !== '' && (
        <p className="sc-envelope__note" style={{ marginBottom: 'var(--fh-space-3)' }}>
          {MONTH_NAMES[month]} {categories.find((c) => c.key === categoryKey)?.label}: {signedAmount > 0 ? '+' : ''}
          {formatDollars(signedAmount * 100)} — changes the annual total by the same amount unless funded
          from another month.
        </p>
      )}
      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}
      <button className="mp-add__submit" type="submit" disabled={busy}>Add event</button>
    </form>
  );
}

export default function BudgetScreen({ data }) {
  const router = useRouter();
  const [year] = useState(data?.year);

  if (!data) {
    return (
      <div className="sc-page">
        <p className="sc-empty">Budget and events aren't available right now.</p>
      </div>
    );
  }

  return (
    <div className="sc-page">
      <div className="sc-header">
        <Link href="/scorecard" className="wo-back" aria-label="Back to the month view">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="sc-header__title">Budget & events</h1>
          <p className="sc-header__note">Base budgets change rarely. Events are the known, dated reasons a
            category moves for one month — a birthday, a holiday, a term back-to-school.</p>
        </div>
      </div>

      <div className="sc-envelope">
        <div className="sc-envelope__row">
          <span className="sc-envelope__label">Annual envelope, {year}</span>
          <span className="sc-envelope__figure">{formatDollars(data.annualBase)}</span>
        </div>
        <div className="sc-envelope__row">
          <span className="sc-envelope__label">Events booked this year, net</span>
          <span className="sc-envelope__figure">
            {data.eventsNet > 0 ? '+' : ''}{formatDollars(data.eventsNet)}
          </span>
        </div>
        <p className="sc-envelope__note">
          {data.eventsNet === 0
            ? 'Balanced — every event so far is funded by lowering another month.'
            : `Events this year move the annual total by ${data.eventsNet > 0 ? '+' : ''}${formatDollars(data.eventsNet)}. If that's not deliberate, a category needs lowering somewhere to fund it.`}
        </p>
      </div>

      <h2 className="sc-review__title" style={{ fontSize: '20px', margin: 'var(--fh-space-8) var(--fh-space-2) var(--fh-space-4)' }}>
        Base budgets
      </h2>
      <BaseBudgets categories={data.categories} />

      <h2 className="sc-review__title" style={{ fontSize: '20px', margin: 'var(--fh-space-8) var(--fh-space-2) var(--fh-space-4)' }}>
        Add an event
      </h2>
      <AddEventForm categories={data.categories} onAdded={() => router.refresh()} />

      {data.events.length > 0 && (
        <>
          <h2 className="sc-review__title" style={{ fontSize: '20px', margin: 'var(--fh-space-8) var(--fh-space-2) var(--fh-space-4)' }}>
            Events this year
          </h2>
          <div className="sc-events-list">
            {data.events.map((ev) => (
              <div className="sc-event-row" key={ev.id}>
                <div className="sc-event-row__main">
                  <span className="sc-event-row__name">{ev.name}</span>
                  <span className="sc-event-row__meta">
                    {MONTH_NAMES[ev.month]} · {data.categories.find((c) => c.key === ev.categoryKey)?.label ?? ev.categoryKey}
                    {ev.amendedAt && <span className="sc-event-row__amended"> · amended {new Date(ev.amendedAt).toLocaleDateString('en-AU')}</span>}
                  </span>
                  {ev.note && <span className="sc-event-row__note">{ev.note}</span>}
                </div>
                <span className="sc-event-row__amount">
                  {ev.amount > 0 ? '+' : ''}{formatDollars(ev.amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
