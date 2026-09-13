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

   Two triggers:
   - Right after local midnight, so the day-dependent content (today's
     briefing, today's meal, What's On's Today/Tomorrow split) never has a
     chance to sit wrong for hours.
   - Every 15 minutes regardless, matching the calendar/conditions fetch
     cache's own revalidate window — no point refreshing more often than
     the underlying data can actually change. */
const TZ = 'Australia/Sydney';
const PERIODIC_MS = 15 * 60 * 1000;

function msUntilNextMidnight(tz = TZ) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const msIntoDay = ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second')) * 1000;
  return 86400000 - msIntoDay + 1000; // +1s past midnight, not exactly on it
}

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let midnightTimer;
    const scheduleMidnight = () => {
      midnightTimer = setTimeout(() => {
        router.refresh();
        scheduleMidnight();
      }, msUntilNextMidnight());
    };
    scheduleMidnight();

    const periodic = setInterval(() => router.refresh(), PERIODIC_MS);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(periodic);
    };
  }, [router]);

  return null;
}
