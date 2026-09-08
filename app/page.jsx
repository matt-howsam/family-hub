import Clock from '@/components/Clock';
import WeekLetter from '@/components/WeekLetter';
import { getAnchor, hasDb } from '@/lib/db';
import { weekLetter, today, TZ } from '@/lib/week';

/* The fridge never sleeps, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

const fmt = (d, o) => d.toLocaleDateString('en-AU', { timeZone: 'UTC', ...o });

export default async function Wall() {
  const anchor = await getAnchor();
  const w = weekLetter(anchor, today(TZ));

  return (
    <main className="wall">
      <section className="today">
        <Clock tz={TZ} />
        <WeekLetter
          letter={w.letter}
          schoolWeek={w.schoolWeek}
          setBy={anchor.setBy}
          since={fmt(new Date(anchor.monday + 'T00:00:00Z'), { day: 'numeric', month: 'short' })}
          resumes={w.resumesOn ? fmt(w.resumesOn, { day: 'numeric', month: 'short' }) : ''}
          canWrite={hasDb}
        />
      </section>

      {/* Household register — the ledger. Tight radius, dense rows, flat white.
          Static until the projects module lands; the markup is the shape the
          API will fill. */}
      <div data-register="household">
        <h2 className="group group--attention">
          Needs you <span className="group__count">3 · longest first</span>
        </h2>
        <div className="card">
          <div className="row row--attention">
            <span className="row__main">
              <span className="row__title">Remodel kids&rsquo; bathrooms</span>
              <span className="row__sub">Write down what actually needs to change</span>
            </span>
            <span className="row__end">
              <span className="row__figure">84</span>
              <span className="row__meta">Days · Idea</span>
            </span>
          </div>
          <div className="row row--attention">
            <span className="row__main">
              <span className="row__title">Paint the house</span>
              <span className="row__sub">Chase Brett — the quote was due 11 days ago</span>
            </span>
            <span className="row__end">
              <span className="row__figure">21</span>
              <span className="row__meta">Days · Quoting</span>
            </span>
          </div>
          <div className="row">
            <span className="row__main">
              <span className="row__title">Front landscaping</span>
              <span className="row__sub">Decide turf or native beds before quoting</span>
            </span>
            <span className="row__end">
              <span className="row__figure row__figure--none">no estimate</span>
              <span className="row__meta">Research</span>
            </span>
          </div>
        </div>

        <h2 className="group">Ready when you are <span className="group__count">1</span></h2>
        <div className="card">
          <div className="row row--ready">
            <span className="row__main">
              <span className="row__title">Upstairs bathroom cupboard sliders</span>
              <span className="row__sub">Quote in hand. Say yes and it&rsquo;s ordered.</span>
            </span>
            <span className="row__end"><span className="row__figure">$500</span></span>
          </div>
        </div>

        <h2 className="group">Queued <span className="group__count">1</span></h2>
        <div className="card">
          <div className="row row--sunken">
            <span className="row__main">
              <span className="row__title">Downstairs flooring</span>
              <span className="row__sub">Waiting on the kitchen. Nothing to do.</span>
            </span>
            <span className="row__end"><span className="row__meta">Idea</span></span>
          </div>
        </div>
      </div>

      {/* Family register — people. Softer radius, more air, tinted. */}
      <div data-register="family" style={{ marginTop: 'var(--fh-space-8)' }}>
        <div
          className="card kid"
          style={{ '--fh-tint': 'var(--fh-tom-slab)', '--fh-slab-ink': 'var(--fh-tom-slab-ink)' }}
        >
          <div className="kid__slab" style={{ background: 'var(--fh-tint)' }}>
            <span className="kid__who">Tom · Year 6</span>
            <span className="kid__uniform">PE uniform</span>
          </div>
          <div className="kid__body">
            <div className="kid__answer">PE Prac, middle of the day</div>
            <div className="kid__note">Sport shoes and a water bottle</div>
            <div className="kid__after">
              <div className="row__meta">After school</div>
              <div className="kid__answer" style={{ marginTop: 'var(--fh-space-2)' }}>
                Surf coaching, 4:00
              </div>
            </div>
          </div>
        </div>

        <div
          className="card kid"
          style={{ '--fh-tint': 'var(--fh-rose-slab)', '--fh-slab-ink': 'var(--fh-rose-slab-ink)' }}
        >
          <div className="kid__slab" style={{ background: 'var(--fh-tint)' }}>
            <span className="kid__who">Rose · Year 7</span>
            <span className="kid__uniform">Formal uniform</span>
          </div>
          <div className="kid__body">
            <div className="kid__answer">Timber Tech</div>
            <div className="kid__note">Closed shoes</div>
            <div className="kid__after">
              <div className="row__meta">After school</div>
              <div className="kid__answer" style={{ marginTop: 'var(--fh-space-2)' }}>
                KPA, 4:00
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="house">
        <span>Sunrise 5:47 · the pool is 19°, which is a matter of opinion</span>
        <span className="house__built">
          {w.term ? `${w.term.name} · Term ${w.term.term}` : 'School holidays'}
          {hasDb ? '' : ' · no database'}
        </span>
      </div>
    </main>
  );
}
