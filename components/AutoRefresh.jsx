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

   Daily triggers, each independent of what data source is behind them —
   this doesn't care which weather API lib/conditions.js calls, so a more
   accurate source can land later without touching this file:
   - 00:00 — the day boundary. Today's briefing, today's meal and What's
     On's Today/Tomorrow split are all wrong for hours otherwise.
   - 06:00 — the morning forecast. Whatever's behind lib/conditions.js by
     the time anyone's up, they see it, not whatever was cached overnight.

   Plus a 15-minute periodic refresh regardless, matching the calendar and
   conditions fetches' own revalidate window — no point refreshing more
   often than the underlying data can actually change. */
const TZ = 'Australia/Sydney';
const PERIODIC_MS = 15 * 60 * 1000;
const DAILY_TRIGGERS = [
  { hour: 0, minute: 0 },
  { hour: 6, minute: 0 },
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
    const cancelFns = DAILY_TRIGGERS.map(({ hour, minute }) => {
      let timer;
      const schedule = () => {
        timer = setTimeout(() => {
          router.refresh();
          schedule();
        }, msUntilNext(hour, minute));
      };
      schedule();
      return () => clearTimeout(timer);
    });

    const periodic = setInterval(() => router.refresh(), PERIODIC_MS);

    return () => {
      cancelFns.forEach((cancel) => cancel());
      clearInterval(periodic);
    };
  }, [router]);

  return null;
}
