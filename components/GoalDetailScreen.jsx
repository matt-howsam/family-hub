'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { CapChooser } from '@/components/GoalsSection';

const HORIZON_LABEL = { term: 'This term', year: 'This year', later: 'Later' };

async function post(body) {
  const res = await fetch('/api/goals', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/** The next step — typographically dominant, first thing on the screen,
    same rule and the same `.pj-next`-style treatment as project detail. */
function NextStepEditor({ goal, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal.nextStep ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await post({ action: 'update', id: goal.id, nextStep: value.trim() || null });
    setBusy(false);
    setEditing(false);
    onSaved();
  };

  if (!editing) {
    return (
      <button type="button" className="gl-next" onClick={() => setEditing(true)}>
        {goal.nextStep ?? "What's the very next thing?"}
      </button>
    );
  }
  return (
    <div className="gl-next-edit">
      <input value={value} onChange={(e) => setValue(e.target.value)} autoFocus placeholder="Ask Mum to run me through fractions on Thursday" />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={() => setEditing(false)}>Cancel</button>
        <button type="button" className="mp-add__submit" style={{ flex: 1 }} disabled={busy} onClick={save}>Save</button>
      </div>
    </div>
  );
}

function DetailsForm({ goal, onSaved, onCancel }) {
  const [doneWhen, setDoneWhen] = useState(goal.doneWhen ?? '');
  const [hopingFor, setHopingFor] = useState(goal.hopingFor ?? '');
  const [why, setWhy] = useState(goal.why ?? '');
  const [obstacle, setObstacle] = useState(goal.obstacle ?? '');
  const [ifThen, setIfThen] = useState(goal.ifThen ?? '');
  const [horizon, setHorizon] = useState(goal.horizon ?? '');
  const [by, setBy] = useState(goal.horizon === 'date' ? (goal.by ?? '') : '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await post({
      action: 'update', id: goal.id,
      doneWhen: goal.kind === 'goal' ? (doneWhen.trim() || null) : null,
      hopingFor: hopingFor.trim() || null,
      why: why.trim() || null,
      obstacle: obstacle.trim() || null,
      ifThen: ifThen.trim() || null,
      horizon: goal.kind === 'goal' ? (horizon || null) : null,
      by: horizon === 'date' ? (by || null) : null,
    });
    setBusy(false);
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      {goal.kind === 'goal' && (
        <>
          <input placeholder="How will you know it's done?" value={doneWhen} onChange={(e) => setDoneWhen(e.target.value)} required />
          <input placeholder="Anything you're hoping happens? (optional)" value={hopingFor} onChange={(e) => setHopingFor(e.target.value)} />
          <div className="mp-switch">
            {['term', 'year', 'later'].map((h) => (
              <button key={h} type="button" className={`mp-switch__seg${horizon === h ? ' mp-switch__seg--active' : ''}`}
                      onClick={() => setHorizon(h)}>
                {HORIZON_LABEL[h]}
              </button>
            ))}
          </div>
          {horizon === 'date' ? (
            <input type="date" value={by} onChange={(e) => setBy(e.target.value)} />
          ) : (
            <button type="button" className="pair__link" style={{ marginTop: 0, marginBottom: 'var(--fh-space-3)' }} onClick={() => setHorizon('date')}>
              Set an exact date instead
            </button>
          )}
        </>
      )}
      <input placeholder="Why it matters (optional)" value={why} onChange={(e) => setWhy(e.target.value)} />
      <input placeholder="What's most likely to get in the way? (optional)" value={obstacle} onChange={(e) => setObstacle(e.target.value)} />
      <input placeholder="If that happens, I'll… (optional)" value={ifThen} onChange={(e) => setIfThen(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-4)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

function AddStoneForm({ aimId, onSaved, onCancel }) {
  const [title, setTitle] = useState('');
  const [doneWhen, setDoneWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState(null);

  const doCreate = async () => {
    if (!title.trim() || !doneWhen.trim()) return;
    setBusy(true);
    const { res, data } = await post({ action: 'create', kind: 'goal', title: title.trim(), doneWhen: doneWhen.trim(), aimId });
    setBusy(false);
    if (!res.ok) { if (data.error === 'cap') setCap(data.active); return; }
    onSaved();
  };

  const onDemote = async (id) => {
    setBusy(true);
    await post({ action: 'demote', id });
    setCap(null);
    await doCreate();
  };

  if (cap) {
    return <CapChooser active={cap} busy={busy} onChoose={onDemote} onCancel={() => setCap(null)} />;
  }

  return (
    <form className="mp-add" onSubmit={(e) => { e.preventDefault(); doCreate(); }}>
      <input placeholder="What do you want?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <input placeholder="How will you know it's done?" value={doneWhen} onChange={(e) => setDoneWhen(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Add</button>
      </div>
    </form>
  );
}

function PartOfForm({ goal, existingAims, onSaved, onCancel }) {
  const [aimId, setAimId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!aimId && !newTitle.trim()) return;
    setBusy(true);
    await post({ action: 'setAim', id: goal.id, aimId: aimId || undefined, newAimTitle: aimId ? undefined : newTitle.trim() });
    setBusy(false);
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      {existingAims.length > 0 && (
        <select value={aimId} onChange={(e) => { setAimId(e.target.value); setNewTitle(''); }}>
          <option value="">Choose an existing aim…</option>
          {existingAims.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      )}
      <input placeholder="Or name a new aim" value={newTitle} onChange={(e) => { setNewTitle(e.target.value); setAimId(''); }} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

function DoneForm({ goal, onSaved, onCancel }) {
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await post({ action: 'complete', id: goal.id, reflection: reflection.trim() || null });
    setBusy(false);
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      {goal.kind === 'goal' && <p className="pj-flag">{goal.doneWhen}</p>}
      <input placeholder="What did it take? (optional)" value={reflection} onChange={(e) => setReflection(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>
          {goal.kind === 'aim' ? 'Got there' : 'Done'}
        </button>
      </div>
    </form>
  );
}

function LetGoForm({ goal, onReleased, onCancel }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { data } = await post({ action: 'release', id: goal.id, note: note.trim() || null });
    setBusy(false);
    onReleased(data.from);
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Not interested anymore (optional)" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Let it go</button>
      </div>
    </form>
  );
}

const STONE_META = { someday: 'Someday', released: 'Let go' };

function StonePath({ stones }) {
  if (stones.length === 0) return null;
  return (
    <>
      <h2 className="group">Stepping stones</h2>
      <div className="card" data-register="family">
        {stones.map((s) => (
          <Link key={s.id} href={`/goals/${s.id}`} className={`row${s.state === 'done' ? ' row--quiet' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row__main">
              <span className="row__title">{s.title}</span>
              {s.state === 'active' && s.nextStep && <span className="row__sub">{s.nextStep}</span>}
            </div>
            {STONE_META[s.state] && <span className="row__meta">{STONE_META[s.state]}</span>}
          </Link>
        ))}
      </div>
    </>
  );
}

export default function GoalDetailScreen({ detail, existingAims }) {
  const router = useRouter();
  const { goal, aim, stones } = detail;
  const [editingDetails, setEditingDetails] = useState(false);
  const [addingStone, setAddingStone] = useState(false);
  const [settingPartOf, setSettingPartOf] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lettingGo, setLettingGo] = useState(false);
  const [promoteCap, setPromoteCap] = useState(null); // the 3 actives, when promoting hits the cap
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const refresh = () => router.refresh();

  const doRelease = (from) => {
    setLettingGo(false);
    setToast({ from });
    refresh();
  };

  const undoRelease = async () => {
    await post({ action: 'unrelease', id: goal.id, state: toast.from });
    setToast(null);
    refresh();
  };

  const makeAim = async () => {
    await post({ action: 'makeAim', id: goal.id });
    refresh();
  };

  const promoteToActive = async () => {
    const { res, data } = await post({ action: 'promote', id: goal.id });
    if (!res.ok && data.error === 'cap') { setPromoteCap(data.active); return; }
    refresh();
  };

  const promoteWithDemote = async (demoteId) => {
    setPromoteBusy(true);
    await post({ action: 'promote', id: goal.id, demoteId });
    setPromoteBusy(false);
    setPromoteCap(null);
    refresh();
  };

  return (
    <div className="gl-page" data-register="family">
      <div className="pj-header">
        <Link href={`/people/${goal.person}`} className="wo-back" aria-label="Back to my goals">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="pj-header__title">{goal.title}</h1>
          <p className="pj-header__note">
            {goal.kind === 'aim' ? 'Aim' : 'Goal'}
            {aim && ` · part of ${aim.title}`}
          </p>
        </div>
      </div>

      {goal.state !== 'done' && goal.state !== 'released' && (
        <NextStepEditor goal={goal} onSaved={refresh} />
      )}

      {goal.state === 'done' && (
        <div className="pj-next" style={{ cursor: 'default' }}>
          {goal.kind === 'goal' ? goal.doneWhen : 'Got there'}
          {goal.reflection && <p className="pv-note" style={{ marginTop: 'var(--fh-space-3)' }}>{goal.reflection}</p>}
        </div>
      )}
      {goal.state === 'released' && (
        <div className="pj-next" style={{ cursor: 'default' }}>
          Let go
          {goal.releaseNote && <p className="pv-note" style={{ marginTop: 'var(--fh-space-3)' }}>{goal.releaseNote}</p>}
        </div>
      )}

      {goal.state !== 'done' && goal.state !== 'released' && (
        <>
          {goal.kind === 'goal' && goal.doneWhen && <p className="pj-flag">Done when: {goal.doneWhen}</p>}
          {goal.horizonLabelText && <p className="pj-flag">{goal.horizonLabelText}</p>}
          {goal.hopingFor && <p className="pj-flag">Hoping for: {goal.hopingFor}</p>}
          {goal.why && <p className="pj-flag">Why it matters: {goal.why}</p>}
          {goal.obstacle && <p className="pj-flag">Might get in the way: {goal.obstacle}</p>}
          {goal.ifThen && <p className="pj-flag">If that happens: {goal.ifThen}</p>}

          {!editingDetails && (
            <button type="button" className="pair__link" onClick={() => setEditingDetails(true)}>Edit details</button>
          )}
          {editingDetails && (
            <div className="hol-form-wrap">
              <DetailsForm goal={goal} onSaved={() => { setEditingDetails(false); refresh(); }} onCancel={() => setEditingDetails(false)} />
            </div>
          )}

          {goal.kind === 'goal' && !goal.aimId && (
            <>
              {!settingPartOf && (
                <button type="button" className="pair__link" onClick={() => setSettingPartOf(true)}>Part of…</button>
              )}
              {settingPartOf && (
                <div className="hol-form-wrap">
                  <PartOfForm goal={goal} existingAims={existingAims} onSaved={() => { setSettingPartOf(false); refresh(); }} onCancel={() => setSettingPartOf(false)} />
                </div>
              )}
              <button type="button" className="pair__link" onClick={makeAim}>Make this an aim</button>
            </>
          )}

          {goal.kind === 'aim' && (
            <>
              <StonePath stones={stones} />
              {!addingStone && (
                <button type="button" className="sc-entry-cta" style={{ marginTop: 'var(--fh-space-3)' }} onClick={() => setAddingStone(true)}>
                  Add a stepping stone
                </button>
              )}
              {addingStone && (
                <div className="hol-form-wrap">
                  <AddStoneForm aimId={goal.id} onSaved={() => { setAddingStone(false); refresh(); }} onCancel={() => setAddingStone(false)} />
                </div>
              )}
            </>
          )}

          {promoteCap && (
            <div className="hol-form-wrap">
              <CapChooser active={promoteCap} busy={promoteBusy} onChoose={promoteWithDemote} onCancel={() => setPromoteCap(null)} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-7)' }}>
            {goal.state === 'someday' && !promoteCap && (
              <button type="button" className="pj-stage-btn" style={{ flex: 1 }} onClick={promoteToActive}>Move to active</button>
            )}
            {goal.state === 'active' && (
              <button type="button" className="pj-stage-btn" style={{ flex: 1 }} onClick={() => post({ action: 'demote', id: goal.id }).then(refresh)}>
                Move to Someday
              </button>
            )}
            {!completing && (
              <button type="button" className="pj-stage-btn pj-stage-btn--primary" style={{ flex: 1 }} onClick={() => setCompleting(true)}>
                {goal.kind === 'aim' ? 'Got there' : 'Done'}
              </button>
            )}
          </div>
          {completing && (
            <div className="hol-form-wrap">
              <DoneForm goal={goal} onSaved={() => { setCompleting(false); refresh(); }} onCancel={() => setCompleting(false)} />
            </div>
          )}

          {!lettingGo && (
            <button type="button" className="mp-lib-archive" style={{ marginTop: 'var(--fh-space-6)' }} onClick={() => setLettingGo(true)}>
              Let it go
            </button>
          )}
          {lettingGo && (
            <div className="hol-form-wrap">
              <LetGoForm goal={goal} onReleased={doRelease} onCancel={() => setLettingGo(false)} />
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="mp-toast">
          <span>Let go</span>
          <button className="mp-toast__undo" onClick={undoRelease}>Undo</button>
        </div>
      )}
    </div>
  );
}
