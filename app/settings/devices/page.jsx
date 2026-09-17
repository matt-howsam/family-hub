import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession, listDevices } from '@/lib/identity';
import { PEOPLE } from '@/lib/people';
import DeviceManager from '@/components/DeviceManager';

/* Adult-only, enforced here (and again in the API routes it calls) rather
   than by hiding the link — see docs/identity.md's "enforce in the route,
   not the component." */
export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
          <h1 className="pair__title">Pair a device</h1>
          <p className="pair__note">Only Matt or Renée can pair or manage devices.</p>
        </div>
      </main>
    );
  }

  const devices = await listDevices();
  const people = Object.values(PEOPLE);

  return (
    <main className="pair">
      <DeviceManager devices={devices} people={people} />
    </main>
  );
}
