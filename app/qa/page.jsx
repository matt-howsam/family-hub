import { getSession } from '@/lib/identity';
import QaScreen from '@/components/QaScreen';

/* Phones and adults only, per docs/family-hub-gmail-ingestion-brief.md —
   enforced again in app/api/qa/route.js, which is the check that actually
   matters. This page-level check just avoids showing the box at all to a
   child or the fridge. */
export const dynamic = 'force-dynamic';

export default async function QaPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <h1 className="pair__title">Ask about school mail</h1>
          <p className="pair__note">Only Matt or Renée can use this.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pair">
      <QaScreen />
    </main>
  );
}
