import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { PEOPLE, CHILDREN } from '@/lib/people';
import { listLibrary, listReviewQueue, owedAndHistory, getBonusSetting } from '@/lib/chores';
import ChoresManager from '@/components/ChoresManager';

/* Adult-only, enforced here and again in /api/chores — see
 * docs/identity.md's "enforce in the route, not the component." The
 * library, review, mark-done and owed/paid surfaces all live here per
 * docs/family-hub-chores-brief.md — claim/submit stay on a child's own
 * view (components/ChoresBoard.jsx), never here. */
export const dynamic = 'force-dynamic';

export default async function ChoresSettingsPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
          <h1 className="pair__title">Chores</h1>
          <p className="pair__note">Only Matt or Renée can use this.</p>
        </div>
      </main>
    );
  }

  const [library, queue, bonusCents, ...owed] = await Promise.all([
    listLibrary(),
    listReviewQueue(),
    getBonusSetting(),
    ...CHILDREN.map((id) => owedAndHistory(id)),
  ]);

  const kids = CHILDREN.map((id, i) => ({ id, name: PEOPLE[id].name, ...owed[i] }));

  return (
    <main className="pair">
      <ChoresManager library={library} queue={queue} kids={kids} bonusCents={bonusCents} />
    </main>
  );
}
