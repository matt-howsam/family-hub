import { NextResponse } from 'next/server';
import { addAsset, editAsset, deleteAsset } from '@/lib/assets';
import { addDraw, deleteDraw } from '@/lib/assetFund';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

const REPAIR_BASES = new Set(['entered', 'percent_of_value']);
const DRAW_KINDS = new Set(['repair', 'replacement']);

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
      if (body.repairBasis != null && !REPAIR_BASES.has(body.repairBasis)) {
        return NextResponse.json({ error: 'invalid repair basis' }, { status: 400 });
      }
      const fields = {
        name: body.name.trim(), location: body.location?.trim() || null,
        installDate: body.installDate || null, purchaseCost: body.purchaseCost ?? null,
        warrantyExpiry: body.warrantyExpiry || null, expectedLifeYears: body.expectedLifeYears ?? null,
        expectedReplacementYear: body.expectedReplacementYear ?? null,
        replacementEstimate: body.replacementEstimate ?? null, estimateYear: body.estimateYear ?? null,
        repairAllowanceAnnualCents: body.repairAllowanceAnnualCents ?? null,
        repairBasis: body.repairBasis ?? null,
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

    case 'add_draw': {
      if (!body.assetId || body.amountCents == null || !body.occurredOn) {
        return NextResponse.json({ error: 'assetId, amountCents and occurredOn are required' }, { status: 400 });
      }
      if (!DRAW_KINDS.has(body.kind)) {
        return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
      }
      try {
        await addDraw({
          assetId: body.assetId, amountCents: body.amountCents, kind: body.kind, occurredOn: body.occurredOn,
          vendor: body.vendor?.trim() || null, note: body.note?.trim() || null,
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'delete_draw': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await deleteDraw(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
