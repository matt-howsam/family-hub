import { notFound } from 'next/navigation';
import { getSession } from '@/lib/identity';
import { getGoalDetail, listAims } from '@/lib/goals';
import GoalDetailScreen from '@/components/GoalDetailScreen';

export const dynamic = 'force-dynamic';

export default async function GoalDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const detail = await getGoalDetail(id);
  if (!detail) notFound();

  // v1 ships visibility='me' only (docs/family-hub-goals-brief.md) — a
  // goal is never rendered for anyone but its owner, not even read-only;
  // "private goals... never shown to anyone else" means a 404 here, not a
  // view with the edit controls stripped out.
  if (session?.person !== detail.goal.person) notFound();

  // For "Part of…" — the person's other aims this goal could attach to.
  // Irrelevant (and skipped) for an aim itself, or for a goal that's
  // already a stepping stone of one.
  const existingAims = detail.goal.kind === 'goal' && !detail.goal.aimId
    ? (await listAims(detail.goal.person)).filter((a) => a.id !== detail.goal.id)
    : [];

  return <GoalDetailScreen detail={detail} existingAims={existingAims} />;
}
