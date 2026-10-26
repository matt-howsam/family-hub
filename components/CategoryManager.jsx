'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';

async function call(body) {
  const res = await fetch('/api/shoppinglist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'failed');
  return res.json();
}

function CategoryRow({ category, onChange }) {
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() && name.trim() !== category.name;

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    try {
      await call({ action: 'renameCategory', id: category.id, name: name.trim() });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cat-row">
      <input className="cat-row__input" value={name} onChange={(e) => setName(e.target.value)} />
      {dirty && <button className="cat-row__save" onClick={save} disabled={busy}>Save</button>}
    </div>
  );
}

/**
 * The aisle categories the shopping list groups by — see
 * lib/shoppinglist.js (getCategories/createCategory/renameCategory) and
 * lib/categories.js#groupByCategory. A plain reload after any write, same
 * as ChoresManager's library section: this is a low-frequency admin list,
 * not a surface that needs optimistic local state.
 */
export default function CategoryManager({ categories }) {
  const [newName, setNewName] = useState('');
  const onChange = () => window.location.reload();

  const addCategory = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await call({ action: 'addCategory', name: trimmed });
    setNewName('');
    onChange();
  };

  return (
    <div style={{ width: '100%' }}>
      <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
      <h1 className="pair__title">Shopping categories</h1>
      <p className="pair__note" style={{ marginBottom: 'var(--fh-space-6)' }}>
        The aisles the shopping list groups by. Rename one below, or add a new one.
      </p>
      <div className="pair__card">
        {categories.map((c) => <CategoryRow key={c.id} category={c} onChange={onChange} />)}
        <form className="sl-add" onSubmit={addCategory} style={{ marginTop: 'var(--fh-space-5)' }}>
          <input
            placeholder="New aisle, e.g. Health & Baby"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="mp-add__submit" disabled={!newName.trim()}>Add</button>
        </form>
      </div>
    </div>
  );
}
