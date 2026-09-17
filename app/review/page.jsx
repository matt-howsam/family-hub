import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { listQueue } from '@/lib/review';
import ReviewQueue from '@/components/ReviewQueue';

/* Phones only, per docs/ingestion.md invariant 1 — nothing reaches the
   fridge unreviewed, and reviewing is itself a phone action. An adult's
   queue and a child's queue are different result sets (lib/review.js),
   never a filtered view of one shared list. */
export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const session = await getSession();

  if (!session || session.role === 'display') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
          <h1 className="pair__title">Review queue</h1>
          <p className="pair__note">Pair this device as a person to review proposals.</p>
        </div>
      </main>
    );
  }

  const items = await listQueue(session);

  return (
    <main className="pair">
      <ReviewQueue items={items} />
    </main>
  );
}
