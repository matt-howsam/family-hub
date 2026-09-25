import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { PEOPLE } from '@/lib/people';
import { getAvatarConfig, defaultAvatarConfig } from '@/lib/avatarIcon';
import AvatarStudio from '@/components/AvatarStudio';

/* Adults can edit anyone here; a person signed in on their own paired
 * device (role='child' and session.person === id — kids do pair their own
 * phones, see docs/identity.md) can edit their own, same ownership rule
 * as todos in app/people/[person]/page.jsx. Enforced again in
 * /api/settings/avatar, not just here. */
export const dynamic = 'force-dynamic';

export default async function AvatarPersonPage({ params }) {
  const { person: id } = await params;
  const person = PEOPLE[id];
  if (!person) notFound();

  const session = await getSession();
  const isAdult = session?.role === 'adult';
  const isSelf = session?.person === id;

  if (!isAdult && !isSelf) {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings/avatars" className="pair__back"><ArrowLeft size={16} weight="bold" />Avatars</Link>
          <h1 className="pair__title">{person.name}&rsquo;s avatar</h1>
          <p className="pair__note">Only {person.name} or an adult can change this.</p>
        </div>
      </main>
    );
  }

  const cfg = await getAvatarConfig(id);
  const backHref = isAdult ? '/settings/avatars' : `/people/${id}`;

  return <AvatarStudio person={person} initialCfg={cfg} seedCfg={defaultAvatarConfig(id)} backHref={backHref} />;
}
