'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, CaretUp, CaretDown } from '@phosphor-icons/react/ssr';
import { PEOPLE } from '@/lib/people';
import WishlistItemSheet from './WishlistItemSheet';

async function call(body) {
  const res = await fetch('/api/wishlist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function Thumb({ item }) {
  if (!item.hasImage) {
    return <div className="wish-thumb wish-thumb--placeholder"><Gift size={22} /></div>;
  }
  return <img src={`/api/wishlist/image/${item.id}`} alt="" className="wish-thumb" />;
}

function ItemRow({ item, isOwner, isFirst, isLast, onOpen, onMoveUp, onMoveDown }) {
  return (
    <div className="row wish-row" onClick={() => onOpen(item)} style={{ cursor: 'pointer' }}>
      <Thumb item={item} />
      <div className="row__main">
        <span className="row__title">{item.title}</span>
        <span className="row__sub">
          {item.price != null && `$${item.price}`}
          {item.savingFor && ' · Saving for this'}
          {!isOwner && item.coveredByMe && ' · Covered by you'}
          {!isOwner && item.coveredBy && !item.coveredByMe && ' · Covered'}
        </span>
      </div>
      {isOwner && (
        <div className="wish-row__reorder" onClick={(e) => e.stopPropagation()}>
          <button type="button" disabled={isFirst} onClick={() => onMoveUp(item.id)} aria-label="Move up">
            <CaretUp size={16} weight="bold" />
          </button>
          <button type="button" disabled={isLast} onClick={() => onMoveDown(item.id)} aria-label="Move down">
            <CaretDown size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}

function AddForm({ onDone, onCancel }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { id } = await call({ action: 'create', title: title.trim(), url: url.trim() || undefined });
      if (url.trim() && id) {
        await fetch('/api/wishlist/fetch-url', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ wishId: id, url: url.trim() }),
        }).catch(() => {}); // fails quietly — the item already saved either way
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="pair__form" style={{ marginTop: 'var(--fh-space-5)' }}>
      <input className="pair__input" placeholder="What would you like?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <input className="pair__input" placeholder="Paste a link, or just type it (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button className="pair__button" type="submit" disabled={busy || !title.trim()}>Add</button>
      <button type="button" className="pair__link" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function GotShelf({ got, open, onToggle }) {
  if (got.length === 0) return null;
  return (
    <div style={{ marginTop: 'var(--fh-space-6)' }}>
      <button type="button" className="group" style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer' }} onClick={onToggle}>
        Got <span className="group__count">{got.length}</span>
      </button>
      {open && (
        <div className="card" data-register="family">
          {got.map((item) => (
            <div className="row row--quiet" key={item.id}>
              <div className="row__main">
                <span className="row__title">{item.title}</span>
                <span className="row__sub">
                  {item.coveredBy ? `Got it · from ${PEOPLE[item.coveredBy]?.name ?? item.coveredBy}` : 'Got it'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* The Wishlist tab — see docs/family-hub-wishlist-brief.md. Unlike Goals,
   this renders for every viewer, not just the owner: default visibility is
   'family', so there's something to show on someone else's page from day
   one. The privacy-sensitive part (covers, my count) is already handled
   inside lib/wishlist.js#getWishlistView — this component just renders
   whatever fields actually arrived. */
export default function WishlistSection({ person, wishlist, isOwner, fridge }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [showGot, setShowGot] = useState(false);
  const [toast, setToast] = useState(null);

  const { listed, got } = wishlist;
  const refresh = () => router.refresh();

  if (fridge) {
    if (listed.length === 0) return null;
    return (
      <div className="pv-section">
        <div className="pv-section__label">Wishlist</div>
        <div className="card" data-register="family">
          {listed.map((item) => (
            <div className="row wish-row" key={item.id}>
              <Thumb item={item} />
              <div className="row__main">
                <span className="row__title">{item.title}</span>
                {item.price != null && <span className="row__sub">${item.price}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (listed.length === 0 && !isOwner) return null;

  async function onRemove(item) {
    await call({ action: 'remove', id: item.id });
    setOpen(null);
    setToast({ item });
    refresh();
  }

  async function undoRemove() {
    await call({ action: 'unremove', id: toast.item.id });
    setToast(null);
    refresh();
  }

  return (
    <div className="pv-section">
      <div className="pv-section__label">Wishlist</div>

      {listed.length === 0 && isOwner && !adding && (
        <div className="pv-note">Nothing yet. Start with the thing you keep mentioning.</div>
      )}

      {listed.length > 0 && (
        <div className="card" data-register="family">
          {listed.map((item, i) => (
            <ItemRow
              key={item.id} item={item} isOwner={isOwner} isFirst={i === 0} isLast={i === listed.length - 1}
              onOpen={setOpen}
              onMoveUp={(id) => call({ action: 'moveUp', id }).then(refresh)}
              onMoveDown={(id) => call({ action: 'moveDown', id }).then(refresh)}
            />
          ))}
        </div>
      )}

      {isOwner && !adding && (
        <button type="button" className="pair__link" onClick={() => setAdding(true)}>Add to your wishlist</button>
      )}
      {isOwner && adding && (
        <AddForm onCancel={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />
      )}

      {isOwner && <GotShelf got={got} open={showGot} onToggle={() => setShowGot((s) => !s)} />}

      {open && (
        <WishlistItemSheet
          item={open} isOwner={isOwner}
          onClose={() => setOpen(null)}
          onChange={() => { setOpen(null); refresh(); }}
          onRemove={() => onRemove(open)}
        />
      )}

      {toast && (
        <div className="mp-toast">
          <span>Removed</span>
          <button className="mp-toast__undo" onClick={undoRemove}>Undo</button>
        </div>
      )}
    </div>
  );
}
