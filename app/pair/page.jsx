import { getSession, bootstrapAvailable } from '@/lib/identity';
import { PEOPLE } from '@/lib/people';
import PairForm from '@/components/PairForm';

/* The one screen an unpaired device shows — see docs/identity.md. No login
   form, no email field: just "ask an adult to pair this device", a code
   box, and — only until the household's first adult exists — the one-time
   bootstrap panel. */
export const dynamic = 'force-dynamic';

export default async function PairPage() {
  const [session, canBootstrap] = await Promise.all([getSession(), bootstrapAvailable()]);

  return (
    <main className="pair">
      <PairForm
        session={session}
        canBootstrap={canBootstrap}
        adults={Object.values(PEOPLE).filter((p) => p.kind === 'adult')}
      />
    </main>
  );
}
