import { NextResponse } from 'next/server';
import { getSession, createPairingCode } from '@/lib/identity';

/* Only an adult device can mint a code for someone else. Enforced here, in
   the route — never trust the UI to have hidden the button. */
export async function POST(request) {
  const session = await getSession();
  if (session?.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.role === 'display') {
    const result = await createPairingCode({ role: 'display', issuedBy: session.person });
    return NextResponse.json(result);
  }

  if (!body.person) {
    return NextResponse.json({ error: 'person or role: "display" is required' }, { status: 400 });
  }

  // The generating adult picks whether the new device is an adult's or a
  // child's — the person enum alone doesn't say, and defaulting wrongly
  // over- or under-grants write access.
  const targetRole = body.targetRole === 'adult' ? 'adult' : 'child';
  const result = await createPairingCode({
    person: body.person,
    role: targetRole,
    issuedBy: session.person,
  });
  return NextResponse.json(result);
}
