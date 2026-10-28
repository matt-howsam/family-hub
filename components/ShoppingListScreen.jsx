'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash } from '@phosphor-icons/react/ssr';
import { groupByCategory } from '@/lib/categories';
import UndoToast from '@/components/UndoToast';

const TOAST_MS = 4000;
const POLL_MS = 12000;
const QUEUE_KEY = 'fh_list_queue';

async function send(body) {
  const res = await fetch('/api/shoppinglist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('request failed');
  return res.json();
}

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage unavailable */ }
}

/**
 * The phone surface — /list, reachable directly or saved to the home
 * screen (see the brief's "Where the list lives"). Session-resilient, not
 * full offline-first: a tick made while the page is already open survives
 * a dropped signal (queued in localStorage, flushed on reconnect, synced
 * across phones by polling every ~12s) but this does not survive a cold
 * app-open with zero signal, since there's no service worker caching the
 * route itself.
 *
 * Every store shows as a tab, not just ones with items — the tab you're
 * on is "the selected list": adding an item always lands there, full stop,
 * no memory of where that item went last time (see lib/shoppinglist.js).
 */
export default function ShoppingListScreen({ stores, initialList, categories, bin }) {
  const router = useRouter();
  const [items, setItems] = useState(initialList);
  const [storeList, setStoreList] = useState(stores);
  const [activeStore, setActiveStore] = useState(
    stores.find((s) => initialList.some((i) => i.storeId === s.id))?.id ?? stores[0]?.id ?? null,
  );
  const [name, setName] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addingStore, setAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [toast, setToast] = useState(null);
  const [queueLen, setQueueLen] = useState(0);
  const [online, setOnline] = useState(true);
  const [binItems, setBinItems] = useState(bin);
  const [showBin, setShowBin] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    setQueueLen(loadQueue().length);
    setOnline(navigator.onLine);
  }, []);

  // A refresh only overwrites local state once the queue is empty — while
  // something is still waiting to be sent, the optimistic local view is
  // the truth, not whatever the server last had.
  useEffect(() => {
    if (queueLen === 0) setItems(initialList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialList]);

  const flush = async () => {
    let q = loadQueue();
    while (q.length && navigator.onLine) {
      try {
        await send(q[0]);
        q = q.slice(1);
        saveQueue(q);
        setQueueLen(q.length);
      } catch {
        break;
      }
    }
    if (q.length === 0) router.refresh();
  };

  useEffect(() => {
    const goOnline = () => { setOnline(true); flush(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const poll = setInterval(() => {
      if (navigator.onLine) {
        flush();
        try { router.refresh(); } catch { /* offline refresh, ignore */ }
      }
    }, POLL_MS);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const dispatch = async (body) => {
    if (!navigator.onLine) {
      const q = [...loadQueue(), body];
      saveQueue(q);
      setQueueLen(q.length);
      return { queued: true };
    }
    try {
      return await send(body);
    } catch {
      const q = [...loadQueue(), body];
      saveQueue(q);
      setQueueLen(q.length);
      return { queued: true };
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !activeStore) return;
    setName('');
    const result = await dispatch({
      action: 'add', name: trimmed, storeId: activeStore,
      categoryId: addCategory ? Number(addCategory) : null,
    });
    if (result.entry) setItems((cur) => [...cur, result.entry]);
    router.refresh();
  };

  const submitNewStore = async (e) => {
    e.preventDefault();
    const trimmed = newStoreName.trim();
    if (!trimmed) return;
    const result = await dispatch({ action: 'addStore', name: trimmed });
    if (result.store) {
      setStoreList((cur) => (cur.some((s) => s.id === result.store.id) ? cur : [...cur, result.store]));
      setActiveStore(result.store.id);
    }
    setNewStoreName('');
    setAddingStore(false);
    router.refresh();
  };

  // Only offered once the tab you're looking at is empty — the open-shop
  // check in lib/shoppinglist.js#archiveStore is the real guard, this is
  // just what makes the link show up in the first place.
  const removeStore = async () => {
    if (storeList.length <= 1) return;
    const store = storeList.find((s) => s.id === activeStore);
    if (!store) return;
    const remaining = storeList.filter((s) => s.id !== activeStore);
    setStoreList(remaining);
    setActiveStore(remaining[0]?.id ?? null);
    await dispatch({ action: 'removeStore', id: store.id });
    router.refresh();
    showToast(`${store.name} removed`, async () => {
      setStoreList((cur) => (cur.some((s) => s.id === store.id) ? cur : [...cur, store]));
      setActiveStore(store.id);
      await dispatch({ action: 'restoreStore', id: store.id });
      router.refresh();
    });
  };

  const tick = async (entry) => {
    const next = entry.status === 'bought' ? 'needed' : 'bought';
    setItems((cur) => cur.map((i) => (i.id === entry.id ? { ...i, status: next } : i)));
    await dispatch({ action: 'setStatus', id: entry.id, status: next });
  };

  const remove = async (entry) => {
    setItems((cur) => cur.filter((i) => i.id !== entry.id));
    await dispatch({ action: 'delete', id: entry.id });
    showToast(`${entry.itemName} removed`, async () => {
      setItems((cur) => [...cur, entry]);
      await dispatch({ action: 'restore', id: entry.id });
    });
  };

  // No scheduled clearing, and no weekly shop boundary either — bought
  // items only ever leave the list via this or a one-by-one manual delete.
  const clearChecked = async () => {
    const toClear = items.filter((i) => i.storeId === activeStore && i.status === 'bought');
    if (!toClear.length) return;
    const ids = toClear.map((i) => i.id);
    setItems((cur) => cur.filter((i) => !ids.includes(i.id)));
    await dispatch({ action: 'clearChecked', status: 'bought', storeId: activeStore });
    router.refresh();
    showToast(`${toClear.length} cleared`, async () => {
      setItems((cur) => [...cur, ...toClear]);
      await Promise.all(ids.map((id) => dispatch({ action: 'restore', id })));
      router.refresh();
    });
  };

  const restoreFromBin = async (entry) => {
    setBinItems((cur) => cur.filter((b) => b.id !== entry.id));
    setItems((cur) => [...cur, entry]);
    await dispatch({ action: 'restore', id: entry.id });
    router.refresh();
  };

  const aisles = groupByCategory(items.filter((i) => i.storeId === activeStore), categories);
  const hasChecked = items.some((i) => i.storeId === activeStore && i.status === 'bought');

  return (
    <main className="sl-phone">
      <div className="sl-phone__header">
        <Link className="wo-back" href="/" aria-label="Back to the wall"><ArrowLeft size={24} /></Link>
        <div className="sl-phone__titlebar">
          <span className="sl-panel__title">Shopping list</span>
          {(!online || queueLen > 0) && (
            <span className="sl-offline">Offline{queueLen ? ` · ${queueLen} not yet synced` : ''}</span>
          )}
        </div>

        <div className="sl-tabs">
          {storeList.map((s) => (
            <button
              key={s.id}
              className={`sl-tabs__tab${s.id === activeStore ? ' sl-tabs__tab--active' : ''}`}
              onClick={() => setActiveStore(s.id)}
            >
              {s.name}
            </button>
          ))}
          <button
            className={`sl-tabs__add${addingStore ? ' sl-tabs__add--active' : ''}`}
            onClick={() => setAddingStore((v) => !v)}
            aria-label={addingStore ? 'Close add store' : 'Add a new store'}
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>

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
      </div>

      <div className="sl-phone__scroll">
        {aisles.length === 0 && (
          <div className="sl-empty">
            <p>Nothing here.</p>
            {storeList.length > 1 && (
              <button className="sl-remove-store" onClick={removeStore}>Remove store</button>
            )}
          </div>
        )}
        {aisles.map((aisle) => (
          <div key={aisle.key}>
            <div className="sl-aisle-label">{aisle.label}</div>
            {aisle.items.map((entry) => (
              <div className={`sl-row${entry.status === 'bought' ? ' sl-row--bought' : ''}`} key={entry.id}>
                <button className="sl-row__check" onClick={() => tick(entry)} aria-label="Mark bought">
                  {entry.status === 'bought' ? '✓' : ''}
                </button>
                <span className="sl-row__name">{entry.itemName}</span>
                <button className="sl-row__delete" onClick={() => remove(entry)} aria-label="Remove">
                  <Trash size={18} />
                </button>
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
                <button className="sl-row__restore" onClick={() => restoreFromBin(b)}>Restore</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sl-phone__footer">
        {hasChecked && (
          <button className="sl-clear-checked" onClick={clearChecked}>Clear checked</button>
        )}
        <form className="sl-add" onSubmit={submitAdd}>
          <input placeholder="Add an item…" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)} aria-label="Aisle">
            <option value="">Uncategorised</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" className="mp-add__submit" disabled={!name.trim()}>Add</button>
        </form>
      </div>

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={() => { toast.undo(); setToast(null); }}
          onDismiss={() => setToast(null)}
        />
      )}
    </main>
  );
}
