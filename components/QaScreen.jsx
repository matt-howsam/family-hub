'use client';

import { useState } from 'react';

export default function QaScreen() {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function ask(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pair__card" style={{ maxWidth: 480 }}>
      <h1 className="pair__title">Ask about school mail</h1>

      <form onSubmit={ask} className="pair__form">
        <input
          className="pair__input"
          placeholder="e.g. When are Rose's excursion forms due?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          autoFocus
        />
        <button className="pair__button" type="submit" disabled={busy || !question.trim()}>
          {busy ? 'Searching…' : 'Ask'}
        </button>
      </form>

      {error && <p className="pair__error">{error}</p>}

      {result && (
        <div style={{ marginTop: 'var(--fh-space-6)' }}>
          <p className="pair__note" style={{ color: 'var(--fh-ink)', fontSize: '17px' }}>
            {result.answer}
          </p>
          {result.sources.length > 0 && (
            <div data-register="household" style={{ marginTop: 'var(--fh-space-5)' }}>
              {result.sources.map((s, i) => (
                <div key={i} className="row">
                  <div className="row__main">
                    <span className="row__title">
                      [{i + 1}] {s.subject}
                    </span>
                    <span className="row__sub">
                      {new Date(s.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="pair__note" style={{ marginTop: 'var(--fh-space-4)' }}>{result.scope}</p>
        </div>
      )}
    </div>
  );
}
