'use client';

import { useState } from 'react';

export default function PairForm({ session, canBootstrap, adults }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [token, setToken] = useState('');
  const [person, setPerson] = useState(adults[0]?.id ?? '');

  async function redeem(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pair/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, label: label || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function bootstrap(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pair/bootstrap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, person, label: label || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pair__card">
      <h1 className="pair__title">
        {session ? 'Re-pair this device' : 'Ask Matt or Renée to pair this device'}
      </h1>

      {session && (
        <p className="pair__note">
          Currently paired as {session.role === 'display' ? 'the fridge' : session.person}.
          Entering a new code below replaces that.
        </p>
      )}

      <form onSubmit={redeem} className="pair__form">
        <input
          className="pair__input pair__input--code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
        <input
          className="pair__input"
          placeholder="Device name (optional) — e.g. Rose's iPhone"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button className="pair__button" type="submit" disabled={busy || code.length !== 6}>
          Pair
        </button>
      </form>

      {error && <p className="pair__error">{error}</p>}

      {canBootstrap && !bootstrapOpen && (
        <button className="pair__link" onClick={() => setBootstrapOpen(true)}>
          First time setting up this household?
        </button>
      )}

      {canBootstrap && bootstrapOpen && (
        <form onSubmit={bootstrap} className="pair__form pair__form--bootstrap">
          <p className="pair__note">
            One-time setup. Claims the first adult identity — everyone else is
            paired from that device afterwards.
          </p>
          <select className="pair__input" value={person} onChange={(e) => setPerson(e.target.value)}>
            {adults.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            className="pair__input"
            type="password"
            placeholder="Setup token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button className="pair__button pair__button--secondary" type="submit" disabled={busy || !token}>
            Claim
          </button>
        </form>
      )}
    </div>
  );
}

function errorMessage(code) {
  switch (code) {
    case 'expired_or_unknown':
      return 'That code is wrong, expired, or already used. Ask for a new one.';
    case 'wrong_token':
      return 'That setup token is wrong.';
    case 'already_used':
      return 'Setup has already been completed on this household.';
    case 'not_configured':
      return 'No setup token is configured yet.';
    default:
      return 'Something went wrong. Try again.';
  }
}
