'use client';
import { ArrowCounterClockwise } from '@phosphor-icons/react/ssr';
import HubIcon from '@/components/HubIcon';
import { FONTS, MARKS, SHAPES, FILLS, EFFECTS, PALETTE, TEXTS } from '@/lib/hubIcon';

const PRESET_KEYS = ['kind', 'font', 'text', 'mark', 'fg', 'bg1', 'bg2', 'fill', 'effect', 'shape'];
const sameAsPreset = (a, b, keys) => keys.every((k) => a[k] === b[k]);

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

/* The Mark/Colour/Finish controls shared by the app icon studio and the
 * avatar studio. The parent owns the preview, the save flow, and cfg
 * state — this just turns taps into onChange(patch) calls.
 *
 * - presets: preset list for a "Start from" strip, or null to hide it.
 * - presetKeepText: tapping a preset normally sets every field it carries,
 *   text included — right for the app icon, where the preset owns the
 *   whole identity. An avatar's initials aren't part of the "look", so
 *   there this is true: a preset changes font/colours/effect but leaves
 *   whichever initials are already showing alone.
 * - textMode: 'words' shows the app icon's fixed H/h/hub segmented
 *   control; 'free' shows a short text input instead, for arbitrary
 *   initials.
 * - showSafeZone: the Android-crop-circle toggle only makes sense for an
 *   OS home-screen icon, not a person avatar.
 * - resetLabel/onReset: what the reset link says and does — the app icon
 *   resets to the teal default, an avatar resets to that person's seed. */
export default function IconEditor({
  cfg, onChange, presets = null, presetKeepText = false, textMode = 'words',
  showSafeZone = false, safeZone = false, onToggleSafeZone,
  resetLabel = 'Reset', onReset,
}) {
  const presetCompareKeys = presetKeepText ? PRESET_KEYS.filter((k) => k !== 'text') : PRESET_KEYS;
  const applyPreset = (presetCfg) =>
    onChange(presetKeepText ? Object.assign({}, presetCfg, { text: cfg.text }) : Object.assign({}, presetCfg));
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

  return (
    <>
      {presets && (
        <div className="ic-section">
          <span className="ic-label">Start from</span>
          <div className="ic-grid-fonts" style={{ gridTemplateColumns: 'repeat(auto-fill, 48px)' }}>
            {presets.map((p) => (
              <button
                key={p.name} type="button" title={p.name}
                className="ic-tile" style={{ height: 48, padding: 4 }}
                aria-pressed={sameAsPreset(p.cfg, cfg, presetCompareKeys)}
                onClick={() => applyPreset(p.cfg)}
              >
                <HubIcon icon={presetKeepText ? Object.assign({}, p.cfg, { text: cfg.text }) : p.cfg} size={40} flat />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mark */}
      <div className="ic-section">
        <div className="ic-section__row">
          <span className="ic-label">Mark</span>
          <Seg
            options={[{ id: 'type', label: 'Letter' }, { id: 'mark', label: 'Symbol' }]}
            value={cfg.kind} onChange={(kind) => onChange({ kind })}
          />
        </div>

        {isType && (
          <>
            <div className="ic-grid-fonts">
              {FONTS.map((f) => (
                <button
                  key={f.id} type="button" className="ic-tile"
                  aria-pressed={!isMark && cfg.font === f.id}
                  onClick={() => onChange({ kind: 'type', font: f.id })}
                >
                  <span className="ic-tile__glyph" style={{ fontFamily: f.family, fontWeight: f.weight }}>
                    {(cfg.text || 'H').slice(0, 1)}
                  </span>
                  <span className="ic-tile__label">{f.label}</span>
                </button>
              ))}
            </div>
            <div className="ic-section__row">
              <span className="ic-sub">Letters</span>
              {textMode === 'words' ? (
                <Seg options={TEXTS} value={cfg.text} onChange={(text) => onChange({ text })} />
              ) : (
                <input
                  type="text" className="ic-text-input" maxLength={3} value={cfg.text}
                  onChange={(e) => onChange({ text: e.target.value.slice(0, 3) })}
                />
              )}
            </div>
          </>
        )}

        {isMark && (
          <div className="ic-grid-marks">
            {MARKS.map((m) => (
              <button
                key={m.id} type="button" className="ic-tile ic-mark-tile"
                aria-pressed={cfg.mark === m.id}
                onClick={() => onChange({ kind: 'mark', mark: m.id })}
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
          <Seg options={FILLS} value={cfg.fill} onChange={(fill) => onChange({ fill })} />
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
                      onClick={() => onChange({ [row.key]: sw })}
                    />
                  ))}
                  <label className={`ic-picker${!PALETTE.includes(value.toUpperCase()) ? ' ic-picker--active' : ''}`}>
                    <span className="ic-picker__dot" style={{ background: value }} />
                    <input
                      type="color" value={value}
                      onChange={(e) => onChange({ [row.key]: e.target.value.toUpperCase() })}
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
              onChange={(e) => onChange({ angle: +e.target.value })}
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
          <Seg options={SHAPES} value={cfg.shape} onChange={(shape) => onChange({ shape })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fh-space-3)', paddingTop: 'var(--fh-space-4)', borderTop: 'var(--fh-border-hair)' }}>
          <span className="ic-sub">Effect</span>
          <div className="ic-effects">
            {EFFECTS.map((e) => (
              <button
                key={e.id} type="button" className="ic-effect"
                aria-pressed={cfg.effect === e.id} onClick={() => onChange({ effect: e.id })}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="ic-toggle" onClick={() => onChange({ gloss: !cfg.gloss })}>
          <div>
            <div className="ic-toggle__title">Gloss</div>
            <div className="ic-toggle__note">A soft highlight across the top half.</div>
          </div>
          <div className={`ic-toggle__track${cfg.gloss ? ' ic-toggle__track--on' : ''}`}>
            <div className="ic-toggle__thumb" />
          </div>
        </button>
        {showSafeZone && (
          <button type="button" className="ic-toggle" onClick={onToggleSafeZone}>
            <div>
              <div className="ic-toggle__title">Show safe zone</div>
              <div className="ic-toggle__note">Android crops to this circle. Keep the mark inside it.</div>
            </div>
            <div className={`ic-toggle__track${safeZone ? ' ic-toggle__track--on' : ''}`}>
              <div className="ic-toggle__thumb" />
            </div>
          </button>
        )}
      </div>

      <button type="button" className="ic-reset" onClick={onReset}>
        <ArrowCounterClockwise size={18} weight="bold" />
        <span>{resetLabel}</span>
      </button>
    </>
  );
}
