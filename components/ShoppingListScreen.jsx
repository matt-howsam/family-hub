'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash } from '@phosphor-icons/react/ssr';
import { groupByCategory } from '@/lib/categories';

const TOAST_MS = 8000;
const POLL_MS = 12000;
const QUEUE_KEY = 'fh_list_queue';
const NEW_STORE = '__new__';

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
 */
export default function ShoppingListScreen({ stores, initialList, categories }) {
  const router = useRouter();
  const [items, setItems] = useState(initialList);
  const [storeList, setStoreList] = useState(stores);
  const [activeStore, setActiveStore] = useState(
    stores.find((s) => initialList.some((i) => i.storeId === s.id))?.id ?? stores[0]?.id ?? null,
  );
  const [name, setName] = useState('');
  const [pendingName, setPendingName] = useState(null);
  const [pendingStore, setPendingStore] = useState(stores[0]?.id ?? '');
  const [newStoreName, setNewStoreName] = useState('');
  const [pendingCategory, setPendingCategory] = useState(categories[0]?.id ?? '');
  const [toast, setToast] = useState(null);
  const [queueLen, setQueueLen] = useState(0);
  const [online, setOnline] = useState(true);
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
    if (!trimmed) return;
    setName('');
    const result = await dispatch({ action: 'add', name: trimmed });
    if (result.needsStore) {
      setPendingName(trimmed);
      // Default to whichever store's tab is open — the common case while
      // shopping is adding a new item to the aisle you're already in.
      setPendingStore(activeStore ?? storeList[0]?.id ?? '');
      return;
    }
    if (result.entry) {
      setItems((cur) => [...cur, result.entry]);
      setActiveStore((cur) => cur ?? result.entry.storeId);
    }
    router.refresh();
  };

  const submitPendingStore = async (e) => {
    e.preventDefault();
    if (!pendingName) return;
    const addingNewStore = pendingStore === NEW_STORE;
    if (addingNewStore && !newStoreName.trim()) return;
    const result = await dispatch({
      action: 'add',
      name: pendingName,
      categoryId: pendingCategory ? Number(pendingCategory) : null,
      ...(addingNewStore ? { newStoreName: newStoreName.trim() } : { storeId: Number(pendingStore) }),
    });
    if (result.newStore) {
      setStoreList((cur) => (cur.some((s) => s.id === result.newStore.id) ? cur : [...cur, result.newStore]));
    }
    if (result.entry) {
      setItems((cur) => [...cur, result.entry]);
      setActiveStore((cur) => cur ?? result.entry.storeId);
    }
    setPendingName(null);
    setNewStoreName('');
    setPendingStore(storeList[0]?.id ?? '');
    setPendingCategory(categories[0]?.id ?? '');
    router.refresh();
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

  const storesWithItems = storeList.filter((s) => items.some((i) => i.storeId === s.id));

  // The active tab can empty out (its last item ticked-and-cleared, deleted,
  // or restored elsewhere) while another still has items — fall back rather
  // than show a blank "Nothing here" with a live tab sitting unselected.
  useEffect(() => {
    if (storesWithItems.length && !storesWithItems.some((s) => s.id === activeStore)) {
      setActiveStore(storesWithItems[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const aisles = groupByCategory(items.filter((i) => i.storeId === activeStore), categories);

  return (
    <main className="sl-phone">
      <Link className="wo-back" href="/" aria-label="Back to the wall"><ArrowLeft size={24} /></Link>
      <div className="sl-phone__header">
        <span className="sl-panel__title">Shopping list</span>
        {(!online || queueLen > 0) && (
          <span className="sl-offline">Offline{queueLen ? ` · ${queueLen} not yet synced` : ''}</span>
        )}
      </div>

      <div className="sl-tabs">
        {storesWithItems.map((s) => (
          <button
            key={s.id}
            className={`sl-tabs__tab${s.id === activeStore ? ' sl-tabs__tab--active' : ''}`}
            onClick={() => setActiveStore(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {aisles.length === 0 && <p className="sl-empty">Nothing here.</p>}
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

      {pendingName ? (
        <form className="sl-add" onSubmit={submitPendingStore}>
          <span className="sl-panel__label">New item: {pendingName}. Which store?</span>
          <select value={pendingStore} onChange={(e) => setPendingStore(e.target.value)}>
            {storeList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value={NEW_STORE}>Add a new store…</option>
          </select>
          {pendingStore === NEW_STORE && (
            <input
              placeholder="Store name, e.g. Bunnings"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
            />
          )}
          <select value={pendingCategory} onChange={(e) => setPendingCategory(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            type="submit"
            className="mp-add__submit"
            disabled={pendingStore === NEW_STORE && !newStoreName.trim()}
          >
            Add
          </button>
        </form>
      ) : (
        <form className="sl-add" onSubmit={submitAdd}>
          <input placeholder="Add an item…" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="mp-add__submit" disabled={!name.trim()}>Add</button>
        </form>
      )}

      {toast && (
        <div className="mp-toast">
          <span>{toast.message}</span>
          <button className="mp-toast__undo" onClick={() => { toast.undo(); setToast(null); }}>Undo</button>
        </div>
      )}
    </main>
  );
}
