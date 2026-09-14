import { NextResponse } from 'next/server';
import { touchSession } from '@/lib/identity';

/* Server Components can read the session cookie but never write one — see
   lib/identity.js#getSession() vs #touchSession(). This route is the write
   path: pinged once per page load by components/SessionTouch.jsx so the
   sliding seven-day reissue and last_seen_at actually happen somewhere. */
export async function POST() {
  const session = await touchSession();
  return NextResponse.json({ paired: Boolean(session) });
}
