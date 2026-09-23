import { NextResponse } from 'next/server';
import { addItem, editItem, deleteItem, addSaving, deleteSaving } from '@/lib/register';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

const SECTIONS = new Set(['home_utilities', 'digital_comms', 'transport', 'family_children_holidays', 'health_insurance']);
const FREQUENCIES = new Set(['monthly', 'quarterly', 'annual', 'per_term', 'fixed_term', 'one_off']);
const COST_PERIODS = new Set(['month', 'year', 'term']);
const COST_KINDS = new Set(['actual', 'working_avg', 'estimate', 'allowance', 'paid_to_date', 'tbc']);
const STATUSES = new Set(['k', 'r', 'a']);

/* Adult-only, full stop — no fridge exception (nothing here is ever
   written from the wall) and no partial child access the way holidays
   lets a child suggest an idea. Per docs/identity.md, both Matt and Renée
   are role='adult'; there is no longer a person-level carve-out for this
   module, which is itself the point — see the doc update alongside this
   route for the reasoning. */
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'add':
    case 'edit': {
      if (!body.service?.trim()) {
        return NextResponse.json({ error: 'service is required' }, { status: 400 });
      }
      if (!SECTIONS.has(body.section)) {
        return NextResponse.json({ error: 'invalid section' }, { status: 400 });
      }
      if (!FREQUENCIES.has(body.frequency)) {
        return NextResponse.json({ error: 'invalid frequency' }, { status: 400 });
      }
      if (body.costPeriod != null && !COST_PERIODS.has(body.costPeriod)) {
        return NextResponse.json({ error: 'invalid cost period' }, { status: 400 });
      }
      if (body.costKind != null && !COST_KINDS.has(body.costKind)) {
        return NextResponse.json({ error: 'invalid cost kind' }, { status: 400 });
      }
      if (body.status != null && !STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'invalid status' }, { status: 400 });
      }
      if (body.action === 'edit' && !body.id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }

      const fields = {
        section: body.section,
        service: body.service.trim(),
        provider: body.provider?.trim() || null,
        costCents: body.costCents ?? null,
        costPeriod: body.costPeriod ?? null,
        costKind: body.costKind ?? 'actual',
        frequency: body.frequency,
        renewalDate: body.renewalDate || null,
        renewalLabel: body.renewalLabel?.trim() || null,
        status: body.status ?? 'k',
        excludedFromReducingNumber: Boolean(body.excludedFromReducingNumber),
        hideCostOnFridge: Boolean(body.hideCostOnFridge),
        notes: body.notes?.trim() || null,
      };

      try {
        if (body.action === 'add') {
          await addItem(fields);
        } else {
          await editItem({ ...fields, id: body.id });
        }
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'delete': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await deleteItem(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'add_saving': {
      if (!body.happenedOn || !body.whatChanged?.trim() || !body.annualSavingCents) {
        return NextResponse.json({ error: 'happenedOn, whatChanged and annualSavingCents are required' }, { status: 400 });
      }
      try {
        await addSaving({
          happenedOn: body.happenedOn,
          whatChanged: body.whatChanged.trim(),
          annualSavingCents: body.annualSavingCents,
          whereItWent: body.whereItWent?.trim() || null,
          registerItemId: body.registerItemId ?? null,
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'delete_saving': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await deleteSaving(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
