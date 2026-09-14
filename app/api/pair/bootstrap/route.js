import { NextResponse } from 'next/server';
import { bootstrapAdult, bootstrapAvailable } from '@/lib/identity';

/* Claims the first adult identity from SETUP_TOKEN. Works exactly once —
   see docs/identity.md. */
export async function GET() {
  return NextResponse.json({ available: await bootstrapAvailable() });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await bootstrapAdult({
    token: body.token,
    person: body.person,
    label: body.label,
  });

  if (result.error) {
    const status = result.error === 'not_configured' ? 501 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
