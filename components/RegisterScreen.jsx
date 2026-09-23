'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { formatMoney, SECTIONS } from '@/lib/register';

const VIEW_IDLE_MS = 60000;

const SECTION_OPTIONS = SECTIONS.map((s) => ({ value: s.key, label: s.label }));
const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'per_term', label: 'Per term' },
  { value: 'fixed_term', label: 'Fixed term' },
  { value: 'one_off', label: 'One-off' },
];
const COST_PERIOD_OPTIONS = [
  { value: '', label: 'No period (TBC / one-off)' },
  { value: 'month', label: 'Per month' },
  { value: 'year', label: 'Per year' },
  { value: 'term', label: 'Per term' },
];
const COST_KIND_OPTIONS = [
  { value: 'actual', label: 'Actual — a known figure' },
  { value: 'working_avg', label: 'Working average' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'paid_to_date', label: 'Paid to date' },
  { value: 'tbc', label: 'TBC — not known yet' },
];
const PERIOD_WORD = { month: 'mo', year: 'yr', term: 'term' };
const COST_KIND_LABEL = { working_avg: 'working avg', estimate: 'estimate', allowance: 'allowance' };

/** "per month", "working avg / mo", "paid to date", "TBC" — the caption
    that keeps an estimate from reading as an actual. See §7.2: "Cost bases
    are genuinely mixed and the design must not flatten them." */
function costCaption(item) {
  if (item.costKind === 'tbc') return 'TBC';
  if (item.costKind === 'paid_to_date') return 'paid to date';
  const per = item.costPeriod ? PERIOD_WORD[item.costPeriod] : null;
  if (item.costKind === 'actual') return per ? `per ${per}` : null;
  const kind = COST_KIND_LABEL[item.costKind];
  return per ? `${kind} / ${per}` : kind;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(`${dateStr}T00:00:00Z`) - new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000);
}

