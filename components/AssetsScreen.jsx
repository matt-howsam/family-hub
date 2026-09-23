'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { formatMoney } from '@/lib/assets';

const VIEW_IDLE_MS = 60000;

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

/** Warranty status and years-to-replacement — the two facts worth a
    glance without opening the asset. Plain text, no colour: this reads
    closer to the register than to projects, but a lapsed warranty isn't
    an `A` status either, just a fact. */
function AssetSub({ asset }) {
  const now = new Date();
  const warrantyActive = asset.warrantyExpiry && new Date(`${asset.warrantyExpiry}T00:00:00Z`) >= now;
  const parts = [];
  if (asset.location) parts.push(asset.location);
  if (asset.warrantyExpiry) parts.push(warrantyActive ? `Warranty to ${asset.warrantyExpiry}` : 'Warranty expired');
  if (asset.yearsRemaining != null) {
    parts.push(asset.yearsRemaining <= 0 ? 'Replacement due' : `~${asset.yearsRemaining}yr to replacement`);
  }
  return <span className="row__sub">{parts.length ? parts.join(' · ') : 'Nothing recorded yet'}</span>;
}

function AddAssetForm({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(false);
    const res = await post({ action: 'add', name: name.trim(), location: location.trim() || null });
    setBusy(false);
    if (!res.ok) { setError(true); return; }
    onSaved();
  };

  return (
    <form className="mp-add" onSubmit={submit}>
      <input placeholder="Name (e.g. Pool pump)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
      {error && <p className="sc-entry-row__flag">Not saved — try again.</p>}
      <div style={{ display: 'flex', gap: 'var(--fh-space-3)' }}>
        <button type="button" className="mp-clear" style={{ flex: 1, marginTop: 0 }} onClick={onCancel}>Cancel</button>
        <button className="mp-add__submit" style={{ flex: 1 }} type="submit" disabled={busy || !name.trim()}>Add</button>
      </div>
    </form>
  );
}

export default function AssetsScreen({ view, fridge, role }) {
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

  return (
    <div className="as-page" data-register="household">
      <div className="as-header">
        <Link href="/settings" className="wo-back" aria-label="Back to settings">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="as-header__title">Assets</h1>
          <p className="as-header__note">What the house owns, what it&rsquo;s worth, and when it&rsquo;ll need replacing.</p>
        </div>
      </div>

      <div className="rg-hero">
        <div className="rg-hero__stat">
          <span className="rg-hero__label">To not be surprised</span>
          <span className="rg-hero__figure">{formatMoney(view.sinkingFundMonthlyCents)}/mo</span>
          <span className="rg-hero__sub">Replacement estimates set aside, spread across the years left on each</span>
        </div>
      </div>

      <div className="card">
        {view.assets.length === 0 && <p className="hol-empty">Nothing recorded yet.</p>}
        {view.assets.map((a) => (
          <Link key={a.id} href={`/assets/${a.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row__main">
              <span className="row__title">{a.name}</span>
              <AssetSub asset={a} />
            </div>
            <div className="row__end">
              {a.replacementEstimate != null && <span className="row__figure">{formatMoney(a.replacementEstimate)}</span>}
              {a.estimateYear && <span className="row__meta">{a.estimateYear} estimate</span>}
            </div>
          </Link>
        ))}
      </div>

      {canEdit && !adding && (
        <button type="button" className="sc-entry-cta" style={{ marginTop: 'var(--fh-space-4)' }} onClick={() => setAdding(true)}>
          Add an asset
        </button>
      )}
      {adding && (
        <div className="hol-form-wrap">
          <AddAssetForm onSaved={() => { setAdding(false); router.refresh(); }} onCancel={() => setAdding(false)} />
        </div>
      )}
    </div>
  );
}
