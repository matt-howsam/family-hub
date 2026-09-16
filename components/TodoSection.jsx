'use client';

import { useMemo, useState } from 'react';
import { Check } from '@phosphor-icons/react/ssr';
import { subjectIcon } from '@/lib/subjectIcons';
import { groupTodos } from '@/lib/todoGrouping';

const TYPE_LABEL = {
  assignment: 'Assignment', test: 'Test', exam: 'Exam',
  assessment: 'Assessment task', task: 'Task',
};
const GROUP_LABEL = { thisWeek: 'This week', later: 'Later', undated: 'No due date', done: 'Done this week' };
const GROUP_ORDER = ['thisWeek', 'later', 'undated', 'done'];

const emptyForm = { id: null, title: '', description: '', due: '', subject: '', type: 'task', familyVisible: true };

function Row({ item, canToggle, canWrite, onToggle, onEdit }) {
  const done = Boolean(item.done_at);
  const Icon = item.subject ? subjectIcon(item.subject) : null;
  return (
    <div className="todo-row">
      {canToggle ? (
        <button
          className={`todo-row__check${done ? ' todo-row__check--done' : ''}`}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          onClick={() => onToggle(item)}
        >
          <Check size={16} />
        </button>
      ) : (
        <span className="todo-row__dot" />
      )}
      <div className={`todo-row__main${done ? ' todo-row__main--done' : ''}`} onClick={canWrite ? () => onEdit(item) : undefined}>
        <span className="todo-row__title">{item.title}</span>
        <span className="todo-row__meta">
          {Icon && <Icon size={14} className="todo-row__meta-icon" />}
          {item.subject && <span>{item.subject} · </span>}
          {item.due
            ? new Date(`${item.due}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
            : 'No date'}
        </span>
      </div>
    </div>
  );
}

export default function TodoSection({ person, personKind, subjects, items: initialItems, now, canWrite, fridge }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(null); // null = closed
  const [busy, setBusy] = useState(false);

  const nowDate = useMemo(() => new Date(now), [now]);
  const groups = useMemo(() => groupTodos(items, nowDate), [items, nowDate]);

  const canToggle = canWrite || fridge;
  const allEmpty = items.length === 0;

  async function call(body) {
    const res = await fetch('/api/todo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'failed');
    return res.json();
  }

  async function onToggle(item) {
    const done = !item.done_at;
    // Optimistic: ticking moves the item into "Done this week" (it stays
    // visible, un-tickable) rather than removing it — per Matt, 16 Sept
    // 2026: silently vanishing with no undo isn't what the brief's own
    // "un-ticking is equally available" actually asked for. Re-grouped
    // with the same pure function the server used, so this can't drift
    // from how a fresh page load would show it.
    setItems((cur) =>
      cur.map((x) => (x.id === item.id ? { ...x, done_at: done ? new Date().toISOString() : null } : x))
    );
    try {
      await call({ action: 'toggle', id: item.id, done });
    } catch {
      // revert — the API call is the source of truth
      setItems((cur) =>
        cur.map((x) => (x.id === item.id ? { ...x, done_at: item.done_at } : x))
      );
    }
  }

  function onAddNew() {
    setForm({ ...emptyForm });
  }

  function onEdit(item) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      due: item.due ?? '',
      subject: item.subject ?? '',
      type: item.type,
      familyVisible: item.familyVisible ?? true,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      if (form.id) {
        await call({ action: 'update', id: form.id, ...form });
      } else {
        await call({ action: 'create', person, ...form });
      }
      window.location.reload(); // simplest correct refresh — grouping is server-computed
    } catch {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!form.id) return;
    setBusy(true);
    try {
      await call({ action: 'delete', id: form.id });
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="pv-section">
      <div className="pv-section__label">To do</div>

      {allEmpty && <div className="pv-note">Nothing due.</div>}

      {GROUP_ORDER.map((key) =>
        groups[key].length > 0 ? (
          <div key={key} className="todo-group">
            <div className="wo-subhead">{GROUP_LABEL[key]}</div>
            <div className="wo-rows">
              {groups[key].map((item) => (
                <Row key={item.id} item={item} canToggle={canToggle} canWrite={canWrite} onToggle={onToggle} onEdit={onEdit} />
              ))}
            </div>
          </div>
        ) : null
      )}

      {canWrite && !fridge && !form && (
        <button className="pair__link" style={{ marginTop: 'var(--fh-space-5)' }} onClick={onAddNew}>
          Add an item
        </button>
      )}

      {form && (
        <form onSubmit={onSubmit} className="pair__form" style={{ marginTop: 'var(--fh-space-5)' }}>
          <input
            className="pair__input"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />
          <select className="pair__input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {personKind === 'child' && (
            <select className="pair__input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <input
            className="pair__input"
            type="date"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
          <input
            className="pair__input"
            placeholder="Notes (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--fh-space-2)', font: 'var(--fh-text-body-sm)', color: 'var(--fh-ink-body)' }}>
            <input
              type="checkbox"
              checked={form.familyVisible}
              onChange={(e) => setForm({ ...form, familyVisible: e.target.checked })}
            />
            Visible on the fridge (evening line, tomorrow only)
          </label>
          <button className="pair__button" type="submit" disabled={busy || !form.title.trim()}>
            {form.id ? 'Save' : 'Add'}
          </button>
          <button type="button" className="pair__link" onClick={() => setForm(null)}>Cancel</button>
          {form.id && (
            <button type="button" className="pair__link" onClick={onDelete}>Remove</button>
          )}
        </form>
      )}
    </div>
  );
}