function renewalLine(item) {
  if (!item.renewalLabel && !item.renewalDate) return null;
  const days = daysUntil(item.renewalDate);
  if (days != null && days >= 0 && days <= 90) {
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days} days`;
    return `${item.renewalLabel ?? item.renewalDate} · ${when}`;
  }
  return item.renewalLabel ?? item.renewalDate;
}

async function post(body) {
  const res = await fetch('/api/register', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function dollarsToCents(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** One line item, fridge or phone. The fridge never renders `notes` — that
    field carries the paper's real policy numbers, rego plates and
    "switching to X" commentary, exactly the content §6 keeps off the wall.
    `hideCostOnFridge` additionally blanks the dollar figure itself, for the
    one row (the mortgage) the brief names specifically. */
function ItemRow({ item, fridge }) {
  const hideCost = fridge && item.hideCostOnFridge;
  const caption = costCaption(item);
  const renewal = renewalLine(item);
  return (
    <>
      <div className="row__main">
        <span className="row__title">{item.service}</span>
        <span className="row__sub">
          {item.provider}
          {item.provider && (item.frequency || renewal) && ' · '}
          {renewal}
        </span>
      </div>
      <div className="row__end">
        {hideCost ? (
          <span className="row__figure--none">—</span>
        ) : item.costCents == null ? (
          <span className="row__figure--none">TBC</span>
        ) : (
          <span className="row__figure">{formatMoney(item.costCents)}</span>
        )}
        {!hideCost && caption && <span className="row__meta">{caption}</span>}
        {item.status !== 'k' && (
          <span className={`rg-status rg-status--${item.status}`}>{item.status === 'a' ? 'Action' : 'Review'}</span>
        )}
      </div>
    </>
  );
}

function ItemForm({ initial, onSaved, onCancel, onDelete }) {
  const [section, setSection] = useState(initial?.section ?? SECTIONS[0].key);
  const [service, setService] = useState(initial?.service ?? '');
  const [provider, setProvider] = useState(initial?.provider ?? '');
  const [cost, setCost] = useState(initial?.costCents != null ? String(initial.costCents / 100) : '');
  const [costPeriod, setCostPeriod] = useState(initial?.costPeriod ?? '');
  const [costKind, setCostKind] = useState(initial?.costKind ?? 'actual');
  const [frequency, setFrequency] = useState(initial?.frequency ?? 'monthly');
  const [renewalDate, setRenewalDate] = useState(initial?.renewalDate ?? '');
  const [renewalLabel, setRenewalLabel] = useState(initial?.renewalLabel ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'k');
  const [excluded, setExcluded] = useState(initial?.excludedFromReducingNumber ?? false);
  const [hideOnFridge, setHideOnFridge] = useState(initial?.hideCostOnFridge ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = Boolean(initial?.id);

  const submit = async (e) => {
    e.preventDefault();
    if (!service.trim()) return;
    setBusy(true);
    setError(false);
    const res = await post({
      action: isEditing ? 'edit' : 'add',
      id: initial?.id,
      section, service: service.trim(), provider: provider.trim() || null,
      costCents: cost.trim() === '' ? null : dollarsToCents(cost),
      costPeriod: costPeriod || null, costKind, frequency,
      renewalDate: renewalDate || null, renewalLabel: renewalLabel.trim() || null,
      status, excludedFromReducingNumber: excluded, hideCostOnFridge: hideOnFridge,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    const res = await post({ action: 'delete', id: initial.id });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onDelete();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <select value={section} onChange={(e) => setSection(e.target.value)}>
        {SECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input placeholder="Service" value={service} onChange={(e) => setService(e.target.value)} autoFocus />
      <input placeholder="Provider / biller" value={provider} onChange={(e) => setProvider(e.target.value)} />

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <input style={{ flex: 1 }} placeholder="Cost ($, blank = TBC)" inputMode="decimal"
               value={cost} onChange={(e) => setCost(e.target.value)} />
        <select style={{ flex: 1 }} value={costPeriod} onChange={(e) => setCostPeriod(e.target.value)}>
          {COST_PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <select value={costKind} onChange={(e) => setCostKind(e.target.value)}>
        {COST_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
        {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <input style={{ flex: 1 }} type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
        <input style={{ flex: 1 }} placeholder="Renewal note (e.g. ~22 Oct)" value={renewalLabel}
               onChange={(e) => setRenewalLabel(e.target.value)} />
      </div>

      <div className="mp-switch">
        {['k', 'r', 'a'].map((s) => (
          <button key={s} type="button" className={`mp-switch__seg${status === s ? ' mp-switch__seg--active' : ''}`}
                  onClick={() => setStatus(s)}>
            {s === 'k' ? 'Keep' : s === 'r' ? 'Review' : 'Action'}
          </button>
        ))}
      </div>

      <input placeholder="Notes (policy numbers, watchlist commentary — phone only)" value={notes}
             onChange={(e) => setNotes(e.target.value)} />

      <label className="rg-checkbox">
        <input type="checkbox" checked={excluded} onChange={(e) => setExcluded(e.target.checked)} />
        Exclude from the reducing number (mortgage, school fees)
      </label>
      <label className="rg-checkbox">
        <input type="checkbox" checked={hideOnFridge} onChange={(e) => setHideOnFridge(e.target.checked)} />
        Hide the cost figure on the fridge
      </label>

      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-4)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy || !service.trim()}>
          {isEditing ? 'Save' : 'Add'}
        </button>
      </div>

      {isEditing && (
        <button type="button" className="mp-lib-archive" style={{ marginTop: 'var(--fh-space-4)' }}
                disabled={busy} onClick={handleDelete}>
          {confirmDelete ? 'Tap again to delete' : 'Delete'}
        </button>
      )}
    </form>
  );
}

function SavingForm({ onSaved, onCancel }) {
  const [happenedOn, setHappenedOn] = useState(new Date().toISOString().slice(0, 10));
  const [whatChanged, setWhatChanged] = useState('');
  const [saving, setSaving] = useState('');
  const [whereItWent, setWhereItWent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const cents = dollarsToCents(saving);
    if (!whatChanged.trim() || !cents) return;
    setBusy(true);
    setError(false);
    const res = await post({
      action: 'add_saving', happenedOn, whatChanged: whatChanged.trim(),
      annualSavingCents: cents, whereItWent: whereItWent.trim() || null,
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} />
      <input placeholder="What changed" value={whatChanged} onChange={(e) => setWhatChanged(e.target.value)} autoFocus />
      <input placeholder="Annual saving ($)" inputMode="decimal" value={saving} onChange={(e) => setSaving(e.target.value)} />
      <input placeholder="Where it went (optional)" value={whereItWent} onChange={(e) => setWhereItWent(e.target.value)} />
      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy || !whatChanged.trim() || !saving}>
          Log it
        </button>
      </div>
    </form>
  );
}

export default function RegisterScreen({ view, fridge, role }) {
  const router = useRouter();
  // Reachable both from the dashboard tile (§8) and from Settings (adults
  // only) — the back arrow returns wherever it came from rather than
  // always the wall, matching Q&A/Review queue/Pair a device's own
  // back-to-Settings convention when that's how you got here.
  const fromSettings = useSearchParams().get('from') === 'settings';
  const backHref = fromSettings ? '/settings' : '/';
  const backLabel = fromSettings ? 'Back to settings' : 'Back to the wall';
  const viewTimer = useRef(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addingSaving, setAddingSaving] = useState(false);

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
  const closeForms = () => { setAddingItem(false); setEditingId(null); setAddingSaving(false); };
  const onSaved = () => { closeForms(); router.refresh(); };

  const renderItem = (item) => {
    if (editingId === item.id) {
      return (
        <div className="row" key={item.id}>
          <ItemForm initial={item} onSaved={onSaved} onCancel={closeForms} onDelete={onSaved} />
        </div>
      );
    }
    const content = <ItemRow item={item} fridge={fridge} />;
    if (!canEdit) return <div className={`row${item.status === 'a' ? ' row--attention' : ''}`} key={item.id}>{content}</div>;
    return (
      <button type="button" className={`row${item.status === 'a' ? ' row--attention' : ''}`}
              style={{ border: 0, width: '100%', cursor: 'pointer' }} key={item.id}
              onClick={() => setEditingId(item.id)}>
        {content}
      </button>
    );
  };

  const yearCents = view.reducingNumberCents * 12;

  return (
    <div className="rg-page" data-register="household">
      <div className="rg-header">
        <Link href={backHref} className="wo-back" aria-label={backLabel}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="rg-header__title">Register</h1>
          <p className="rg-header__note">Every renewal has a decision. Nothing renews without a conscious one.</p>
        </div>
      </div>

      <div className="rg-hero">
        <div className="rg-hero__stat">
          <span className="rg-hero__label">The number we're reducing</span>
          <span className="rg-hero__figure">{formatMoney(view.reducingNumberCents)}/mo</span>
          <span className="rg-hero__sub">{formatMoney(yearCents)}/yr · excludes mortgage &amp; school fees</span>
        </div>
        <div className="rg-hero__stat rg-hero__stat--won">
          <span className="rg-hero__label">Saved this year</span>
          <span className="rg-hero__figure rg-hero__figure--won">{formatMoney(view.savingsWonThisYearCents)}</span>
        </div>
      </div>

      {view.actionQueue.length > 0 && (
        <>
          <h2 className="group group--attention">Next 90 days</h2>
          <div className="card">
            {view.actionQueue.map((item) => (
              <div className={`row${item.status === 'a' ? ' row--attention' : ''}`} key={item.id}>
                <div className="row__main">
                  <span className="row__title">{item.service}</span>
                  <span className="row__sub">{renewalLine(item) ?? 'Open action'}</span>
                </div>
                <span className={`rg-status rg-status--${item.status}`}>{item.status === 'a' ? 'Action' : 'Review'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {view.sections.map((section) => (
        <div key={section.key}>
          <h2 className="group">
            {section.label}
            <span className="group__count">{formatMoney(section.monthlyEquivalentCents)}/mo</span>
          </h2>
          <div className="card">
            {section.items.length === 0 && <p className="hol-empty">Nothing here yet.</p>}
            {section.items.map(renderItem)}
          </div>
        </div>
      ))}

      {canEdit && !addingItem && (
        <button type="button" className="sc-entry-cta" style={{ marginTop: 'var(--fh-space-4)' }}
                onClick={() => setAddingItem(true)}>
          Add a line
        </button>
      )}
      {addingItem && (
        <div className="hol-form-wrap">
          <ItemForm initial={null} onSaved={onSaved} onCancel={closeForms} onDelete={onSaved} />
        </div>
      )}

      {view.reviewWatchlist.length > 0 && (
        <>
          <h2 className="group">Review / lazy-tax watchlist</h2>
          <div className="card">
            {view.reviewWatchlist.map((item) => (
              <div className="row row--quiet" key={item.id}>
                <div className="row__main">
                  <span className="row__title">{item.service}</span>
                  {item.provider && <span className="row__sub">{item.provider}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="group">Savings won this year</h2>
      <div className="card">
        {view.savingsLog.length === 0 && <p className="hol-empty">Nothing logged yet.</p>}
        {view.savingsLog.map((s) => (
          <div className="row" key={s.id}>
            <div className="row__main">
              <span className="row__title">{s.whatChanged}</span>
              <span className="row__sub">{s.happenedOn}{s.whereItWent && ` · ${s.whereItWent}`}</span>
            </div>
            <span className="row__figure rg-hero__figure--won">+{formatMoney(s.annualSavingCents)}</span>
          </div>
        ))}
      </div>
      {canEdit && !addingSaving && (
        <button type="button" className="sc-entry-cta" style={{ marginTop: 'var(--fh-space-4)' }}
                onClick={() => setAddingSaving(true)}>
          Log a saving
        </button>
      )}
      {addingSaving && (
        <div className="hol-form-wrap">
          <SavingForm onSaved={onSaved} onCancel={closeForms} />
        </div>
      )}
    </div>
  );
}
