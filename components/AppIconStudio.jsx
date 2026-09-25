'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowCounterClockwise, Check, CircleHalf, DownloadSimple, HouseLine,
} from '@phosphor-icons/react/ssr';
import HubIcon from '@/components/HubIcon';
import {
  DEFAULT_CFG, PRESETS, FONTS, TEXTS, MARKS, SHAPES, FILLS, EFFECTS, PALETTE, toPNG,
} from '@/lib/hubIcon';

const PRESET_KEYS = ['kind', 'font', 'text', 'mark', 'fg', 'bg1', 'bg2', 'fill', 'effect', 'shape'];
const sameAsPreset = (a, b) => PRESET_KEYS.every((k) => a[k] === b[k]);

function Seg({ options, value, onChange }) {
  return (
    <div className="ic-seg">
      {options.map((o) => (
        <button
          key={o.id} type="button" className="ic-seg__opt"
          aria-pressed={value === o.id} onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AppIconStudio({ initialCfg }) {
  const [cfg, setCfg] = useState(() => Object.assign({}, DEFAULT_CFG, initialCfg));
  const [safeZone, setSafeZone] = useState(false);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkWall, setDarkWall] = useState(false);

  const set = (patch) => setCfg((c) => Object.assign({}, c, patch));
  const change = (patch) => { set(patch); setSaved(false); };

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

  const isType = cfg.kind !== 'mark';
  const isMark = cfg.kind === 'mark';
  const usesAccent = cfg.effect === 'offset' || cfg.effect === 'stack';
  const hasAngle = cfg.fill === 'linear' || cfg.fill === 'split';

  const colorRows = [
    { key: 'fg', label: isMark ? 'Symbol' : 'Letter' },
    { key: 'bg1', label: cfg.fill === 'solid' ? 'Background' : 'Background A', note: cfg.fill === 'radial' ? 'Outer' : '' },
  ];
  if (cfg.fill !== 'solid') colorRows.push({ key: 'bg2', label: 'Background B', note: cfg.fill === 'radial' ? 'Highlight' : '' });
  if (usesAccent) colorRows.push({ key: 'ac', label: 'Shadow colour', note: 'Used by Offset and Stack' });

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

      {/* Start from */}
      <div className="ic-section">
        <span className="ic-label">Start from</span>
        <div className="ic-grid-fonts" style={{ gridTemplateColumns: 'repeat(auto-fill, 48px)' }}>
          {PRESETS.map((p) => (
            <button
              key={p.name} type="button" title={p.name}
              className="ic-tile" style={{ height: 48, padding: 4 }}
              aria-pressed={sameAsPreset(p.cfg, cfg)}
              onClick={() => change(Object.assign({}, p.cfg))}
            >
              <HubIcon icon={p.cfg} size={40} flat />
            </button>
          ))}
        </div>
      </div>

      {/* Mark */}
      <div className="ic-section">
        <div className="ic-section__row">
          <span className="ic-label">Mark</span>
          <Seg
            options={[{ id: 'type', label: 'Letter' }, { id: 'mark', label: 'Symbol' }]}
            value={cfg.kind} onChange={(kind) => change({ kind })}
          />
        </div>

        {isType && (
          <>
            <div className="ic-grid-fonts">
              {FONTS.map((f) => (
                <button
                  key={f.id} type="button" className="ic-tile"
                  aria-pressed={!isMark && cfg.font === f.id}
                  onClick={() => change({ kind: 'type', font: f.id })}
                >
                  <span className="ic-tile__glyph" style={{ fontFamily: f.family, fontWeight: f.weight }}>H</span>
                  <span className="ic-tile__label">{f.label}</span>
                </button>
              ))}
            </div>
            <div className="ic-section__row">
              <span className="ic-sub">Letters</span>
              <Seg options={TEXTS} value={cfg.text} onChange={(text) => change({ text })} />
            </div>
          </>
        )}

        {isMark && (
          <div className="ic-grid-marks">
            {MARKS.map((m) => (
              <button
                key={m.id} type="button" className="ic-tile ic-mark-tile"
                aria-pressed={cfg.mark === m.id}
                onClick={() => change({ kind: 'mark', mark: m.id })}
              >
                <svg viewBox="0 0 100 100">
                  <path d={m.d} fill="none" stroke="var(--fh-ink)" strokeWidth={m.sw} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="ic-tile__label">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Colour */}
      <div className="ic-section">
        <div className="ic-section__row">
          <span className="ic-label">Colour</span>
          <Seg options={FILLS} value={cfg.fill} onChange={(fill) => change({ fill })} />
        </div>
        <div className="ic-colors">
          {colorRows.map((row) => {
            const value = cfg[row.key];
            return (
              <div key={row.key} className="ic-color-row">
                <div className="ic-color-row__head">
                  <span className="ic-sub">{row.label}</span>
                  {row.note && <span className="ic-preview__size-label" style={{ textTransform: 'none', letterSpacing: 0 }}>{row.note}</span>}
                </div>
                <div className="ic-swatches">
                  {PALETTE.map((sw) => (
                    <button
                      key={sw} type="button" className="ic-swatch" style={{ background: sw }}
                      aria-pressed={value.toUpperCase() === sw}
                      onClick={() => change({ [row.key]: sw })}
                    />
                  ))}
                  <label className={`ic-picker${!PALETTE.includes(value.toUpperCase()) ? ' ic-picker--active' : ''}`}>
                    <span className="ic-picker__dot" style={{ background: value }} />
                    <input
                      type="color" value={value}
                      onChange={(e) => change({ [row.key]: e.target.value.toUpperCase() })}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        {hasAngle && (
          <div className="ic-angle">
            <span className="ic-angle__label">Angle</span>
            <input
              type="range" min={0} max={360} step={5} value={cfg.angle}
              onChange={(e) => change({ angle: +e.target.value })}
            />
            <span className="ic-angle__value">{cfg.angle}°</span>
          </div>
        )}
      </div>

      {/* Finish */}
      <div className="ic-section">
        <span className="ic-label">Finish</span>
        <div className="ic-section__row">
          <span className="ic-sub">Shape</span>
          <Seg options={SHAPES} value={cfg.shape} onChange={(shape) => change({ shape })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fh-space-3)', paddingTop: 'var(--fh-space-4)', borderTop: 'var(--fh-border-hair)' }}>
          <span className="ic-sub">Effect</span>
          <div className="ic-effects">
            {EFFECTS.map((e) => (
              <button
                key={e.id} type="button" className="ic-effect"
                aria-pressed={cfg.effect === e.id} onClick={() => change({ effect: e.id })}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="ic-toggle" onClick={() => change({ gloss: !cfg.gloss })}>
          <div>
            <div className="ic-toggle__title">Gloss</div>
            <div className="ic-toggle__note">A soft highlight across the top half.</div>
          </div>
          <div className={`ic-toggle__track${cfg.gloss ? ' ic-toggle__track--on' : ''}`}>
            <div className="ic-toggle__thumb" />
          </div>
        </button>
        <button type="button" className="ic-toggle" onClick={() => setSafeZone((v) => !v)}>
          <div>
            <div className="ic-toggle__title">Show safe zone</div>
            <div className="ic-toggle__note">Android crops to this circle. Keep the mark inside it.</div>
          </div>
          <div className={`ic-toggle__track${safeZone ? ' ic-toggle__track--on' : ''}`}>
            <div className="ic-toggle__thumb" />
          </div>
        </button>
      </div>

      <button type="button" className="ic-reset" onClick={() => change(Object.assign({}, DEFAULT_CFG))}>
        <ArrowCounterClockwise size={18} weight="bold" />
        <span>Back to House teal</span>
      </button>

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
