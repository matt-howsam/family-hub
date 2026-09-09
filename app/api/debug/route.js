import { NextResponse } from 'next/server';
import { hasDb, getAnchor } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  const a = process.env.DATABASE_URL;
  const b = process.env.hubdb_DATABASE_URL;
  let query = null;
  try {
    query = { ok: true, anchor: await getAnchor() };
  } catch (e) {
    query = { ok: false, error: e.message };
  }
  return NextResponse.json({
    DATABASE_URL: { present: a !== undefined, length: a?.length ?? 0, head: a?.slice(0, 14) ?? null },
    hubdb_DATABASE_URL: { present: b !== undefined, length: b?.length ?? 0, head: b?.slice(0, 14) ?? null },
    hasDb,
    query,
  });
}