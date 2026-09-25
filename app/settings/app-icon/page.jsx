import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { getIconConfig } from '@/lib/appIcon';
import AppIconStudio from '@/components/AppIconStudio';

/* Adult-only, enforced here and again in /api/settings/app-icon — see
 * docs/identity.md's "enforce in the route, not the component." */
export const dynamic = 'force-dynamic';

export default async function AppIconPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
          <h1 className="pair__title">App icon</h1>
          <p className="pair__note">Only Matt or Renée can change this.</p>
        </div>
      </main>
    );
  }

  const cfg = await getIconConfig();

  return <AppIconStudio initialCfg={cfg} />;
}
