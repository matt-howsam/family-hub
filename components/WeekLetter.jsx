'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/* One touch to correct. The school shifts the cycle occasionally and a
   confidently wrong letter is worse than no letter, so this is the one write
   the fridge is allowed to make. The correction becomes the new anchor. */
export default function WeekLetter({ letter, schoolWeek, setBy, since, resumes, canWrite }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function flip() {
    if (!canWrite || busy) return;
    setBusy(true);
    try {
      await fetch('/api/week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ letter: letter === 'A' ? 'B' : 'A', setBy: 'Matt' }),
      });
      start(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`week${schoolWeek ? '' : ' week--out'}`}
      onClick={flip}
      disabled={!canWrite || busy || pending}
      aria-live="polite"
      aria-label={schoolWeek ? `Week ${letter}. Tap to correct.` : 'School holidays'}
    >
      <span className="week__label">Week</span>
      <span className="week__letter">{schoolWeek ? letter : '\u2014'}</span>
      <span className="week__rule" />
      <span className="week__set">
        {schoolWeek ? `Set by ${setBy} \u00B7 ${since}` : `Week ${letter} resumes ${resumes}`}
      </span>
    </button>
  );
}
