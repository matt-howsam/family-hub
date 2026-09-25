import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { PEOPLE } from '@/lib/people';
import { getAvatarConfig, defaultAvatarConfig } from '@/lib/avatarIcon';
import AvatarStudio from '@/components/AvatarStudio';

export const dynamic = 'force-dynamic';

export default async function AvatarPersonPage({ params }) {
  const { person: id } = await params;
  const person = PEOPLE[id];
  if (!person) notFound();

  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings/avatars" className="pair__back"><ArrowLeft size={16} weight="bold" />Avatars</Link>
          <h1 className="pair__title">{person.name}&rsquo;s avatar</h1>
          <p className="pair__note">Only Matt or Renée can change this.</p>
        </div>
      </main>
    );
  }

  const cfg = await getAvatarConfig(id);

  return <AvatarStudio person={person} initialCfg={cfg} seedCfg={defaultAvatarConfig(id)} />;
}
