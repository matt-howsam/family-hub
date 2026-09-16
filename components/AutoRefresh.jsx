'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* The fridge never sleeps and often goes untouched for hours — overnight,
   nothing was ever forcing a new server request, so a tab left open before
   midnight kept showing yesterday's render (wrong day, wrong kid briefing,
   wrong meal plan) until someone happened to navigate. This is the fix:
   a background timer that calls router.refresh() — same "same frame as the
   tap" article the router-cache setting in next.config.mjs already uses,
   just triggered by time passing rather than a click.

   Every trigger also pings the conditions refresh endpoint first (see
   docs/family-hub-conditions-data-spec.md — the fridge must never call
   Open-Meteo on render, only read a persisted store). That endpoint
   no-ops when the stored data is under 50 minutes old, so pinging it every
   15 minutes is cheap and doesn't depend on which weather API is behind
   it, or on a Vercel Cron Job (Hobby-plan cron is capped at once/day).

   Daily triggers:
   - 00:00 — the day boundary. Today's briefing, today's meal and What's
     On's Today/Tomorrow split are all wrong for hours otherwise.
   - 06:00 — the morning forecast, forced rather than left to the 50-minute
     freshness check, so the family sees the day's actual forecast first
     thing rather than whatever happened to be cached overnight.

   Plus a 15-minute periodic refresh regardless, matching the calendar and
   conditions fetches' own revalidate window — no point refreshing more
   often than the underlying data can actually change. */
const TZ = 'Australia/Sydney';
const PERIODIC_MS = 15 * 60 * 1000;
const DAILY_TRIGGERS = [
  { hour: 0, minute: 0, force: false },
  { hour: 6, minute: 0, force: true },
];

/** ms until the next occurrence of this local wall-clock time, always in
    the future (today if not yet passed, otherwise tomorrow). DST-safe:
    re-derived from the current wall-clock reading every call, so a 23- or
    25-hour day doesn't shift the fire time. */
function msUntilNext(hour, minute, tz = TZ) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const nowSecs = (get('hour') % 24) * 3600 + get('minute') * 60 + get('second');
  const targetSecs = hour * 3600 + minute * 60;
  const diff = targetSecs - nowSecs;
  return (diff > 0 ? diff : diff + 86400) * 1000 + 1000; // +1s past the boundary, not exactly on it
}

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refreshAll = async (force = false) => {
      try {
        await fetch('/api/conditions/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ force }),
        });
      } catch {
        // ignore — router.refresh() below still picks up whatever's stored
      }
      router.refresh();
    };

    const cancelFns = DAILY_TRIGGERS.map(({ hour, minute, force }) => {
      let timer;
      const schedule = () => {
        timer = setTimeout(() => {
          refreshAll(force);
          schedule();
        }, msUntilNext(hour, minute));
      };
      schedule();
      return () => clearTimeout(timer);
    });

    const periodic = setInterval(() => refreshAll(false), PERIODIC_MS);

    // Catch-up path: a long-lived setTimeout/setInterval in a tab that's
    // been open for hours is exactly what iOS Safari throttles or silently
    // drops under memory pressure — no error, the timer just stops firing.
    // Nothing above catches that; the tab has to wake up and check for
    // itself. `visibilitychange` fires whenever the fridge's screen wakes
    // (touch, or coming back from the night dim); `pageshow` catches a
    // bfcache restore, which resets nothing about page state but also
    // fires no mount effects, so the timers above wouldn't otherwise know
    // time has passed at all.
    const onWake = () => {
      if (document.visibilityState === 'visible') refreshAll(false);
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('pageshow', onWake);

    return () => {
      cancelFns.forEach((cancel) => cancel());
      clearInterval(periodic);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, [router]);

  return null;
}
