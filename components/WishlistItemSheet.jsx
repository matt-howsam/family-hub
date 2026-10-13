'use client';
import { useState } from 'react';
import { PEOPLE } from '@/lib/people';

const HORIZON_LABEL = { term: 'This term', year: 'This year', later: 'Later' };

async function call(body) {
  const res = await fetch('/api/wishlist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function EditForm({ item, onSaved, onCancel }) {
  const [title, setTitle] = useState(item.title);
  const [url, setUrl] = useState(item.url ?? '');
  const [note, setNote] = useState(item.note ?? '');
  const [price, setPrice] = useState(item.price != null ? String(item.price) : '');
  const [visibility, setVisibility] = useState(item.visibility);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await call({
      action: 'update', id: item.id, title: title.trim(), url: url.trim() || null,
      note: note.trim() || null, price: price.trim() === '' ? null : Number(price), visibility,
    });
    setBusy(false);
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="What would you like?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <input placeholder="Price ($, optional)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      <input placeholder="Note — size, colour, anything (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
        <option value="family">Family — everyone can see it</option>
        <option value="chosen">Chosen people only</option>
        <option value="me">Just me</option>
      </select>
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

function SavingForForm({ item, onSaved, onCancel }) {
  const [horizon, setHorizon] = useState(item.horizon ?? 'later');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await call({ action: 'setSavingFor', id: item.id, horizon });
    setBusy(false);
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <div className="mp-switch">
        {['term', 'year', 'later'].map((h) => (
          <button key={h} type="button" className={`mp-switch__seg${horizon === h ? ' mp-switch__seg--active' : ''}`} onClick={() => setHorizon(h)}>
            {HORIZON_LABEL[h]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

export default function WishlistItemSheet({ item, isOwner, onClose, onChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [settingSavingFor, setSettingSavingFor] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [busy, setBusy] = useState(false);

  const doAction = async (action, extra) => {
    setBusy(true);
    await call({ action, id: item.id, ...extra });
    setBusy(false);
    onChange();
  };

  return (
    <div className="wo-sheet-backdrop" onClick={onClose}>
      <div className="wo-sheet" onClick={(e) => e.stopPropagation()}>
        {item.hasImage && (
          <img src={`/api/wishlist/image/${item.id}`} alt="" className="wish-sheet-image" />
        )}
        <div className="wo-sheet__title">{item.title}</div>

        {item.price != null && (
          <div className="wo-sheet__row">
            <span className="wo-sheet__label">Price</span>
            <span className="wo-sheet__value">${item.price}{item.priceAsAt && ` · ${item.priceAsAt}`}</span>
          </div>
        )}
        {item.url && (
          <div className="wo-sheet__row">
            <span className="wo-sheet__label">Link</span>
            <a className="wo-sheet__value" href={item.url} target="_blank" rel="noopener noreferrer">Open</a>
          </div>
        )}
        {item.note && <p className="wo-sheet__note">{item.note}</p>}
        {item.savingFor && item.horizonLabelText && (
          <p className="wo-sheet__note">Saving for this — {item.horizonLabelText}</p>
        )}

        {isOwner && (
          <>
            {item.myCount != null && (
              <div className="wo-sheet__row">
                <span className="wo-sheet__label">My count</span>
                <span className="wo-sheet__value">${item.myCount}{item.myCountAsAt && ` · ${item.myCountAsAt}`}</span>
              </div>
            )}
            {item.deal && <p className="wo-sheet__note">Deal: {item.deal}</p>}

            {!editing && <button type="button" className="wo-sheet__close" onClick={() => setEditing(true)}>Edit</button>}
            {editing && <EditForm item={item} onSaved={() => { setEditing(false); onChange(); }} onCancel={() => setEditing(false)} />}

            {!item.savingFor && !settingSavingFor && (
              <button type="button" className="wo-sheet__close" onClick={() => setSettingSavingFor(true)}>Saving for this</button>
            )}
            {item.savingFor && (
              <button type="button" className="wo-sheet__close" disabled={busy} onClick={() => doAction('unsetSavingFor')}>
                Stop saving for this
              </button>
            )}
            {settingSavingFor && <SavingForForm item={item} onSaved={() => { setSettingSavingFor(false); onChange(); }} onCancel={() => setSettingSavingFor(false)} />}

            <button type="button" className="wo-sheet__action" disabled={busy} onClick={() => doAction('markGot')}>Got it</button>
            <button type="button" className="wo-sheet__close" disabled={busy} onClick={onRemove}>Remove</button>
          </>
        )}

        {!isOwner && (
          <>
            {!item.coveredBy && (
              <>
                <input
                  className="pair__input" placeholder="Private note (optional) — e.g. going halves with Tom"
                  value={coverNote} onChange={(e) => setCoverNote(e.target.value)}
                  style={{ marginBottom: 'var(--fh-space-3)' }}
                />
                <button type="button" className="wo-sheet__action" disabled={busy} onClick={() => doAction('cover', { note: coverNote.trim() || undefined })}>
                  I&rsquo;ve got this
                </button>
              </>
            )}
            {item.coveredBy && item.coveredByMe && (
              <>
                <p className="wo-sheet__note">Covered by you{item.coverNote ? ` — ${item.coverNote}` : ''}</p>
                <button type="button" className="wo-sheet__action" disabled={busy} onClick={() => doAction('markGiven')}>Given</button>
                <button type="button" className="wo-sheet__close" disabled={busy} onClick={() => doAction('uncover')}>Un-cover</button>
              </>
            )}
            {item.coveredBy && !item.coveredByMe && (
              <p className="wo-sheet__note">Covered by {PEOPLE[item.coveredBy]?.name ?? item.coveredBy}</p>
            )}
          </>
        )}

        <button type="button" className="wo-sheet__close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
