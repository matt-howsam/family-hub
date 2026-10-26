'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Trash, ArrowCounterClockwise } from '@phosphor-icons/react/ssr';

const TOAST_MS = 8000;

async function postList(body) {
  const res = await fetch('/api/shoppinglist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * Docked in the meal planner header (see PlannerScreen's "List" button) —
 * per the brief's "Where the list lives", this is a panel over the lower
 * half of the week view, not its own route. The phone equivalent is
 * components/ShoppingListScreen.jsx at /list.
 */
export default function ShoppingListPanel({ stores, list, bin, onClose }) {
  const router = useRouter();
  const [items, setItems] = useState(list);
  const [binItems, setBinItems] = useState(bin);
  const [toast, setToast] = useState(null);
  const [name, setName] = useState('');
  const [pendingName, setPendingName] = useState(null);
  const [pendingStore, setPendingStore] = useState(stores[0]?.id ?? '');
  const [leftovers, setLeftovers] = useState(null);
  const [showBin, setShowBin] = useState(false);
  const toastTimer = useRef(null);

  const showToast = (message, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName('');
    const result = await postList({ action: 'add', name: trimmed });
    if (result.needsStore) { setPendingName(trimmed); return; }
    if (result.entry) setItems((cur) => [...cur, result.entry]);
    router.refresh();
  };

  const submitPendingStore = async (e) => {
    e.preventDefault();
    if (!pendingName) return;
    const result = await postList({ action: 'add', name: pendingName, storeId: Number(pendingStore) });
    if (result.entry) setItems((cur) => [...cur, result.entry]);
    setPendingName(null);
    router.refresh();
  };

  const tick = async (entry) => {
    const next = entry.status === 'have' ? 'needed' : 'have';
    setItems((cur) => cur.map((i) => (i.id === entry.id ? { ...i, status: next } : i)));
    await postList({ action: 'setStatus', id: entry.id, status: next });
    router.refresh();
  };

  const remove = async (entry) => {
    setItems((cur) => cur.filter((i) => i.id !== entry.id));
    await postList({ action: 'delete', id: entry.id });
    router.refresh();
    showToast(`${entry.itemName} removed`, async () => {
      setItems((cur) => [...cur, entry]);
      await postList({ action: 'restore', id: entry.id });
      router.refresh();
    });
  };

  const restoreFromBin = async (entry) => {
    setBinItems((cur) => cur.filter((b) => b.id !== entry.id));
    setItems((cur) => [...cur, entry]);
    await postList({ action: 'restore', id: entry.id });
    router.refresh();
  };

  const startShop = async () => {
    const { leftovers: found } = await postList({ action: 'startShop' });
    if (!found?.length) { router.refresh(); return; }
    setLeftovers(found);
  };

  const resolveLeftover = async (entry, resolution) => {
    await postList({ action: 'resolveLeftover', id: entry.id, resolution });
    setLeftovers((cur) => {
      const next = cur.filter((l) => l.id !== entry.id);
      return next.length ? next : null;
    });
    router.refresh();
  };

  const grouped = Object.values(
    items.reduce((acc, i) => {
      (acc[i.storeId] ??= { storeName: i.storeName, storeSort: i.storeSort, items: [] }).items.push(i);
      return acc;
    }, {}),
  ).sort((a, b) => a.storeSort - b.storeSort);

  return (
    <div className="sl-backdrop" onClick={onClose}>
      <div className="sl-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sl-panel__header">
          <span className="sl-panel__title">Shopping list</span>
          <button className="sl-panel__close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {leftovers ? (
          <div className="sl-review">
            <div className="sl-panel__label">From last shop — keep or drop?</div>
            {leftovers.map((l) => (
              <div className="sl-review__row" key={l.id}>
                <span>{l.itemName} <span className="sl-review__store">· {l.storeName}</span></span>
                <div className="sl-review__actions">
                  <button onClick={() => resolveLeftover(l, 'keep')}>Keep</button>
                  <button onClick={() => resolveLeftover(l, 'drop')}>Drop</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <button className="sl-start" onClick={startShop}>Start new shop</button>

            {grouped.length === 0 && <p className="sl-empty">Nothing on the list.</p>}
            {grouped.map((group) => (
              <div className="sl-group" key={group.storeName}>
                <div className="sl-group__label">{group.storeName}</div>
                {group.items.map((entry) => (
                  <div className="sl-row" key={entry.id}>
                    <button
                      className={`sl-row__tick${entry.status === 'have' ? ' sl-row__tick--have' : ''}`}
                      onClick={() => tick(entry)}
                    >
                      {entry.status === 'have' ? 'Have' : 'Needed'}
                    </button>
                    <span className="sl-row__name">{entry.itemName}</span>
                    <button className="sl-row__delete" onClick={() => remove(entry)} aria-label="Remove">
                      <Trash size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {pendingName ? (
              <form className="sl-add" onSubmit={submitPendingStore}>
                <span className="sl-panel__label">New item: {pendingName}. Which store?</span>
                <select value={pendingStore} onChange={(e) => setPendingStore(e.target.value)}>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="submit" className="mp-add__submit">Add</button>
              </form>
            ) : (
              <form className="sl-add" onSubmit={submitAdd}>
                <input placeholder="Add an item…" value={name} onChange={(e) => setName(e.target.value)} />
                <button type="submit" className="mp-add__submit">Add</button>
              </form>
            )}

            <button className="sl-bin-toggle" onClick={() => setShowBin((v) => !v)}>
              {showBin ? 'Hide' : 'Show'} recently removed{binItems.length ? ` (${binItems.length})` : ''}
            </button>
            {showBin && (
              <div className="sl-bin">
                {binItems.length === 0 && <p className="sl-empty">Nothing removed recently.</p>}
                {binItems.map((b) => (
                  <div className="sl-row" key={b.id}>
                    <span className="sl-row__name">{b.itemName} <span className="sl-review__store">· {b.storeName}</span></span>
                    <button className="sl-row__restore" onClick={() => restoreFromBin(b)}>
                      <ArrowCounterClockwise size={18} /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {toast && (
          <div className="mp-toast">
            <span>{toast.message}</span>
            <button className="mp-toast__undo" onClick={() => { toast.undo(); setToast(null); }}>Undo</button>
          </div>
        )}
      </div>
    </div>
  );
}
