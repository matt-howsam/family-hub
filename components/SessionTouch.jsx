'use client';

import { useEffect } from 'react';

/* Fires once per page load so lib/identity.js#touchSession() gets a chance
   to bump last_seen_at and re-issue the cookie past the seven-day mark.
   Server Components can read the session cookie but not write one, so this
   is the only place that write happens — same pattern as AutoRefresh
   pinging /api/conditions/refresh. */
export default function SessionTouch() {
  useEffect(() => {
    fetch('/api/session/touch', { method: 'POST' }).catch(() => {});
  }, []);

  return null;
}
