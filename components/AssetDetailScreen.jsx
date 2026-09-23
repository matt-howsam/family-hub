'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FilePdf, Image as ImageIcon } from '@phosphor-icons/react/ssr';
import { formatMoney } from '@/lib/assets';

const VIEW_IDLE_MS = 60000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function post(body) {
  const res = await fetch('/api/assets', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function dollarsToCents(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailsForm({ asset, onSaved, onCancel }) {
  const [location, setLocation] = useState(asset.location ?? '');
  const [installDate, setInstallDate] = useState(asset.installDate ?? '');
  const [purchaseCost, setPurchaseCost] = useState(asset.purchaseCost != null ? String(asset.purchaseCost / 100) : '');
  const [warrantyExpiry, setWarrantyExpiry] = useState(asset.warrantyExpiry ?? '');
  const [expectedLifeYears, setExpectedLifeYears] = useState(asset.expectedLifeYears != null ? String(asset.expectedLifeYears) : '');
  const [expectedReplacementYear, setExpectedReplacementYear] = useState(asset.expectedReplacementYear != null ? String(asset.expectedReplacementYear) : '');
  const [replacementEstimate, setReplacementEstimate] = useState(asset.replacementEstimate != null ? String(asset.replacementEstimate / 100) : '');
  const [estimateYear, setEstimateYear] = useState(asset.estimateYear != null ? String(asset.estimateYear) : '');
  const [notes, setNotes] = useState(asset.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await post({
      action: 'edit', id: asset.id, name: asset.name,
      location: location.trim() || null, installDate: installDate || null,
      purchaseCost: purchaseCost.trim() === '' ? null : dollarsToCents(purchaseCost),
      warrantyExpiry: warrantyExpiry || null,
      expectedLifeYears: expectedLifeYears.trim() === '' ? null : parseInt(expectedLifeYears, 10),
      expectedReplacementYear: expectedReplacementYear.trim() === '' ? null : parseInt(expectedReplacementYear, 10),
      replacementEstimate: replacementEstimate.trim() === '' ? null : dollarsToCents(replacementEstimate),
      estimateYear: estimateYear.trim() === '' ? null : parseInt(estimateYear, 10),
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <input style={{ flex: 1 }} type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
        <input style={{ flex: 1 }} placeholder="Purchase cost ($)" inputMode="decimal" value={purchaseCost}
               onChange={(e) => setPurchaseCost(e.target.value)} />
      </div>
      <input type="date" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <input style={{ flex: 1 }} placeholder="Expected life (years)" inputMode="numeric" value={expectedLifeYears}
               onChange={(e) => setExpectedLifeYears(e.target.value)} />
        <input style={{ flex: 1 }} placeholder="Replacement year (e.g. 2028)" inputMode="numeric" value={expectedReplacementYear}
               onChange={(e) => setExpectedReplacementYear(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <input style={{ flex: 1 }} placeholder="Replacement estimate ($)" inputMode="decimal" value={replacementEstimate}
               onChange={(e) => setReplacementEstimate(e.target.value)} />
        <input style={{ flex: 1 }} placeholder="Estimate made in (year)" inputMode="numeric" value={estimateYear}
               onChange={(e) => setEstimateYear(e.target.value)} />
      </div>
      <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}

      <div style={{ display: 'flex', gap: 'var(--fh-space-3)', marginTop: 'var(--fh-space-4)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy}>Save</button>
      </div>
    </form>
  );
}

/** The upload button — a normal file input, which on an installed iOS PWA
    already offers Photos, Files (anything saved from Mail lands there
    too), iCloud Drive or a document scan. Not the brief's share-sheet
    Shortcut, but most of the same convenience, and it ships without a new
    upload-auth design. */
function UploadForm({ assetId, onSaved }) {
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('assetId', String(assetId));
    if (label.trim()) form.append('label', label.trim());
    const res = await fetch('/api/documents', { method: 'POST', body: form }).then((r) => r.json()).catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError('Not saved — try again.'); return; }
    setFile(null);
    setLabel('');
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Label (optional — defaults to the filename)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
             style={{ marginBottom: 'var(--fh-space-3)' }} />
      {error && <p className="sc-entry-row__flag">{error}</p>}
      <button className="mp-add__submit" type="submit" disabled={busy || !file}>
        {busy ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}

function DocumentRow({ doc, canEdit, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = doc.contentType === 'application/pdf' ? FilePdf : ImageIcon;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <div className="row">
      <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className="row__main"
         style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--fh-space-3)' }}>
        <Icon size={24} className="row__marker" />
        <span>
          <span className="row__title" style={{ display: 'block' }}>{doc.label}</span>
          <span className="row__sub">{formatBytes(doc.sizeBytes)} · {new Date(doc.uploadedAt).toLocaleDateString('en-AU')}</span>
        </span>
      </a>
      {canEdit && (
        <button type="button" className="mp-lib-archive" onClick={handleDelete}>
          {confirmDelete ? 'Tap again' : 'Delete'}
        </button>
      )}
    </div>
  );
}

export default function AssetDetailScreen({ asset, documents, fridge, role }) {
  const router = useRouter();
  const viewTimer = useRef(null);
  const [editing, setEditing] = useState(false);
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

  const canEdit = !fridge && role === 'adult';
  const refresh = () => router.refresh();

  const handleDeleteAsset = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await post({ action: 'delete', id: asset.id });
    router.push('/assets');
  };

  const now = new Date();
  const warrantyActive = asset.warrantyExpiry && new Date(`${asset.warrantyExpiry}T00:00:00Z`) >= now;

  return (
    <div className="as-page" data-register="household">
      <div className="as-header">
        <Link href="/assets" className="wo-back" aria-label="Back to assets">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="as-header__title">{asset.name}</h1>
          {asset.location && <p className="as-header__note">{asset.location}</p>}
        </div>
      </div>

      <div className="pj-facts">
        {asset.installDate && <span className="pj-fact">Installed {asset.installDate}</span>}
        {asset.purchaseCost != null && <span className="pj-fact">Paid {formatMoney(asset.purchaseCost)}</span>}
        {asset.warrantyExpiry && (
          <span className="pj-fact">{warrantyActive ? `Warranty to ${asset.warrantyExpiry}` : `Warranty expired ${asset.warrantyExpiry}`}</span>
        )}
        {asset.expectedLifeYears != null && <span className="pj-fact">{asset.expectedLifeYears}yr expected life</span>}
      </div>

      {(asset.replacementEstimate != null || asset.expectedReplacementYear != null) && (
        <p className="pj-flag">
          {asset.replacementEstimate != null && `${formatMoney(asset.replacementEstimate)} to replace`}
          {asset.replacementEstimate != null && asset.estimateYear && ` · ${asset.estimateYear} estimate`}
          {asset.expectedReplacementYear && `${asset.replacementEstimate != null ? ' · ' : ''}expected ${asset.expectedReplacementYear}`}
        </p>
      )}
      {asset.notes && <p className="pj-flag">{asset.notes}</p>}

      {canEdit && !editing && (
        <button type="button" className="pair__link" onClick={() => setEditing(true)}>Edit details</button>
      )}
      {editing && (
        <div className="hol-form-wrap">
          <DetailsForm asset={asset} onSaved={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />
        </div>
      )}

      <h2 className="group">Documents</h2>
      <div className="card">
        {documents.length === 0 && <p className="hol-empty">Nothing uploaded yet.</p>}
        {documents.map((d) => <DocumentRow key={d.id} doc={d} canEdit={canEdit} onDeleted={refresh} />)}
      </div>
      {canEdit && <UploadForm assetId={asset.id} onSaved={refresh} />}

      {canEdit && (
        <button type="button" className="mp-lib-archive" style={{ marginTop: 'var(--fh-space-6)' }} onClick={handleDeleteAsset}>
          {confirmDelete ? 'Tap again to delete' : 'Delete this asset'}
        </button>
      )}
    </div>
  );
}
