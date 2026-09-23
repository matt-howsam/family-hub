import { getSession } from '@/lib/identity';
import { getAssetsView } from '@/lib/assets';
import AssetsScreen from '@/components/AssetsScreen';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const view = await getAssetsView();

  return <AssetsScreen view={view} fridge={fridge} role={session?.role ?? null} />;
}
