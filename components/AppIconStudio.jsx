'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CircleHalf, DownloadSimple, HouseLine } from '@phosphor-icons/react/ssr';
import HubIcon from '@/components/HubIcon';
import IconEditor from '@/components/IconEditor';
import { DEFAULT_CFG, PRESETS, toPNG } from '@/lib/hubIcon';

export default function AppIconStudio({ initialCfg }) {
  const [cfg, setCfg] = useState(() => Object.assign({}, DEFAULT_CFG, initialCfg));
  const [safeZone, setSafeZone] = useState(false);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkWall, setDarkWall] = useState(false);

  const change = (patch) => { setCfg((c) => Object.assign({}, c, patch)); setSaved(false); };

  async function handleSave() {
    setSaving(true);
    try {
      const canvas = await toPNG(cfg, 1024);
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch('/api/settings/app-icon', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cfg, png: dataUrl.split(',')[1] }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    const canvas = await toPNG(cfg, 1024);
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'the-hub-icon-1024.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  const wallBg = darkWall
    ? 'linear-gradient(170deg,#1B2240 0%,#0B0D18 100%)'
    : 'linear-gradient(170deg,#E9E4F7 0%,#F8E6DC 55%,#E2F0EE 100%)';
  const ghostFill = darkWall ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.62)';
  const dockFill = darkWall ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.4)';
  const wallInk = darkWall ? '#FFFFFF' : '#1B1B1F';

  return (
    <div className="ic-page">
      <div className="ic-header">
        <Link href="/settings" className="wo-back" aria-label="Back to settings">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="ic-header__title">App icon</h1>
          <p className="ic-header__note">How the hub looks on every screen in the house.</p>
        </div>
      </div>

      {/* Preview + sizes + save/download */}
      <div className="ic-preview">
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <HubIcon icon={cfg} size={160} />
          {safeZone && (
            <div
              style={{
                position: 'absolute', left: '10%', top: '10%', width: '80%', height: '80%', borderRadius: '50%',
                border: '2px dashed rgba(255,255,255,.85)', boxShadow: '0 0 0 1px rgba(0,0,0,.25)', pointerEvents: 'none',
              }}
            />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fh-space-5)' }}>
          <div className="ic-preview__sizes">
            {[{ px: 96, label: 'Tablet' }, { px: 60, label: 'Phone' }, { px: 32, label: 'Tab' }].map((s) => (
              <div key={s.label} className="ic-preview__size">
                <HubIcon icon={cfg} size={s.px} />
                <span className="ic-preview__size-label">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="ic-preview__actions">
            <button type="button" className="ic-btn" onClick={handleSave} disabled={saving}>
              {saved ? <Check size={20} weight="bold" /> : <HouseLine size={20} weight="bold" />}
              <span>{saving ? 'Saving…' : saved ? 'Saved — shows on next launch' : 'Use this icon'}</span>
            </button>
            <button type="button" className="ic-btn ic-btn--ghost" onClick={handleDownload}>
              <DownloadSimple size={20} weight="bold" />
              <span>PNG</span>
            </button>
          </div>
        </div>
      </div>

      <IconEditor
        cfg={cfg} onChange={change} presets={PRESETS} textMode="words"
        showSafeZone safeZone={safeZone} onToggleSafeZone={() => setSafeZone((v) => !v)}
        resetLabel="Back to House teal" onReset={() => change(Object.assign({}, DEFAULT_CFG))}
      />

      {/* On a home screen */}
      <div className="ic-section" style={{ marginTop: 'var(--fh-space-6)' }}>
        <div className="ic-section__row">
          <span className="ic-label">On a home screen</span>
          <button type="button" className="ic-phone-toggle" onClick={() => setDarkWall((v) => !v)}>
            <CircleHalf size={16} />
            <span>{darkWall ? 'Dark wallpaper' : 'Light wallpaper'}</span>
          </button>
        </div>
        <div className="ic-phone" style={{ background: wallBg }}>
          <div className="ic-phone__grid">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="ic-phone__app">
                <div className="ic-phone__ghost" style={{ background: ghostFill }} />
                <div className="ic-phone__ghost-label" style={{ background: ghostFill }} />
              </div>
            ))}
            <div className="ic-phone__app">
              <HubIcon icon={cfg} size={48} />
              <span className="ic-phone__app-label" style={{ color: wallInk }}>the hub</span>
            </div>
          </div>
          <div className="ic-phone__dock" style={{ background: dockFill }}>
            <div className="ic-phone__ghost" style={{ background: ghostFill }} />
            <HubIcon icon={cfg} size={48} flat />
            <div className="ic-phone__ghost" style={{ background: ghostFill }} />
            <div className="ic-phone__ghost" style={{ background: ghostFill }} />
          </div>
        </div>
      </div>
    </div>
  );
}
