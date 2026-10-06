'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const emptyAdd = { title: '', isAim: false, doneWhen: '' };

async function call(body) {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'failed'), { data });
  return data;
}

/** Title + next step, the only two things a goal shows outside its own
    detail screen — see the brief's "the next step is what a goal shows
    everywhere except its own detail screen." `quiet` is the stepping-stone
    treatment: smaller, unbolded, per the existing `.row--quiet` rule. */
function GoalRow({ goal, quiet }) {
  return (
    <Link href={`/goals/${goal.id}`} className={`row${quiet ? ' row--quiet' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="row__main">
        <span className="row__title">{goal.title}</span>
        {goal.nextStep && <span className="row__sub">{goal.nextStep}</span>}
      </div>
    </Link>
  );
}

/** "Move one to Someday to make room" — the brief's does-not-refuse rule
    for a fourth active goal: never a flat refusal, always a choice. */
export function CapChooser({ active, onChoose, onCancel, busy }) {
  const [choice, setChoice] = useState(active[0]?.id ?? null);
  return (
    <div className="pair__form" style={{ marginTop: 'var(--fh-space-5)' }}>
      <p className="pv-note">You have three active goals already — which one moves to Someday?</p>
      {active.map((g) => (
        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--fh-space-2)', font: 'var(--fh-text-body-sm)', color: 'var(--fh-ink-body)' }}>
          <input type="radio" name="demote" checked={choice === g.id} onChange={() => setChoice(g.id)} />
          {g.title}
        </label>
      ))}
      <button className="pair__button" type="button" disabled={busy || !choice} onClick={() => onChoose(choice)}>
        Move it and continue
      </button>
      <button type="button" className="pair__link" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function AddForm({ person, onDone, onCancel }) {
  const [form, setForm] = useState(emptyAdd);
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState(null); // { active } when the 3-goal cap is hit

  async function submit(createBody) {
    setBusy(true);
    try {
      const res = await call({ action: 'create', person, ...createBody });
      onDone(res.id);
    } catch (e) {
      if (e.data?.error === 'cap') setCap({ active: e.data.active, pending: createBody });
      else setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!form.isAim && !form.doneWhen.trim()) return;
    await submit({
      kind: form.isAim ? 'aim' : 'goal',
      title: form.title.trim(),
      doneWhen: form.isAim ? null : form.doneWhen.trim(),
    });
  }

  async function onCapChoice(demoteId) {
    setBusy(true);
    try {
      await call({ action: 'demote', id: demoteId });
      await submit(cap.pending);
    } catch {
      setBusy(false);
    }
  }

  if (cap) {
    return (
      <CapChooser
        active={cap.active}
        busy={busy}
        onChoose={onCapChoice}
        onCancel={() => { setCap(null); setBusy(false); }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="pair__form" style={{ marginTop: 'var(--fh-space-5)' }}>
      <input
        className="pair__input"
        placeholder="What do you want?"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        autoFocus
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--fh-space-2)', font: 'var(--fh-text-body-sm)', color: 'var(--fh-ink-body)' }}>
        <input
          type="checkbox"
          checked={form.isAim}
          onChange={(e) => setForm({ ...form, isAim: e.target.checked })}
        />
        This is an aim — long term, no finish line yet
      </label>
      {!form.isAim && (
        <input
          className="pair__input"
          placeholder="How will you know it's done?"
          value={form.doneWhen}
          onChange={(e) => setForm({ ...form, doneWhen: e.target.value })}
        />
      )}
      <button className="pair__button" type="submit" disabled={busy || !form.title.trim() || (!form.isAim && !form.doneWhen.trim())}>
        Add
      </button>
      <button type="button" className="pair__link" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function Section({ title, count, children, open, onToggle }) {
  if (count === 0) return null;
  return (
    <div style={{ marginTop: 'var(--fh-space-6)' }}>
      <button
        type="button"
        className="group"
        style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer' }}
        onClick={onToggle}
      >
        {title} <span className="group__count">{count}</span>
      </button>
      {open && <div className="card" data-register="family">{children}</div>}
    </div>
  );
}

export default function GoalsSection({ person, goals }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState({ someday: false, done: false, released: false });

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));
  const empty = goals.active.length === 0 && goals.aims.length === 0;

  return (
    <div className="pv-section">
      <div className="pv-section__label">My goals</div>

      {empty && !adding && <div className="pv-note">Nothing here yet. Start with something small.</div>}

      {(goals.active.length > 0 || goals.aims.length > 0) && (
        <div className="card" data-register="family">
          {goals.active.map((g) => <GoalRow key={g.id} goal={g} />)}
          {goals.aims.map((aim) => (
            <div key={aim.id}>
              <GoalRow goal={aim} />
              {aim.stones.map((s) => <GoalRow key={s.id} goal={s} quiet />)}
            </div>
          ))}
        </div>
      )}

      {!adding && (
        <button type="button" className="pair__link" onClick={() => setAdding(true)}>
          Add a goal
        </button>
      )}
      {adding && (
        <AddForm
          person={person}
          onCancel={() => setAdding(false)}
          onDone={(id) => router.push(`/goals/${id}`)}
        />
      )}

      <Section title="Someday" count={goals.someday.length} open={open.someday} onToggle={() => toggle('someday')}>
        {goals.someday.map((g) => <GoalRow key={g.id} goal={g} />)}
      </Section>

      <Section title="Done" count={goals.done.length} open={open.done} onToggle={() => toggle('done')}>
        {goals.done.map((g) => <GoalRow key={g.id} goal={g} />)}
      </Section>

      <Section title="Let go" count={goals.released.length} open={open.released} onToggle={() => toggle('released')}>
        {goals.released.map((g) => <GoalRow key={g.id} goal={g} />)}
      </Section>
    </div>
  );
}
