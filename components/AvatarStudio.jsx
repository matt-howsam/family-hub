'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, HouseLine } from '@phosphor-icons/react/ssr';
import HubIcon from '@/components/HubIcon';
import IconEditor from '@/components/IconEditor';

/* Same studio as the app icon (components/IconEditor.jsx), minus the parts
 * that only make sense for an OS home-screen icon: no preset gallery (each
 * person starts from their own seeded colours, not a shared list), no
 * Android safe-zone toggle, no PNG download, no home-screen mock — this
 * renders live everywhere in the app instead of being installed once. */
export default function AvatarStudio({ person, initialCfg, seedCfg, backHref = '/settings/avatars' }) {
  const [cfg, setCfg] = useState(() => Object.assign({}, seedCfg, initialCfg));
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const change = (patch) => { setCfg((c) => Object.assign({}, c, patch)); setSaved(false); };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/avatar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ person: person.id, cfg }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ic-page">
      <div className="ic-sticky-top">
        <div className="ic-header">
          <Link href={backHref} className="wo-back" aria-label="Back">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="ic-header__title">{person.name}&rsquo;s avatar</h1>
            <p className="ic-header__note">Shows on the wall strip and {person.name}&rsquo;s own view.</p>
          </div>
        </div>

        {/* Preview + sizes + save */}
        <div className="ic-preview">
          <HubIcon icon={cfg} size={160} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fh-space-5)' }}>
            <div className="ic-preview__sizes">
              {[{ px: 80, label: 'Wall' }, { px: 52, label: 'Row' }, { px: 28, label: 'Inline' }].map((s) => (
                <div key={s.label} className="ic-preview__size">
                  <HubIcon icon={cfg} size={s.px} />
                  <span className="ic-preview__size-label">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="ic-preview__actions">
              <button type="button" className="ic-btn" onClick={handleSave} disabled={saving}>
                {saved ? <Check size={20} weight="bold" /> : <HouseLine size={20} weight="bold" />}
                <span>{saving ? 'Saving…' : saved ? 'Saved' : 'Use this avatar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <IconEditor
        cfg={cfg} onChange={change} presets={null} textMode="free"
        resetLabel={`Back to ${person.name}'s original`} onReset={() => change(Object.assign({}, seedCfg))}
      />
    </div>
  );
}
