import { NextResponse } from 'next/server';

/* Identity now comes from pairing (docs/identity.md), not a URL query param
   — this replaces the old `/?role=display` cookie-setter. Middleware only
   does the cheap, Edge-safe part: an unpaired device (no session cookie at
   all) gets bounced to /pair. The actual role/person lookup — the real
   boundary — happens server-side per request in lib/identity.js#getSession(),
   which needs the Node runtime (crypto, the DB driver) and so cannot live
   here. A revoked device still has a cookie and passes this check; its
   session simply resolves to null downstream. */
const COOKIE = 'fh_session';

export function middleware(request) {
  if (request.cookies.get(COOKIE)?.value) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/pair';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|pair|icons|manifest|favicon).*)'],
};
