import { NextResponse } from 'next/server';
import { getSession } from '@/lib/identity';
import { getProposal, canReview, approveItem, discardItem } from '@/lib/review';

/* Who may act on a proposal depends on its own approver_role, not just the
   caller's — an adult reviews the shared household queue, a child reviews
   only proposals naming them, no adult override. Checked here from the DB
   row itself, never trusted from the client. */
export async function POST(request) {
  const session = await getSession();
  const body = await request.json().catch(() => ({}));

  if (!body.id || !['approve', 'discard'].includes(body.action)) {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  const proposal = await getProposal(body.id);
  if (!proposal) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (proposal.reviewed_at) return NextResponse.json({ error: 'already reviewed' }, { status: 409 });
  if (!canReview(session, proposal)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const reviewedBy = session.person ?? session.role;
  const result =
    body.action === 'approve' ? await approveItem(body.id, reviewedBy) : await discardItem(body.id, reviewedBy);

  if (result.error) return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result);
}
