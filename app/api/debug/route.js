import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    keys: Object.keys(process.env)
      .filter(k => /URL|PG|NEON|HUB|DATABASE|POSTGRES/i.test(k))
      .sort(),
  });
}