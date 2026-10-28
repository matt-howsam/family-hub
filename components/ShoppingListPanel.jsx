'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Trash, ArrowCounterClockwise } from '@phosphor-icons/react/ssr';
import { groupByCategory } from '@/lib/categories';
import UndoToast from '@/components/UndoToast';

const TOAST_MS = 4000;

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
 *
 * Unlike the phone, there's no store tab here — the iPad shows every
 * store's items at once, so the add form carries its own explicit "add
 * to" store picker instead. Either way, the store an item lands under is
 * whatever's picked at add time, never remembered from a previous add —
 * see lib/shoppinglist.js#addAdhocItem.
 */
export default function ShoppingListPanel({ stores, list, bin, categories, onClose }) {
  const router = useRouter();
  const [items, setItems] = useState(list);
  const [storeList, setStoreList] = useState(stores);
  const [binItems, setBinItems] = useState(bin);
  const [toast, setToast] = useState(null);
  const [name, setName] = useState('');
  const [addStore, setAddStore] = useState(stores[0]?.id ?? '');
  const [addCategory, setAddCategory] = useState('');
  const [addingStore, setAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
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
    if (!trimmed || !addStore) return;
    setName('');
    const result = await postList({
      action: 'add',
      name: trimmed,
      storeId: Number(addStore),
      categoryId: addCategory ? Number(addCategory) : null,
    });
    if (result.entry) setItems((cur) => [...cur, result.entry]);
    router.refresh();
  };

  const submitNewStore = async (e) => {
    e.preventDefault();
    const trimmed = newStoreName.trim();
    if (!trimmed) return;
    const result = await postList({ action: 'addStore', name: trimmed });
    if (result.store) {
      setStoreList((cur) => (cur.some((s) => s.id === result.store.id) ? cur : [...cur, result.store]));
      setAddStore(result.store.id);
    }
    setNewStoreName('');
    setAddingStore(false);
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

  // No scheduled clearing — "Have" items only stop showing once a new shop
  // starts and leaves them behind. This is the immediate, manual version:
  // clear everything currently ticked "Have", across every store at once,
  // since the iPad shows them all together rather than one store at a time.
  const clearChecked = async () => {
    const toClear = items.filter((i) => i.status === 'have');
    if (!toClear.length) return;
    const ids = toClear.map((i) => i.id);
    setItems((cur) => cur.filter((i) => !ids.includes(i.id)));
    await postList({ action: 'clearChecked', status: 'have' });
    router.refresh();
    showToast(`${toClear.length} cleared`, async () => {
      setItems((cur) => [...cur, ...toClear]);
      await Promise.all(ids.map((id) => postList({ action: 'restore', id })));
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
  )
    .sort((a, b) => a.storeSort - b.storeSort)
    .map((group) => ({ ...group, aisles: groupByCategory(group.items, categories) }));
  const hasChecked = items.some((i) => i.status === 'have');

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
            <div className="sl-panel__scroll">
              <button className="sl-start" onClick={startShop}>Start new shop</button>

              {grouped.length === 0 && <p className="sl-empty">Nothing on the list.</p>}
              {grouped.map((group) => (
                <div className="sl-group" key={group.storeName}>
                  <div className="sl-group__label">{group.storeName}</div>
                  {group.aisles.map((aisle) => (
                    <div key={aisle.key}>
                      <div className="sl-aisle-label">{aisle.label}</div>
                      {aisle.items.map((entry) => (
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
                </div>
              ))}

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
            </div>

            <div className="sl-panel__footer">
              {hasChecked && (
                <button className="sl-clear-checked" onClick={clearChecked}>Clear checked</button>
              )}
              {addingStore && (
                <form className="sl-add-store" onSubmit={submitNewStore}>
                  <input
                    placeholder="New store, e.g. Bunnings"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="mp-add__submit" disabled={!newStoreName.trim()}>Add</button>
                </form>
              )}
              <form className="sl-add" onSubmit={submitAdd}>
                <input placeholder="Add an item…" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="sl-add__row">
                  <select value={addStore} onChange={(e) => setAddStore(e.target.value)} aria-label="Add to store">
                    {storeList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button
                    type="button"
                    className="sl-add__new-store"
                    onClick={() => setAddingStore((v) => !v)}
                    aria-label="Add a new store"
                  >
                    <Plus size={16} weight="bold" />
                  </button>
                  <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)} aria-label="Aisle">
                    <option value="">Uncategorised</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="mp-add__submit" disabled={!name.trim()}>Add</button>
              </form>
            </div>
          </>
        )}

        {toast && (
          <UndoToast
            message={toast.message}
            onUndo={() => { toast.undo(); setToast(null); }}
            onDismiss={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}
