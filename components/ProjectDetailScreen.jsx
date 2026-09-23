'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CaretLeft, CaretRight } from '@phosphor-icons/react/ssr';
import { PIPELINES } from '@/lib/projects';

const VIEW_IDLE_MS = 60000;
const OWNER_LABELS = { matt: 'Matt', renee: 'Renée', rose: 'Rose', tom: 'Tom' };
const BLOCKED_LABELS = { vendor: 'Waiting on a vendor', funds: 'Ready — waiting on funds', other_job: 'Queued behind another job' };
const QUOTE_STATUS_LABELS = { requested: 'Requested', received: 'Received', accepted: 'Accepted', declined: 'Declined' };

function formatMoney(cents) {
  if (cents == null) return null;
  const hasCents = cents % 100 !== 0;
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function dollarsToCents(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

async function post(body) {
  const res = await fetch('/api/projects', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

/** The stage strip — every stage in the pipeline, reached or not, current
    one carrying the weight. Must hold together at four stages and at
    seven without looking broken at either end (§4 of the brief). */
function StageStrip({ stages, currentPosition }) {
  return (
    <div className="pj-strip">
      {stages.map((s) => (
        <div key={s.id} className={`pj-strip__seg${s.position === currentPosition ? ' pj-strip__seg--current' : ''}${s.position < currentPosition ? ' pj-strip__seg--past' : ''}`}>
          <span className="pj-strip__name">{s.name}</span>
        </div>
      ))}
    </div>
  );
}

/** Idea 12 days · Research 47 days — a quiet horizontal band, never a
    chart, and only for stages with a real recorded duration. A stage
    reached before this module existed to time it just isn't shown. */
function StageHistory({ stages }) {
  const withDuration = stages
    .filter((s) => s.entered_at)
    .map((s) => ({
      name: s.name,
      days: daysBetween(s.entered_at, s.completed_at ?? new Date().toISOString()),
      current: !s.completed_at,
    }));
  if (withDuration.length === 0) return null;
  return (
    <p className="pj-history">
      {withDuration.map((s, i) => (
        <span key={s.name}>
          {i > 0 && ' · '}
          {s.name} {s.days} day{s.days === 1 ? '' : 's'}{s.current ? ' so far' : ''}
        </span>
      ))}
    </p>
  );
}

function NextActionEditor({ job, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(job.nextAction ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await post({ action: 'edit', ...jobToPayload(job), nextAction: value.trim() || null });
    setBusy(false);
    setEditing(false);
    onSaved();
  };

  if (!canEdit) {
    return <p className="pj-next">{job.nextAction ?? 'No next action set'}</p>;
  }
  if (!editing) {
    return (
      <button type="button" className="pj-next pj-next--editable" onClick={() => setEditing(true)}>
        {job.nextAction ?? 'Set the next action'}
      </button>
    );
  }
  return (
    <div className="pj-next-edit">
      <input value={value} onChange={(e) => setValue(e.target.value)} autoFocus placeholder="Call Brett for a quote" />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={() => setEditing(false)}>Cancel</button>
        <button type="button" className="mp-add__submit" style={{ flex: 1 }} disabled={busy} onClick={save}>Save</button>
      </div>
    </div>
  );
}

/** Every field editJob() accepts, pre-filled from the current job — a
    partial POST would otherwise null out whatever this form doesn't ask
    about, since the route does a full-row update. */
function jobToPayload(job) {
  return {
    id: job.id, title: job.title, nextAction: job.nextAction, owner: job.owner, due: job.due,
    budgetEst: job.budgetEst, budgetActual: job.budgetActual, status: job.status,
    blockedReason: job.blockedReason, blockedBy: job.blockedBy, fundingSource: job.fundingSource,
    waitingOn: job.waitingOn, waitingSince: job.waitingSince, waitingExpected: job.waitingExpected,
    registerItemId: job.registerItemId,
  };
}

function DetailsForm({ job, onSaved, onCancel }) {
  const [owner, setOwner] = useState(job.owner ?? '');
  const [due, setDue] = useState(job.due ?? '');
  const [budgetEst, setBudgetEst] = useState(job.budgetEst != null ? String(job.budgetEst / 100) : '');
  const [budgetActual, setBudgetActual] = useState(job.budgetActual != null ? String(job.budgetActual / 100) : '');
  const [status, setStatus] = useState(job.status);
  const [blockedReason, setBlockedReason] = useState(job.blockedReason ?? '');
  const [fundingSource, setFundingSource] = useState(job.fundingSource ?? '');
  const [waitingOn, setWaitingOn] = useState(job.waitingOn ?? '');
  const [waitingSince, setWaitingSince] = useState(job.waitingSince ?? '');
  const [waitingExpected, setWaitingExpected] = useState(job.waitingExpected ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await post({
      action: 'edit', ...jobToPayload(job),
      owner: owner || null, due: due || null,
      budgetEst: budgetEst.trim() === '' ? null : dollarsToCents(budgetEst),
      budgetActual: budgetActual.trim() === '' ? null : dollarsToCents(budgetActual),
      status, blockedReason: blockedReason || null, fundingSource: fundingSource || null,
      waitingOn: waitingOn.trim() || null,
      waitingSince: waitingOn.trim() ? (waitingSince || null) : null,
      waitingExpected: waitingOn.trim() ? (waitingExpected || null) : null,
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <select value={owner} onChange={(e) => setOwner(e.target.value)}>
        <option value="">No owner</option>
        {Object.entries(OWNER_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <input style={{ flex: 1 }} placeholder="Budget estimate ($)" inputMode="decimal" value={budgetEst}
               onChange={(e) => setBudgetEst(e.target.value)} />
        <input style={{ flex: 1 }} placeholder="Budget actual ($)" inputMode="decimal" value={budgetActual}
               onChange={(e) => setBudgetActual(e.target.value)} />
      </div>

      <div className="mp-switch">
        {['active', 'parked', 'done'].map((s) => (
          <button key={s} type="button" className={`mp-switch__seg${status === s ? ' mp-switch__seg--active' : ''}`}
                  onClick={() => setStatus(s)}>
            {s === 'active' ? 'Active' : s === 'parked' ? 'Parked' : 'Done'}
          </button>
        ))}
      </div>

      <select value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)}>
        <option value="">Not blocked</option>
        <option value="vendor">Waiting on a vendor</option>
        <option value="funds">Ready — waiting on funds</option>
        <option value="other_job">Queued behind another job</option>
      </select>
      {blockedReason === 'funds' && (
        <select value={fundingSource} onChange={(e) => setFundingSource(e.target.value)}>
          <option value="">Funding source undecided</option>
          <option value="monthly">Monthly allowance</option>
          <option value="savings">Savings</option>
          <option value="undecided">Undecided</option>
        </select>
      )}

      <input placeholder="Waiting on (who/what, e.g. &ldquo;Brett — quote&rdquo;)" value={waitingOn}
             onChange={(e) => setWaitingOn(e.target.value)} />
      {waitingOn.trim() && (
        <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
          <input style={{ flex: 1 }} type="date" value={waitingSince} onChange={(e) => setWaitingSince(e.target.value)} />
          <input style={{ flex: 1 }} type="date" value={waitingExpected} onChange={(e) => setWaitingExpected(e.target.value)} />
        </div>
      )}

      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-4)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

function NoteForm({ jobId, onSaved }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    await post({ action: 'add_note', jobId, body: body.trim() });
    setBusy(false);
    setBody('');
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit} style={{ marginTop: 'var(--fh-space-4)' }}>
      <input placeholder="Add a note" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="mp-add__submit" type="submit" disabled={busy || !body.trim()}>Add note</button>
    </form>
  );
}

function QuoteForm({ jobId, initial, onSaved, onCancel }) {
  const [vendor, setVendor] = useState(initial?.vendor ?? '');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount / 100) : '');
  const [status, setStatus] = useState(initial?.status ?? 'requested');
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      vendor: vendor.trim() || null, amount: amount.trim() === '' ? null : dollarsToCents(amount),
      status, validUntil: validUntil || null,
    };
    if (initial) await post({ action: 'edit_quote', id: initial.id, ...payload });
    else await post({ action: 'add_quote', jobId, ...payload });
    setBusy(false);
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
      <input placeholder="Amount ($)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {Object.entries(QUOTE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

export default function ProjectDetailScreen({ detail, fridge, role }) {
  const router = useRouter();
  const viewTimer = useRef(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [addingQuote, setAddingQuote] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const { job, stages, notes, quotes } = detail;
  const canEdit = !fridge && role === 'adult';
  const refresh = () => router.refresh();
  const stageNames = PIPELINES[job.pipeline] ?? [];

  const advance = async () => { await post({ action: 'advance', id: job.id }); refresh(); };
  const back = async () => { await post({ action: 'back', id: job.id }); refresh(); };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await post({ action: 'delete', id: job.id });
    router.push('/projects');
  };

  return (
    <div className="pj-page" data-register="household">
      <div className="pj-header">
        <Link href="/projects" className="wo-back" aria-label="Back to projects">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="pj-header__title">{job.title}</h1>
          <p className="pj-header__note">
            {job.type === 'maintenance' ? 'Recurring' : 'Project'}
            {job.owner && ` · ${OWNER_LABELS[job.owner]}`}
          </p>
        </div>
      </div>

      <NextActionEditor job={job} canEdit={canEdit} onSaved={refresh} />

      <StageStrip stages={stages} currentPosition={job.stagePosition} />
      <StageHistory stages={stages} />

      {canEdit && (
        <div className="pj-stage-controls">
          <button type="button" className="pj-stage-btn" onClick={back} disabled={job.stagePosition <= 1}>
            <CaretLeft size={18} weight="bold" /> Back
          </button>
          <button type="button" className="pj-stage-btn pj-stage-btn--primary" onClick={advance}>
            Advance <CaretRight size={18} weight="bold" />
          </button>
        </div>
      )}

      {job.blockedReason && (
        <p className="pj-flag">
          {BLOCKED_LABELS[job.blockedReason]}
          {job.blockedReason === 'other_job' && job.blockedByTitle && ` — ${job.blockedByTitle}`}
          {job.blockedReason === 'funds' && job.fundingSource && ` · ${job.fundingSource}`}
        </p>
      )}
      {job.waitingOn && (
        <p className="pj-flag">
          Waiting on: {job.waitingOn}
          {job.waitingSince && ` · since ${job.waitingSince}`}
          {job.waitingExpected && ` · expected ${job.waitingExpected}`}
        </p>
      )}

      <div className="pj-facts">
        {job.due && <span className="pj-fact">Due {job.due}</span>}
        {job.budgetEst != null && <span className="pj-fact">Est. {formatMoney(job.budgetEst)}</span>}
        {job.budgetActual != null && <span className="pj-fact">Actual {formatMoney(job.budgetActual)}</span>}
      </div>

      {job.registerItemService && (
        <Link href="/register" className="pj-register-link">
          Register: {job.registerItemService}
          {job.registerItemCostCents != null && ` · ${formatMoney(job.registerItemCostCents)}`}
        </Link>
      )}

      {canEdit && !editingDetails && (
        <button type="button" className="pair__link" onClick={() => setEditingDetails(true)}>Edit details</button>
      )}
      {editingDetails && (
        <div className="hol-form-wrap">
          <DetailsForm job={job} onSaved={() => { setEditingDetails(false); refresh(); }} onCancel={() => setEditingDetails(false)} />
        </div>
      )}

      {job.type === 'project' && (
        <>
          <h2 className="group">Quotes</h2>
          <div className="card">
            {quotes.length === 0 && <p className="hol-empty">No quotes yet.</p>}
            {quotes.map((q) => (
              editingQuoteId === q.id ? (
                <div className="row" key={q.id}>
                  <QuoteForm jobId={job.id} initial={q} onSaved={() => { setEditingQuoteId(null); refresh(); }} onCancel={() => setEditingQuoteId(null)} />
                </div>
              ) : (
                <button type="button" key={q.id} className="row" style={{ border: 0, width: '100%', cursor: canEdit ? 'pointer' : 'default' }}
                        onClick={() => canEdit && setEditingQuoteId(q.id)} disabled={!canEdit}>
                  <div className="row__main">
                    <span className="row__title">{q.vendor ?? 'Vendor not recorded'}</span>
                    <span className="row__sub">{QUOTE_STATUS_LABELS[q.status]}{q.valid_until && ` · valid until ${q.valid_until}`}</span>
                  </div>
                  <span className="row__figure">{formatMoney(q.amount) ?? '—'}</span>
                </button>
              )
            ))}
          </div>
          {canEdit && !addingQuote && (
            <button type="button" className="sc-entry-cta" style={{ marginTop: 'var(--fh-space-3)' }} onClick={() => setAddingQuote(true)}>
              Add a quote
            </button>
          )}
          {addingQuote && (
            <div className="hol-form-wrap">
              <QuoteForm jobId={job.id} onSaved={() => { setAddingQuote(false); refresh(); }} onCancel={() => setAddingQuote(false)} />
            </div>
          )}
        </>
      )}

      <h2 className="group">Notes</h2>
      <div className="card">
        {notes.length === 0 && <p className="hol-empty">No notes yet.</p>}
        {notes.map((n) => (
          <div className="row" key={n.id}>
            <div className="row__main">
              <span className="row__title">{n.body}</span>
              <span className="row__sub">{OWNER_LABELS[n.author] ?? n.author} · {new Date(n.created_at).toLocaleDateString('en-AU')}</span>
            </div>
          </div>
        ))}
      </div>
      {canEdit && <NoteForm jobId={job.id} onSaved={refresh} />}

      {canEdit && (
        <button type="button" className="mp-lib-archive" style={{ marginTop: 'var(--fh-space-6)' }} onClick={handleDelete}>
          {confirmDelete ? 'Tap again to delete' : 'Delete this job'}
        </button>
      )}
    </div>
  );
}
