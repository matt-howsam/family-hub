'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaretLeft, CaretRight, ArrowLeft } from '@phosphor-icons/react/ssr';
import { formatDollars } from '@/lib/scorecard';

const VIEW_IDLE_MS = 60000;
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

function prevYm(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextYm(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** `$610` with a smaller `of $1,128` suffix — used everywhere a figure
    needs its pro-rata target alongside it without a second column. */
function Fig({ amount, target, entered }) {
  return (
    <span className="sc-fig">
      <span className={`sc-fig__amount${entered ? '' : ' sc-fig__amount--empty'}`}>
        {entered ? formatDollars(amount) : '—'}
      </span>
      {target != null && <span className="sc-fig__target">of {formatDollars(target)}</span>}
    </span>
  );
}

function Variance({ variance }) {
  if (variance == null) return null;
  const over = variance > 0;
  // Deliberately no colour: "a month over budget is a fact, stated once,
  // without colour escalation" — see the brief's Tone section. No red, no
  // amber, no borrowed urgency vocabulary anywhere in this module.
  return (
    <span className="sc-variance">
      {over ? '+' : variance < 0 ? '−' : ''}{formatDollars(Math.abs(variance))}
    </span>
  );
}

function WallRows({ view }) {
  return (
    <div className="sc-wall" data-register="household">
      {view.categories.map((c) => (
        <div className="sc-wall-row" key={c.key}>
          <span className="sc-wall-row__label">{c.label}</span>
          <span className="sc-wall-row__figs">
            <Fig amount={c.currentWeek?.amount} target={c.currentWeek?.target} entered={c.currentWeek?.entered} />
            <Fig amount={c.monthToDate} target={c.mtdTarget} entered={c.monthToDate != null} />
          </span>
        </div>
      ))}
      <div className="sc-wall-row sc-wall-row--total">
        <span className="sc-wall-row__label">Total</span>
        <span className="sc-wall-row__figs">
          <Fig
            amount={view.weekTotals.find((w) => w.weekNo === view.currentWeekNo)?.amount}
            target={view.currentWeekTargetTotal}
            entered={Boolean(view.currentWeekNo)}
          />
          <Fig amount={view.mtdTotal} target={view.mtdTargetTotal} entered={Boolean(view.currentWeekNo)} />
        </span>
      </div>
    </div>
  );
}

function PhoneTable({ view }) {
  return (
    <div className="sc-table-wrap">
      <div className="sc-table" data-register="household">
        <div className="sc-table__head">
          <span className="sc-table__hcell sc-table__hcell--cat">Category</span>
          <span className="sc-table__hcell">Budget</span>
          {view.weekMeta.map((w) => (
            <span className="sc-table__hcell" key={w.weekNo}>Wk {w.weekNo}</span>
          ))}
          <span className="sc-table__hcell">Month</span>
        </div>

        {view.categories.map((c) => (
          <div className="sc-row" key={c.key}>
            <span className="sc-row__cat">
              <span className="sc-row__cat-label">{c.label}</span>
              <span className="sc-row__cat-desc">{c.description}</span>
            </span>
            <span className="sc-cell sc-cell--budget">{formatDollars(c.budget)}</span>
            {c.weeks.map((w) => (
              <span className={`sc-cell${w.entered ? '' : ' sc-cell--empty'}`} key={w.weekNo}>
                {w.entered ? formatDollars(w.amount) : '—'}
              </span>
            ))}
            <span className="sc-cell sc-cell--month">
              {c.month.amount != null ? formatDollars(c.month.amount) : '—'}
              {c.month.partial && <span className="sc-partial-flag">partial</span>}
              {c.month.complete && <Variance variance={c.month.variance} />}
            </span>
          </div>
        ))}

        <div className="sc-row sc-row--total">
          <span className="sc-row__cat">
            <span className="sc-row__cat-label">Total</span>
          </span>
          <span className="sc-cell sc-cell--budget">{formatDollars(view.budgetTotal)}</span>
          {view.weekTotals.map((w) => (
            <span className={`sc-cell${w.entered ? '' : ' sc-cell--empty'}`} key={w.weekNo}>
              {w.entered ? formatDollars(w.amount) : '—'}
            </span>
          ))}
          <span className="sc-cell sc-cell--month">
            {view.monthComplete || view.monthTotal ? formatDollars(view.monthTotal) : '—'}
            {!view.monthComplete && view.monthTotal > 0 && <span className="sc-partial-flag">partial</span>}
            {view.monthComplete && <Variance variance={view.monthTotal - view.budgetTotal} />}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ScorecardScreen({ view, fridge, currentYear, currentMonth, canEditBudget }) {
  const router = useRouter();
  const viewTimer = useRef(null);

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

  const year = view.year ?? currentYear;
  const month = view.month ?? currentMonth;
  const prev = prevYm(year, month);
  const next = nextYm(year, month);
  const nextIsFuture = next.year > currentYear || (next.year === currentYear && next.month > currentMonth);

  return (
    <div className="sc-page">
      <div className="sc-header">
        {!fridge && (
          <Link href="/" className="wo-back" aria-label="Back to the wall">
            <ArrowLeft size={24} />
          </Link>
        )}
        <div>
          <h1 className="sc-header__title">Spending</h1>
          <p className="sc-header__note">Discretionary only — mortgage, rates, utilities, school fees,
            subscriptions and insurance live on the Operations Register.</p>
          {!fridge && canEditBudget && (
            <Link href="/scorecard/budget" className="pair__link" style={{ marginTop: 'var(--fh-space-3)' }}>
              Budget &amp; events
            </Link>
          )}
        </div>
      </div>

      {!fridge && (
        <div className="sc-nav">
          <Link href={`/scorecard?year=${prev.year}&month=${prev.month}`} className="sc-nav__btn" aria-label="Previous month">
            <CaretLeft size={18} weight="bold" />
          </Link>
          <span className="sc-nav__label">{monthLabel(year, month)}</span>
          {nextIsFuture
            ? <span className="sc-nav__btn sc-nav__btn--disabled"><CaretRight size={18} weight="bold" /></span>
            : <Link href={`/scorecard?year=${next.year}&month=${next.month}`} className="sc-nav__btn" aria-label="Next month">
                <CaretRight size={18} weight="bold" />
              </Link>}
        </div>
      )}
      {fridge && <p className="sc-nav__label sc-nav__label--fridge">{monthLabel(year, month)}</p>}

      {view.notOpen && <p className="sc-empty">{monthLabel(year, month)} hasn't opened yet.</p>}
      {view.noData && <p className="sc-empty">No entries were kept for {monthLabel(year, month)}.</p>}

      {!view.notOpen && !view.noData && (
        <>
          {view.comparison && (
            <p className="sc-compare">
              {monthLabel(view.comparison.year, view.comparison.month).split(' ')[0]} {formatDollars(view.comparison.total)}
              {' · '}{monthLabel(year, month).split(' ')[0]} {formatDollars(view.monthTotal)}
              {view.comparison.deltaPct != null && (
                <strong> · {view.comparison.deltaPct >= 0 ? '+' : ''}{view.comparison.deltaPct.toFixed(1)}%</strong>
              )}
            </p>
          )}

          {!fridge && view.isCurrentMonth && (
            <Link href="/scorecard/entry" className="sc-entry-cta">Enter this week's numbers</Link>
          )}

          {fridge ? <WallRows view={view} /> : <PhoneTable view={view} />}
        </>
      )}
    </div>
  );
}
