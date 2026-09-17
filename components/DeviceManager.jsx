'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';

export default function DeviceManager({ devices: initialDevices, people }) {
  const [devices, setDevices] = useState(initialDevices);
  const [person, setPerson] = useState(people.find((p) => p.kind === 'child')?.id ?? people[0].id);
  const [targetRole, setTargetRole] = useState('child');
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);

  async function generate(role) {
    setBusy(true);
    setIssued(null);
    try {
      const body = role === 'display' ? { role: 'display' } : { person, targetRole };
      const res = await fetch('/api/pair/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setIssued(data);
    } catch {
      setIssued({ error: true });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id) {
    setBusy(true);
    try {
      await fetch('/api/devices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setDevices((ds) => ds.map((d) => (d.id === id ? { ...d, revoked_at: new Date().toISOString() } : d)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pair__card">
      <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
      <h1 className="pair__title">Pair a device</h1>

      <div className="pair__form">
        <select className="pair__input" value={person} onChange={(e) => setPerson(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="pair__input" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
          <option value="child">Child device</option>
          <option value="adult">Adult device</option>
        </select>
        <button className="pair__button" disabled={busy} onClick={() => generate('person')}>
          Generate a code
        </button>
        <button className="pair__button pair__button--secondary" disabled={busy} onClick={() => generate('display')}>
          Pair the fridge
        </button>
      </div>

      {issued && !issued.error && (
        <p className="pair__note" style={{ marginTop: 'var(--fh-space-5)' }}>
          Code for <strong>{issued.label}</strong>: <span className="pair__input--code">{issued.code}</span>
          <br />
          Valid 10 minutes, single use.
        </p>
      )}
      {issued?.error && <p className="pair__error">Couldn't generate a code.</p>}

      <h2 className="pair__title" style={{ fontSize: '20px', marginTop: 'var(--fh-space-8)' }}>
        Devices
      </h2>
      <div data-register="household">
        {devices.map((d) => (
          <div key={d.id} className="row">
            <div className="row__main">
              <span className="row__title">
                {d.label || (d.role === 'display' ? 'The fridge' : d.person)}
              </span>
              <span className="row__sub">
                {d.role} · {d.revoked_at ? 'revoked' : d.last_seen_at ? `last seen ${new Date(d.last_seen_at).toLocaleDateString('en-AU')}` : 'never used'}
              </span>
            </div>
            {!d.revoked_at && (
              <button className="pair__link" disabled={busy} onClick={() => revoke(d.id)}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
