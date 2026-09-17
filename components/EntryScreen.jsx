'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { formatDollars } from '@/lib/scorecard';

const RETRY_MS = 4000;
const SHOW_FAILED_AFTER_MS = 10000;

async function post(body) {
  const res = await fetch('/api/scorecard', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function dayShort(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-AU', {
    timeZone: 'UTC', day: 'numeric', month: 'short',
  });
}

/** Digits only — no decimal point, no minus, no currency symbol. Matches
    the card's own convention: whole dollars, nothing else typed. */
function sanitizeDigits(value) {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

export default function EntryScreen({ data, weekNo }) {
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries((data?.categories ?? []).map((c) => [c.key, c.amount == null ? '' : String(c.amount)])));
  const savedAmounts = useRef(
    Object.fromEntries((data?.categories ?? []).map((c) => [c.key, c.amount])),
  );
  const [status, setStatus] = useState({}); // key -> 'saving' | 'saved' | 'failed'
  const retryTimers = useRef({});

  const [review, setReview] = useState({
    win: data?.review?.win ?? '', biggestUnnecessary: data?.review?.biggestUnnecessary ?? '',
    oneChange: data?.review?.oneChange ?? '',
  });
  const [reviewStatus, setReviewStatus] = useState('idle');

  const inputRefs = useRef([]);

  const runningTotal = useMemo(
    () => Object.values(amounts).reduce((t, v) => t + (v === '' ? 0 : parseInt(v, 10) || 0), 0) * 100,
    [amounts],
  );

  if (!data) {
    return (
      <div className="sc-page">
        <p className="sc-empty">This week isn't open yet.</p>
      </div>
    );
  }

  const commitAmount = (key, rawValue) => {
    const value = rawValue === '' ? null : parseInt(rawValue, 10);
    if (value === savedAmounts.current[key]) return; // nothing changed, no write

    clearTimeout(retryTimers.current[key]);
    setStatus((s) => ({ ...s, [key]: 'saving' }));
    const startedAt = Date.now();

    const attempt = async () => {
      try {
        const res = await post({
          action: 'setEntry', year: data.year, month: data.month, weekNo,
          categoryKey: key, amount: value ?? 0,
        });
        if (!res.ok) throw new Error('write failed');
        savedAmounts.current[key] = value;
        setStatus((s) => ({ ...s, [key]: 'saved' }));
      } catch {
        setStatus((s) => ({ ...s, [key]: Date.now() - startedAt > SHOW_FAILED_AFTER_MS ? 'failed' : 'saving' }));
        retryTimers.current[key] = setTimeout(attempt, RETRY_MS);
      }
    };
    attempt();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.target.blur();
    const next = inputRefs.current[idx + 1];
    if (next) next.focus();
  };

  const commitReview = async () => {
    setReviewStatus('saving');
    try {
      const res = await post({
        action: 'setReview', year: data.year, month: data.month, weekNo,
        win: review.win || null, biggestUnnecessary: review.biggestUnnecessary || null,
        oneChange: review.oneChange || null,
      });
      setReviewStatus(res.ok ? 'saved' : 'failed');
    } catch {
      setReviewStatus('failed');
    }
  };

  return (
    <div className="sc-page">
      <div className="sc-header">
        <Link href="/scorecard" className="wo-back" aria-label="Back to the month view">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="sc-header__title">Sunday entry</h1>
          <p className="sc-header__note">Whole dollars. Nothing is required — this saves as you go.</p>
        </div>
      </div>

      <div className="sc-week-strip">
        {data.monthWeeks.map((w) => (
          <Link
            key={w.weekNo}
            href={`/scorecard/entry?week=${w.weekNo}`}
            className={`sc-week-strip__seg${w.weekNo === weekNo ? ' sc-week-strip__seg--active' : ''}`}
          >
            Wk {w.weekNo}
            <span className="sc-week-strip__dates">{dayShort(w.startsOn)}–{dayShort(w.endsOn)}</span>
          </Link>
        ))}
      </div>

      <div className="sc-entry-list" data-register="household">
        {data.categories.map((c, idx) => (
          <div className="sc-entry-row" key={c.key}>
            <div className="sc-entry-row__label">
              <span className="sc-entry-row__title">{c.label}</span>
              {status[c.key] === 'failed' && <span className="sc-entry-row__flag">Not saved yet</span>}
            </div>
            <input
              ref={(el) => { inputRefs.current[idx] = el; }}
              className="sc-entry-row__input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="next"
              placeholder={String(Math.round(c.target / 100))}
              value={amounts[c.key]}
              onChange={(e) => setAmounts((a) => ({ ...a, [c.key]: sanitizeDigits(e.target.value) }))}
              onBlur={(e) => commitAmount(c.key, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            />
          </div>
        ))}
      </div>

      <div className="sc-entry-total">
        <span>Total</span>
        <span className="sc-entry-total__figure">
          {formatDollars(runningTotal)} of {formatDollars(data.weekTargetTotal)}
        </span>
      </div>

      <div className="sc-review">
        <h2 className="sc-review__title">Sunday Night Review</h2>
        {[
          ['win', "This week's win —"],
          ['biggestUnnecessary', 'Biggest unnecessary spend —'],
          ['oneChange', 'One change for next week —'],
        ].map(([field, label]) => (
          <label className="sc-review__field" key={field}>
            <span className="sc-review__label">{label}</span>
            <textarea
              className="sc-review__input"
              rows={2}
              value={review[field]}
              onChange={(e) => setReview((r) => ({ ...r, [field]: e.target.value }))}
              onBlur={commitReview}
            />
          </label>
        ))}
        {reviewStatus === 'failed' && <p className="sc-entry-row__flag">Not saved yet</p>}
      </div>

      {data.otherWeeksReviews.length > 0 && (
        <div className="sc-history">
          <h2 className="sc-history__title">Earlier this month</h2>
          {data.otherWeeksReviews.map((r) => (
            <div className="sc-history__week" key={r.weekNo}>
              <p className="sc-history__label">Week {r.weekNo} · {dayShort(r.startsOn)}–{dayShort(r.endsOn)}</p>
              {r.win && <p className="sc-history__line"><strong>Win —</strong> {r.win}</p>}
              {r.biggestUnnecessary && <p className="sc-history__line"><strong>Unnecessary —</strong> {r.biggestUnnecessary}</p>}
              {r.oneChange && <p className="sc-history__line"><strong>Change —</strong> {r.oneChange}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
