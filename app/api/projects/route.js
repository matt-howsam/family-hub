import { NextResponse } from 'next/server';
import {
  addJob, editJob, deleteJob, advanceStage, backStage, addNote, addQuote, editQuote,
} from '@/lib/projects';
import { getSession } from '@/lib/identity';

export const dynamic = 'force-dynamic';

const TYPES = new Set(['project', 'maintenance']);
const PIPELINES = new Set(['contracted', 'diy', 'supply_install', 'maintenance']);
const STATUSES = new Set(['active', 'parked', 'done']);
const OWNERS = new Set(['matt', 'renee', 'rose', 'tom']);
const BLOCKED_REASONS = new Set(['vendor', 'funds', 'other_job']);
const FUNDING_SOURCES = new Set(['monthly', 'savings', 'undecided']);
const QUOTE_STATUSES = new Set(['requested', 'received', 'accepted', 'declined']);

/* Adult-only, full stop — no fridge exception (nothing here is ever
   written from the wall) and no child access, unlike holidays. "Projects
   and spending are Matt-and-Renée content" per the design review. */
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'adult') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  switch (body.action) {
    case 'add': {
      if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
      if (!TYPES.has(body.type)) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
      if (!PIPELINES.has(body.pipeline)) return NextResponse.json({ error: 'invalid pipeline' }, { status: 400 });
      if (body.owner != null && !OWNERS.has(body.owner)) return NextResponse.json({ error: 'invalid owner' }, { status: 400 });
      try {
        await addJob({
          title: body.title.trim(), type: body.type, pipeline: body.pipeline,
          nextAction: body.nextAction?.trim() || null, owner: body.owner ?? null,
          budgetEst: body.budgetEst ?? null,
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'edit': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
      if (body.status != null && !STATUSES.has(body.status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 });
      if (body.owner != null && !OWNERS.has(body.owner)) return NextResponse.json({ error: 'invalid owner' }, { status: 400 });
      if (body.blockedReason != null && !BLOCKED_REASONS.has(body.blockedReason)) {
        return NextResponse.json({ error: 'invalid blocked reason' }, { status: 400 });
      }
      if (body.fundingSource != null && !FUNDING_SOURCES.has(body.fundingSource)) {
        return NextResponse.json({ error: 'invalid funding source' }, { status: 400 });
      }
      try {
        await editJob({
          id: body.id, title: body.title.trim(), nextAction: body.nextAction?.trim() || null,
          owner: body.owner ?? null, due: body.due || null,
          budgetEst: body.budgetEst ?? null, budgetActual: body.budgetActual ?? null,
          status: body.status ?? 'active', blockedReason: body.blockedReason ?? null,
          blockedBy: body.blockedBy ?? null, fundingSource: body.fundingSource ?? null,
          waitingOn: body.waitingOn?.trim() || null, waitingSince: body.waitingSince || null,
          waitingExpected: body.waitingExpected || null, registerItemId: body.registerItemId ?? null,
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'delete': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await deleteJob(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'advance': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await advanceStage(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'back': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      try {
        await backStage(body.id);
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'add_note': {
      if (!body.jobId || !body.body?.trim()) {
        return NextResponse.json({ error: 'jobId and body are required' }, { status: 400 });
      }
      try {
        await addNote(body.jobId, session.person, body.body.trim());
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'add_quote': {
      if (!body.jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
      if (body.status != null && !QUOTE_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'invalid quote status' }, { status: 400 });
      }
      try {
        await addQuote({
          jobId: body.jobId, vendor: body.vendor?.trim() || null, contact: body.contact?.trim() || null,
          amount: body.amount ?? null, validUntil: body.validUntil || null, status: body.status ?? 'requested',
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'edit_quote': {
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      if (body.status != null && !QUOTE_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'invalid quote status' }, { status: 400 });
      }
      try {
        await editQuote({
          id: body.id, vendor: body.vendor?.trim() || null, contact: body.contact?.trim() || null,
          amount: body.amount ?? null, validUntil: body.validUntil || null, status: body.status ?? 'requested',
        });
      } catch {
        return NextResponse.json({ error: 'write_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
