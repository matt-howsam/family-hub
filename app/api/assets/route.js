import { NextResponse } from 'next/server';
import { addAsset, editAsset, deleteAsset } from '@/lib/assets';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

/* Adult-only, full stop — same as Register and Projects. Nothing here is
   ever written from the wall. */
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'add':
    case 'edit': {
      if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      if (body.action === 'edit' && !body.id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }
      const fields = {
        name: body.name.trim(), location: body.location?.trim() || null,
        installDate: body.installDate || null, purchaseCost: body.purchaseCost ?? null,
        warrantyExpiry: body.warrantyExpiry || null, expectedLifeYears: body.expectedLifeYears ?? null,
        expectedReplacementYear: body.expectedReplacementYear ?? null,
        replacementEstimate: body.replacementEstimate ?? null, estimateYear: body.estimateYear ?? null,
        notes: body.notes?.trim() || null,
      };
      try {
        if (body.action === 'add') await addAsset(fields);
        else await editAsset({ ...fields, id: body.id });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'delete': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await deleteAsset(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
