import { NextResponse } from 'next/server';
import { redeemPairingCode } from '@/lib/identity';

/* The device entering the code becomes whoever the code was generated for
   — it never gets to ask for an identity. See docs/identity.md. */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await redeemPairingCode({ code: body.code, label: body.label });

  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
