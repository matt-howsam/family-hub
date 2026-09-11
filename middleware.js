import { NextResponse } from 'next/server';

/* The fridge identifies itself once, by URL, and is remembered from then on
   — no login, no deploy. Visit /?role=display on the kiosk iPad and every
   later request from it carries the cookie. Everything else (a phone, a
   laptop reviewing this in a browser) is a person by default. */
const COOKIE = 'fh_role';
const YEAR = 60 * 60 * 24 * 365;

export function middleware(request) {
  const role = request.nextUrl.searchParams.get('role');
  if (role !== 'display' && role !== 'person') return NextResponse.next();

  const url = request.nextUrl.clone();
  url.searchParams.delete('role');
  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE, role, { maxAge: YEAR, sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: '/((?!_next|api).*)',
};
