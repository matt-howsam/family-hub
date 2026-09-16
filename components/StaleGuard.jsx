'use client';
import { useEffect, useState } from 'react';

const CHECK_MS = 60 * 1000; // cheap; also re-checked immediately on wake, below

/* The fallback for AutoRefresh's soft refresh not firing. A long-lived
   setTimeout/setInterval in a tab that's been open for hours is exactly
   what iOS Safari can throttle or silently drop under memory pressure —
   no error, the timer just stops. Rather than trust that router.refresh()
   is still happening, this independently checks the server render's own
   age and, past `maxAgeMinutes`, stops pretending the screen is current:
   a full reload is the one thing guaranteed to fix a stuck client
   regardless of why the soft refresh failed. Per Matt: prefer a visible
   "gone stale, reload" prompt over silently wrong data — never both. */
export default function StaleGuard({ builtAt, maxAgeMinutes = 30 }) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const builtMs = new Date(builtAt).getTime();
    const check = () => setStale(Date.now() - builtMs > maxAgeMinutes * 60 * 1000);
    check();

    const id = setInterval(check, CHECK_MS);
    // Re-check immediately on wake rather than waiting up to CHECK_MS —
    // the same signal AutoRefresh uses to attempt its own soft refresh, so
    // if that succeeds first, `builtAt` will already be fresh by the time
    // this runs.
    const onWake = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('pageshow', onWake);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, [builtAt, maxAgeMinutes]);

  if (!stale) return null;

  return (
    <div className="stale-guard">
      <div className="stale-guard__card">
        <p className="stale-guard__title">This screen hasn&rsquo;t updated in a while</p>
        <p className="stale-guard__note">What&rsquo;s showing may be out of date.</p>
        <button className="stale-guard__button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}
