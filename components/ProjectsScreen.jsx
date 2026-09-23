'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { PIPELINE_LABELS } from '@/lib/projects';

const VIEW_IDLE_MS = 60000;
const OWNER_LABELS = { matt: 'Matt', renee: 'Renée', rose: 'Rose', tom: 'Tom' };
const PROJECT_PIPELINES = ['contracted', 'diy', 'supply_install'];

function formatMoney(cents) {
  if (cents == null) return null;
  const hasCents = cents % 100 !== 0;
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })}`;
}

async function post(body) {
  const res = await fetch('/api/projects', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function dollarsToCents(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** What a row says depends on which group it's in — the difference
    between "start this," "chase them," "this is ready," and "blocked by
    the kitchen" is the whole point of §2 of the projects brief, and none
    of it should read as one undifferentiated grey line. */
function rowSub(job, groupKey) {
  switch (groupKey) {
    case 'needsYou':
      // Lifted here from Waiting because the expected date passed — still
      // a chase, not a plain stall, even though it shares the group.
      return job.waitingOn
        ? `Chase: ${job.waitingOn}${job.waitingExpected ? ` — expected ${job.waitingExpected}` : ''}`
        : job.nextAction ?? `${job.stageName} · no next action set`;
    case 'waiting': {
      const who = job.waitingOn;
      const since = job.daysSinceMoved != null ? `${job.daysSinceMoved} days` : null;
      return [who, since].filter(Boolean).join(' · ') || 'Waiting';
    }
    case 'ready':
      return job.budgetEst != null ? `${formatMoney(job.budgetEst)} — quote in hand` : 'Priced and decided';
    case 'queued':
      return job.blockedByTitle ? `Waiting on ${job.blockedByTitle}` : 'Parked';
    case 'due':
      return job.nextDue ? `Due ${job.nextDue}` : 'Due soon';
    default:
      return `${job.stageName} · moved ${job.daysSinceMoved} day${job.daysSinceMoved === 1 ? '' : 's'} ago`;
  }
}

function JobRow({ job, groupKey }) {
  return (
    <Link href={`/projects/${job.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="row__main">
        <span className="row__title">{job.title}</span>
        <span className="row__sub">{rowSub(job, groupKey)}</span>
      </div>
      <div className="row__end">
        {job.owner && <span className="row__meta">{OWNER_LABELS[job.owner]}</span>}
      </div>
    </Link>
  );
}

function AddJobForm({ onSaved, onCancel }) {
  const [type, setType] = useState('project');
  const [pipeline, setPipeline] = useState('contracted');
  const [title, setTitle] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [owner, setOwner] = useState('');
  const [budgetEst, setBudgetEst] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(false);
    const res = await post({
      action: 'add', title: title.trim(), type, pipeline: type === 'maintenance' ? 'maintenance' : pipeline,
      nextAction: nextAction.trim() || null, owner: owner || null,
      budgetEst: budgetEst.trim() === '' ? null : dollarsToCents(budgetEst),
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <div className="mp-switch">
        <button type="button" className={`mp-switch__seg${type === 'project' ? ' mp-switch__seg--active' : ''}`}
                onClick={() => setType('project')}>Project</button>
        <button type="button" className={`mp-switch__seg${type === 'maintenance' ? ' mp-switch__seg--active' : ''}`}
                onClick={() => setType('maintenance')}>Recurring</button>
      </div>

      {type === 'project' && (
        <div className="mp-switch" style={{ flexWrap: 'wrap' }}>
          {PROJECT_PIPELINES.map((p) => (
            <button key={p} type="button" className={`mp-switch__seg${pipeline === p ? ' mp-switch__seg--active' : ''}`}
                    onClick={() => setPipeline(p)}>
              {PIPELINE_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <input placeholder="Next action (optional)" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
      <select value={owner} onChange={(e) => setOwner(e.target.value)}>
        <option value="">No owner yet</option>
        {Object.entries(OWNER_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <input placeholder="Budget estimate ($, optional)" inputMode="decimal" value={budgetEst}
             onChange={(e) => setBudgetEst(e.target.value)} />

      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy || !title.trim()}>
          Add
        </button>
      </div>
    </form>
  );
}

export default function ProjectsScreen({ view, fridge, role }) {
  const router = useRouter();
  const viewTimer = useRef(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!fridge) return undefined;
    const arm = () => {
      clearTimeout(viewTimer.current);
      viewTimer.current = setTimeout(() => router.push('/'), VIEW_IDLE_MS);
    };
    arm();
    window.addEventListener('pointerdown', arm);
    return () => {
      window.removeEventListener('pointerdown', arm);
      clearTimeout(viewTimer.current);
    };
  }, [fridge, router]);

  const canEdit = !fridge && role === 'adult';
  const onSaved = () => { setAdding(false); router.refresh(); };

  return (
    <div className="pj-page" data-register="household">
      <div className="pj-header">
        <Link href="/" className="wo-back" aria-label="Back to the wall">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="pj-header__title">Projects</h1>
          <p className="pj-header__note">What&rsquo;s stalled, what&rsquo;s moving, what&rsquo;s worth picking up next.</p>
        </div>
      </div>

      {view.groups.length === 0 && <p className="hol-empty">Nothing here yet.</p>}

      {view.groups.map((group) => (
        <div key={group.key}>
          {/* No attention colour on this header, deliberately — §7 of the
              brief: this module stays plain and factual even for Needs
              you, in contrast to the register's A status or a tile's
              amber wash. "34 days," stated once, not shouted. */}
          <h2 className="group">
            {group.label}
            <span className="group__count">{group.jobs.length}</span>
          </h2>
          <div className="card">
            {group.jobs.map((job) => <JobRow key={job.id} job={job} groupKey={group.key} />)}
          </div>
        </div>
      ))}

      {canEdit && !adding && (
        <button type="button" className="sc-entry-cta" style={{ marginTop: 'var(--fh-space-4)' }}
                onClick={() => setAdding(true)}>
          Add a job
        </button>
      )}
      {adding && (
        <div className="hol-form-wrap">
          <AddJobForm onSaved={onSaved} onCancel={() => setAdding(false)} />
        </div>
      )}
    </div>
  );
}
