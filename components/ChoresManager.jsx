'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { CHORE_ICONS, choreIcon } from '@/lib/choreIcons';

const dollars = (c) => (c / 100).toFixed(2).replace(/\.00$/, '');
const cents = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const ICON_NAMES = Object.keys(CHORE_ICONS);

async function call(body) {
  const res = await fetch('/api/chores', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'failed');
  return res.json();
}

function ReviewSection({ queue, onChange }) {
  const [note, setNote] = useState({});
  const [busy, setBusy] = useState(null);

  async function act(action, payload) {
    setBusy(payload.id);
    try {
      await call({ action, ...payload });
      onChange();
    } finally {
      setBusy(null);
    }
  }

  if (queue.jobs.length === 0 && queue.bonuses.length === 0) {
    return (
      <div className="pair__card" style={{ marginBottom: 'var(--fh-space-6)' }}>
        <h2 className="pair__title" style={{ fontSize: '22px' }}>Review</h2>
        <p className="pair__note">Nothing waiting.</p>
      </div>
    );
  }

  return (
    <div className="pair__card" style={{ marginBottom: 'var(--fh-space-6)' }}>
      <h2 className="pair__title" style={{ fontSize: '22px' }}>Review</h2>
      <div data-register="household">
        {queue.jobs.map((j) => {
          const Icon = choreIcon(j.icon);
          return (
            <div key={j.id} className="row" style={{ flexWrap: 'wrap' }}>
              <Icon size={22} style={{ flexShrink: 0, color: 'var(--fh-teal-ink)' }} />
              <div className="row__main">
                <span className="row__title">{j.title} · {j.person === 'tom' ? 'Tom' : 'Rose'}</span>
                <span className="row__sub">
                  ${dollars(j.valueCents)}{j.status === 'redo' ? ' · sent back, resubmitted' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--fh-space-2)', width: '100%', marginTop: 'var(--fh-space-2)' }}>
                <button className="pair__button" style={{ flex: 1 }} disabled={busy === j.id}
                  onClick={() => act('approveJob', { id: j.id })}>
                  Approve
                </button>
                <button className="pair__button pair__button--secondary" style={{ flex: 1 }} disabled={busy === j.id}
                  onClick={() => act('redoJob', { id: j.id, note: note[j.id] })}>
                  Needs another go
                </button>
              </div>
              <input
                className="pair__input" placeholder="Note for needs-another-go (optional)"
                style={{ marginTop: 'var(--fh-space-2)' }}
                value={note[j.id] || ''} onChange={(e) => setNote((n) => ({ ...n, [j.id]: e.target.value }))}
              />
            </div>
          );
        })}
        {queue.bonuses.map((b) => (
          <div key={`bonus-${b.id}`} className="row" style={{ flexWrap: 'wrap' }}>
            <div className="row__main">
              <span className="row__title">Weekly bonus · {b.person === 'tom' ? 'Tom' : 'Rose'}</span>
              <span className="row__sub">${dollars(b.valueCents)}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--fh-space-2)', width: '100%', marginTop: 'var(--fh-space-2)' }}>
              <button className="pair__button" style={{ flex: 1 }} disabled={busy === b.id}
                onClick={() => act('approveBonus', { id: b.id })}>
                Approve
              </button>
              <button className="pair__button pair__button--secondary" style={{ flex: 1 }} disabled={busy === b.id}
                onClick={() => act('notYetBonus', { id: b.id })}>
                Not yet
              </button>
              <button className="pair__link" disabled={busy === b.id}
                onClick={() => act('declineBonus', { id: b.id })}>
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwedSection({ kids, onChange }) {
  const [busy, setBusy] = useState(null);

  async function pay(id) {
    setBusy(id);
    try {
      await call({ action: 'payAllOwed', person: id });
      onChange();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pair__card" style={{ marginBottom: 'var(--fh-space-6)' }}>
      <h2 className="pair__title" style={{ fontSize: '22px' }}>Owed &amp; paid</h2>
      {kids.map((k) => (
        <div key={k.id} style={{ marginBottom: 'var(--fh-space-5)' }}>
          <p className="pair__note" style={{ margin: '0 0 var(--fh-space-3)' }}>
            <strong>{k.name}</strong> — ${dollars(k.owedCents)} owed
          </p>
          <button className="pair__button" disabled={k.owedCents === 0 || busy === k.id} onClick={() => pay(k.id)}>
            {k.owedCents === 0 ? 'Nothing owed' : `Mark $${dollars(k.owedCents)} paid`}
          </button>
        </div>
      ))}
    </div>
  );
}

function LibrarySection({ library, onChange }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', icon: 'Sparkle', value: '', frequency: 'weekly', eligible: 'both', notes: '' });
  const [busy, setBusy] = useState(null);

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy('new');
    try {
      await call({
        action: 'createChore', title: form.title, icon: form.icon, valueCents: cents(form.value),
        frequency: form.frequency, eligible: form.eligible === 'both' ? null : [form.eligible], notes: form.notes || null,
      });
      setForm({ title: '', icon: 'Sparkle', value: '', frequency: 'weekly', eligible: 'both', notes: '' });
      setAdding(false);
      onChange();
    } finally {
      setBusy(null);
    }
  }

  async function markDone(choreId) {
    setBusy(choreId);
    try {
      await call({ action: 'markJobDone', choreId });
      onChange();
    } finally {
      setBusy(null);
    }
  }

  async function toggleArchive(c) {
    setBusy(c.id);
    try {
      await call({ action: c.archivedAt ? 'restoreChore' : 'archiveChore', id: c.id });
      onChange();
    } finally {
      setBusy(null);
    }
  }

  async function saveRate(c, value) {
    const next = cents(value);
    if (next === c.valueCents) return;
    await call({ action: 'updateChore', id: c.id, valueCents: next });
    onChange();
  }

  async function saveFrequency(c, frequency) {
    await call({ action: 'updateChore', id: c.id, frequency });
    onChange();
  }

  async function releaseClaim(c) {
    setBusy(c.id);
    try {
      await call({ action: 'unclaimJob', id: c.openJobId });
      onChange();
    } finally {
      setBusy(null);
    }
  }

  const active = library.filter((c) => !c.archivedAt);
  const archived = library.filter((c) => c.archivedAt);

  return (
    <div className="pair__card" style={{ marginBottom: 'var(--fh-space-6)' }}>
      <h2 className="pair__title" style={{ fontSize: '22px' }}>Jobs</h2>
      <div data-register="household">
        {active.map((c) => {
          const Icon = choreIcon(c.icon);
          const available = !c.openJobId && c.nextAvailable <= new Date().toISOString().slice(0, 10);
          return (
            <div key={c.id} className="row chore-row">
              <Icon size={22} style={{ flexShrink: 0, color: 'var(--fh-teal-ink)' }} />
              <div className="row__main">
                <span className="row__title">{c.title}</span>
                <span className="row__sub">
                  {c.openJobId ? `Held by ${c.openPerson === 'tom' ? 'Tom' : 'Rose'} (${c.openStatus})` : available ? 'Available now' : `Next ${c.nextAvailable}`}
                </span>
              </div>
              <div className="chore-row__meta">
                <input
                  className="pair__input" type="number" step="0.01" min="0"
                  style={{ width: 70, flex: 'none', minHeight: 40, padding: '0 var(--fh-space-3)', textAlign: 'right' }}
                  defaultValue={dollars(c.valueCents)} onBlur={(e) => saveRate(c, e.target.value)}
                />
                <select
                  className="pair__input" style={{ width: 120, flex: 'none', minHeight: 40 }}
                  defaultValue={c.frequency} onChange={(e) => saveFrequency(c, e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="chore-row__actions">
                {available && (
                  <button className="pair__link" disabled={busy === c.id} onClick={() => markDone(c.id)}>Mark done</button>
                )}
                {c.openStatus === 'claimed' && (
                  <button className="pair__link" disabled={busy === c.id} onClick={() => releaseClaim(c)}>Release claim</button>
                )}
                <button className="pair__link" disabled={busy === c.id} onClick={() => toggleArchive(c)}>Archive</button>
              </div>
            </div>
          );
        })}
        {archived.map((c) => (
          <div key={c.id} className="row">
            <div className="row__main">
              <span className="row__title" style={{ opacity: .5 }}>{c.title}</span>
              <span className="row__sub">Archived</span>
            </div>
            <button className="pair__link" disabled={busy === c.id} onClick={() => toggleArchive(c)}>Restore</button>
          </div>
        ))}
      </div>

      {adding ? (
        <form onSubmit={add} className="pair__form" style={{ marginTop: 'var(--fh-space-5)' }}>
          <input className="pair__input" placeholder="Title" value={form.title} autoFocus
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="pair__input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input className="pair__input" type="number" step="0.01" min="0" placeholder="Value ($)"
            value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <select className="pair__input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select className="pair__input" value={form.eligible} onChange={(e) => setForm({ ...form, eligible: e.target.value })}>
            <option value="both">Either child</option>
            <option value="tom">Tom only</option>
            <option value="rose">Rose only</option>
          </select>
          <input className="pair__input" placeholder="Notes (optional)" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="pair__button" type="submit" disabled={busy === 'new' || !form.title.trim()}>Add</button>
          <button type="button" className="pair__link" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      ) : (
        <button className="pair__link" style={{ marginTop: 'var(--fh-space-5)' }} onClick={() => setAdding(true)}>
          Add a job
        </button>
      )}
    </div>
  );
}

function BonusSection({ bonusCents, onChange }) {
  const [value, setValue] = useState(dollars(bonusCents));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await call({ action: 'setBonusSetting', valueCents: cents(value) });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pair__card">
      <h2 className="pair__title" style={{ fontSize: '22px' }}>Weekly bonus amount</h2>
      <p className="pair__note">Applies to new claims only — a week already claimed keeps its rate.</p>
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-4)' }}>
        <input className="pair__input" type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="pair__button" style={{ flexShrink: 0, width: 'auto', padding: '0 var(--fh-space-6)' }} disabled={busy} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

export default function ChoresManager({ library, queue, kids, bonusCents }) {
  // Simplest correct refresh — every number here is server-computed and
  // must never drift from an optimistic local guess, same reasoning as
  // TodoSection's reload-after-write.
  const onChange = () => window.location.reload();

  return (
    <div style={{ width: '100%' }}>
      <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
      <h1 className="pair__title">Chores</h1>
      <p className="pair__note" style={{ marginBottom: 'var(--fh-space-6)' }}>
        Claiming and submitting happen on each person&rsquo;s own view, or the fridge.
      </p>
      <ReviewSection queue={queue} onChange={onChange} />
      <OwedSection kids={kids} onChange={onChange} />
      <LibrarySection library={library} onChange={onChange} />
      <BonusSection bonusCents={bonusCents} onChange={onChange} />
    </div>
  );
}
