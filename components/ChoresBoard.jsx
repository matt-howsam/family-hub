'use client';
import { useState } from 'react';
import { Check } from '@phosphor-icons/react/ssr';
import { choreIcon } from '@/lib/choreIcons';

const dollars = (c) => (c / 100).toLocaleString('en-AU', { maximumFractionDigits: 0 });

async function call(body) {
  const res = await fetch('/api/chores', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'failed');
  return res.json();
}

/* The detail sheet behind every chore row — see docs/family-hub-chores-brief.md
   and Matt's request, 10 Oct 2026, to replace the tick/undo icons with
   something unambiguous. One state-appropriate primary button, nothing else:

   - No chore_job yet (opened from Available), or one sitting `claimed`/`redo`
     (work still left to confirm) → Submit for Review.
   - `submitted` (genuinely in review) → Cancel Review, back to Available.

   Nothing is written on row-tap any more — only the sheet's own button
   writes anything — so there's no separate "claimed, not yet submitted"
   step left to need its own undo. Reading the notes and deciding not to
   confirm *is* the undo. */
function ChoreSheet({ job, person, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const isSubmitted = job.status === 'submitted';
  const label = isSubmitted ? 'Cancel Review' : 'Submit for Review';

  async function onPrimary() {
    setBusy(true);
    setError(false);
    try {
      if (isSubmitted) {
        await call({ action: 'cancelReview', id: job.id });
      } else if (job.id) {
        await call({ action: 'submitJob', id: job.id });
      } else {
        await call({ action: 'claimAndSubmit', choreId: job.choreId, person });
      }
      onDone();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="wo-sheet-backdrop" onClick={onClose}>
      <div className="wo-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="wo-sheet__title">{job.title}</div>

        {job.status === 'redo' && (
          <p className="wo-sheet__flag">
            Needs another go{job.reviewNote ? `: ${job.reviewNote}` : ''}
          </p>
        )}
        {job.notes && <p className="wo-sheet__note">{job.notes}</p>}

        <div className="wo-sheet__row">
          <span className="wo-sheet__label">Value</span>
          <span className="wo-sheet__value">${dollars(job.valueCents)}</span>
        </div>
        {isSubmitted && (
          <div className="wo-sheet__row">
            <span className="wo-sheet__label">Status</span>
            <span className="wo-sheet__value">Waiting for review</span>
          </div>
        )}

        {error && <p className="wo-sheet__flag">Didn&rsquo;t save — try again.</p>}

        <button type="button" className="wo-sheet__action" disabled={busy} onClick={onPrimary}>
          {label}
        </button>
        <button type="button" className="wo-sheet__close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* The job board + weekly bonus for one child's own view. Claiming and
   submitting happen inside the sheet above; everything else (review, pay,
   the library) lives on a parent's phone. */
export default function ChoresBoard({ person, board: initial, canWrite, fridge }) {
  // Available/mine are never mutated client-side any more — a sheet action
  // reloads the page (below) rather than hand-reconciling local state, so
  // these just read straight from props.
  const { available, mine } = initial;
  const [bonus, setBonus] = useState(initial.bonus);
  const [earnings] = useState(initial.earnings);
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(null); // the job whose sheet is open, or null

  const canAct = canWrite || fridge;
  if (available.length === 0 && mine.length === 0 && !bonus.status) return null;

  async function onClaimBonus() {
    setBusyId('bonus');
    const prev = bonus;
    setBonus((b) => ({ ...b, status: 'claimed' }));
    try {
      await call({ action: 'claimBonus', person });
    } catch {
      setBonus(prev);
    } finally {
      setBusyId(null);
    }
  }

  // The board's own numbers (earnings, what's left of a redo note, the
  // bonus state) are all server-computed and must never drift from an
  // optimistic guess — simplest correct refresh after any sheet action,
  // same reasoning as ChoresManager's onChange after every write there.
  function onSheetDone() {
    setOpen(null);
    window.location.reload();
  }

  const bonusLabel = {
    null: `Did my part this week · $${dollars(bonus.valueCents)}`,
    not_yet: 'Not yet',
    claimed: 'Waiting on Mum or Dad',
    approved: 'Approved — on its way',
    declined: null, // never shown — parent phones only
  }[bonus.status];

  return (
    <div className="pv-section">
      <div className="pv-section__label">Chores</div>

      {bonusLabel && (
        <button
          type="button"
          className={`board-bonus${bonus.status === 'claimed' || bonus.status === 'approved' ? ' board-bonus--done' : ''}`}
          disabled={!canAct || bonus.status === 'claimed' || bonus.status === 'approved' || busyId === 'bonus'}
          onClick={onClaimBonus}
        >
          {(bonus.status === 'claimed' || bonus.status === 'approved') && <Check size={20} weight="bold" />}
          <span>{bonusLabel}</span>
        </button>
      )}

      {mine.length > 0 && (
        <div className="board-group">
          <div className="board-group__label">My jobs</div>
          {mine.map((j) => {
            const Icon = choreIcon(j.icon);
            return (
              <button
                type="button" key={j.id} className="board-job board-job--claimable"
                disabled={!canAct} onClick={() => setOpen(j)}
              >
                <Icon size={24} className="board-job__icon" />
                <div className="board-job__main">
                  <span className="board-job__title">{j.title}</span>
                  <span className="board-job__value">
                    ${dollars(j.valueCents)}
                    {j.status === 'submitted' && ' · Waiting for review'}
                    {j.status === 'redo' && ' · Needs another go'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {available.length > 0 && (
        <div className="board-group">
          <div className="board-group__label">Available</div>
          {available.map((j) => {
            const Icon = choreIcon(j.icon);
            return (
              <button
                type="button" key={j.id} className="board-job board-job--claimable"
                disabled={!canAct} onClick={() => setOpen({ choreId: j.id, title: j.title, icon: j.icon, notes: j.notes, valueCents: j.valueCents })}
              >
                <Icon size={24} className="board-job__icon" />
                <div className="board-job__main">
                  <span className="board-job__title">{j.title}</span>
                  <span className="board-job__value">${dollars(j.valueCents)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="chores-earned">
        <span className="chores-earned__figure">${dollars(earnings.thisWeekCents)} this week</span>
        <span className={`chores-earned__badge${earnings.owedCents > 0 ? '' : ' chores-earned__badge--paid'}`}>
          ${dollars(earnings.owedCents)} owed
        </span>
      </div>

      {open && <ChoreSheet job={open} person={person} onClose={() => setOpen(null)} onDone={onSheetDone} />}
    </div>
  );
}
