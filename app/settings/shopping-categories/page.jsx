import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { getSession } from '@/lib/identity';
import { getCategories } from '@/lib/shoppinglist';
import CategoryManager from '@/components/CategoryManager';

/* Adult-only, enforced here and again implicitly by living only under
   Settings — see docs/identity.md's "enforce in the route, not the
   component." The shopping list itself stays open to any session (it's
   family-register), but renaming an aisle is a structural, low-frequency
   edit, same category of task as the chores library. */
export const dynamic = 'force-dynamic';

export default async function ShoppingCategoriesPage() {
  const session = await getSession();

  if (session?.role !== 'adult') {
    return (
      <main className="pair">
        <div className="pair__card">
          <Link href="/settings" className="pair__back"><ArrowLeft size={16} weight="bold" />Settings</Link>
          <h1 className="pair__title">Shopping categories</h1>
          <p className="pair__note">Only Matt or Renée can use this.</p>
        </div>
      </main>
    );
  }

  const categories = await getCategories();

  return (
    <main className="pair">
      <CategoryManager categories={categories} />
    </main>
  );
}
