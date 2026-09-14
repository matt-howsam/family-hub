'use client';

import { useState } from 'react';

const KIND_LABEL = {
  event: 'Event', assessment: 'Assessment', deadline: 'Deadline', notice: 'Notice',
  commendation: 'Commendation', pastoral_record: 'Pastoral record', action: 'Action',
  uniform_override: 'Uniform override',
};

const BATCH_THRESHOLD = 0.9; // docs/family-hub-gmail-ingestion-brief.md: "offer one batch approve above 0.9"

function formatDate(item) {
  if (!item.startsAt) return 'No date';
  const d = new Date(item.startsAt);
  return item.allDay
    ? d.toLocaleDateString('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    : d.toLocaleString('en-AU', {
        timeZone: item.timeZone || 'Australia/Sydney', weekday: 'short', day: 'numeric', month: 'short',
        hour: 'numeric', minute: '2-digit',
      });
}

function Card({ item, busy, onApprove, onDiscard }) {
  const persons = item.persons?.length ? item.persons.join(', ') : 'Household';
  return (
    <div className="review-card">
      <div className="review-card__head">
        <span className="review-card__kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
        <span className="review-card__confidence">{Math.round(item.confidence * 100)}%</span>
      </div>
      <div className="review-card__title">{item.title}</div>
      <div className="review-card__meta">{persons} · {formatDate(item)}</div>
      {item.location && <div className="review-card__meta">{item.location}</div>}
      {item.sourceQuote && <div className="review-card__quote">&ldquo;{item.sourceQuote}&rdquo;</div>}
      {item.sourceUrl && (
        <a className="review-card__link" href={item.sourceUrl} target="_blank" rel="noreferrer">
          Open source link
        </a>
      )}
      <div className="review-card__actions">
        <button className="pair__button" disabled={busy} onClick={() => onApprove(item.id)}>
          Approve
        </button>
        <button className="pair__button pair__button--secondary" disabled={busy} onClick={() => onDiscard(item.id)}>
          Discard
        </button>
      </div>
    </div>
  );
}

export default function ReviewQueue({ items: initial }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function act(id, action) {
    setBusy(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) setItems((cur) => cur.filter((i) => i.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function batchApprove() {
    const ids = items.filter((i) => i.confidence >= BATCH_THRESHOLD).map((i) => i.id);
    setBusy(true);
    try {
      for (const id of ids) {
        // Sequential, not Promise.all — these are ordered writes against a
        // small queue, not a bulk operation worth parallelising.
        // eslint-disable-next-line no-await-in-loop
        await fetch('/api/review', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, action: 'approve' }),
        });
      }
      setItems((cur) => cur.filter((i) => !ids.includes(i.id)));
    } finally {
      setBusy(false);
    }
  }

  const batchCount = items.filter((i) => i.confidence >= BATCH_THRESHOLD).length;

  return (
    <div className="pair__card" style={{ maxWidth: 480 }}>
      <h1 className="pair__title">Review queue</h1>

      {items.length === 0 && <p className="pair__note">Nothing to review.</p>}

      {batchCount > 1 && (
        <button className="pair__link" style={{ marginBottom: 'var(--fh-space-5)' }} disabled={busy} onClick={batchApprove}>
          Approve all {batchCount} above 90%
        </button>
      )}

      {items.map((item) => (
        <Card key={item.id} item={item} busy={busy} onApprove={(id) => act(id, 'approve')} onDiscard={(id) => act(id, 'discard')} />
      ))}
    </div>
  );
}
