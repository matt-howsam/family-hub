'use client';
import { useState } from 'react';
import { Check, ArrowCounterClockwise } from '@phosphor-icons/react/ssr';
import { choreIcon } from '@/lib/choreIcons';

const dollars = (c) => (c / 100).toLocaleString('en-AU', { maximumFractionDigits: 0 });

async function call(body) {
  const res = await fetch('/api/chores', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'failed');
  return res.json();
}

/* The job board + weekly bonus for one child's own view — see
   docs/family-hub-chores-brief.md. Claim and submit are the two "ticks";
   everything else (review, pay, the library) lives on a parent's phone.

   Claim offers a persistent undo ("claimed by mistake" — Matt, 2 Oct
   2026). Submit doesn't: it's already advanced the chore's own schedule,
   so unwinding it cleanly means reverting next_available too, not just
   this row — reversible in spirit but not worth the fragility here. The
   practical correction path for a wrong submit is the adult's "needs
   another go" in review, which puts it right back with the same child. */
export default function ChoresBoard({ person, board: initial, canWrite, fridge }) {
  const [available, setAvailable] = useState(initial.available);
  const [mine, setMine] = useState(initial.mine);
  const [bonus, setBonus] = useState(initial.bonus);
  const [earnings] = useState(initial.earnings);
  const [busyId, setBusyId] = useState(null);

  const canAct = canWrite || fridge;
  if (available.length === 0 && mine.length === 0 && !bonus.status) return null;

  async function onClaim(job) {
    setBusyId(job.id);
    const optimistic = { id: job.id, choreId: job.id, title: job.title, icon: job.icon, valueCents: job.valueCents, status: 'claimed' };
    setAvailable((cur) => cur.filter((j) => j.id !== job.id));
    setMine((cur) => [...cur, optimistic]);
    try {
      await call({ action: 'claimJob', choreId: job.id, person });
    } catch {
      setMine((cur) => cur.filter((j) => j.id !== job.id));
      setAvailable((cur) => [...cur, job]);
    } finally {
      setBusyId(null);
    }
  }

  async function onUnclaim(job) {
    setBusyId(job.id);
    setMine((cur) => cur.filter((j) => j.id !== job.id));
    setAvailable((cur) => [...cur, { id: job.choreId ?? job.id, title: job.title, icon: job.icon, valueCents: job.valueCents }]);
    try {
      await call({ action: 'unclaimJob', id: job.id });
    } catch {
      setAvailable((cur) => cur.filter((j) => j.id !== (job.choreId ?? job.id)));
      setMine((cur) => [...cur, job]);
    } finally {
      setBusyId(null);
    }
  }

  async function onSubmit(job) {
    setBusyId(job.id);
    setMine((cur) => cur.map((j) => (j.id === job.id ? { ...j, status: 'submitted' } : j)));
    try {
      await call({ action: 'submitJob', id: job.id });
    } catch {
      setMine((cur) => cur.map((j) => (j.id === job.id ? { ...j, status: job.status } : j)));
    } finally {
      setBusyId(null);
    }
  }

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
              <div className="board-job" key={j.id}>
                <Icon size={24} className="board-job__icon" />
                <div className="board-job__main">
                  <span className="board-job__title">{j.title}</span>
                  <span className="board-job__value">
                    ${dollars(j.valueCents)}
                    {j.status === 'submitted' && ' · Waiting for review'}
                    {j.status === 'redo' && ` · Needs another go${j.reviewNote ? `: ${j.reviewNote}` : ''}`}
                  </span>
                </div>
                {canAct && (j.status === 'claimed' || j.status === 'redo') && (
                  <button type="button" className="board-job__action" disabled={busyId === j.id} onClick={() => onSubmit(j)}>
                    <Check size={18} weight="bold" />
                  </button>
                )}
                {canAct && j.status === 'claimed' && (
                  <button type="button" className="board-job__undo" disabled={busyId === j.id} onClick={() => onUnclaim(j)} aria-label="Undo claim">
                    <ArrowCounterClockwise size={16} />
                  </button>
                )}
              </div>
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
                disabled={!canAct || busyId === j.id}
                onClick={() => onClaim(j)}
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
    </div>
  );
}
