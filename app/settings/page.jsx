import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';

/* One consolidated stop for every adult-only utility — Q&A, the review
   queue, device pairing — rather than each getting its own entry point on
   the wall. Keeps the wall itself uncluttered for the three people who
   can't use any of these anyway, and gives whatever adult-only thing shows
   up next a home without needing a new top-level link. */
export const dynamic = 'force-dynamic';

const LINKS = [
  { href: '/qa', title: 'Ask about school mail', note: 'Search everything ingested, with citations' },
  { href: '/review', title: 'Review queue', note: 'Approve or discard proposed items' },
  { href: '/settings/devices', title: 'Pair a device', note: 'Generate a code, manage paired devices' },
  { href: '/register?from=settings', title: 'Operations register', note: 'Renewals, costs and the number we’re reducing' },
];

export default async function SettingsPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/" className="pair__back"><ArrowLeft size={16} weight="bold" />Wall</Link>
          <h1 className="pair__title">Settings</h1>
          <p className="pair__note">Only Matt or Renée can use this.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pair">
      <div className="pair__card">
        <Link href="/" className="pair__back"><ArrowLeft size={16} weight="bold" />Wall</Link>
        <h1 className="pair__title">Settings</h1>
        <div data-register="household">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row__main">
                <span className="row__title">{l.title}</span>
                <span className="row__sub">{l.note}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
