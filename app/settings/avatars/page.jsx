import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { PEOPLE, PEOPLE_ORDER } from '@/lib/people';
import { getAllAvatarConfigs } from '@/lib/avatarIcon';
import HubIcon from '@/components/HubIcon';

/* Adult-only, enforced here and again in /api/settings/avatar — see
 * docs/identity.md's "enforce in the route, not the component." */
export const dynamic = 'force-dynamic';

export default async function AvatarsPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
          <h1 className="pair__title">Avatars</h1>
          <p className="pair__note">Only Matt or Renée can change these.</p>
        </div>
      </main>
    );
  }

  const icons = await getAllAvatarConfigs();

  return (
    <div className="ic-page">
      <div className="ic-header">
        <Link href="/settings" className="wo-back" aria-label="Back to settings">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="ic-header__title">Avatars</h1>
          <p className="ic-header__note">Each person&rsquo;s own mark, for the wall strip and their own view.</p>
        </div>
      </div>

      <div className="ic-section">
        <div className="ic-avatar-grid">
          {PEOPLE_ORDER.map((id) => (
            <Link key={id} href={`/settings/avatars/${id}`} className="ic-avatar-grid__item">
              <HubIcon icon={icons[id]} size={80} />
              <span className="ic-avatar-grid__name">{PEOPLE[id].name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
