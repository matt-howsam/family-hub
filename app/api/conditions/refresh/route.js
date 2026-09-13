import { NextResponse } from 'next/server';
import { refreshConditions } from '@/lib/conditions';

/* Pinged by AutoRefresh's client-side timers rather than a Vercel Cron Job
   — Hobby-plan cron is capped at once/day, and refreshConditions() already
   no-ops when the stored data is under 50 minutes old, so calling this
   every 15 minutes is cheap and self-limiting to roughly hourly real
   fetches regardless of who's calling it or how often. */
export async function POST(request) {
  let force = false;
  try {
    ({ force = false } = await request.json());
  } catch {
    // no body — force stays false
  }
  const result = await refreshConditions({ force });
  return NextResponse.json({ ok: Boolean(result) });
}
