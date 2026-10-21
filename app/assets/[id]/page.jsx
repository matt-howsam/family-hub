import { notFound } from 'next/navigation';
import { getSession } from '@/lib/identity';
import { getAsset } from '@/lib/assets';
import { listDocuments } from '@/lib/documents';
import { listDraws } from '@/lib/assetFund';
import AssetDetailScreen from '@/components/AssetDetailScreen';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const asset = await getAsset(id);
  if (!asset) notFound();
  const [documents, draws] = await Promise.all([
    listDocuments({ assetId: asset.id }),
    listDraws({ assetId: asset.id }),
  ]);

  return (
    <AssetDetailScreen asset={asset} documents={documents} draws={draws} fridge={fridge} role={session?.role ?? null} />
  );
}
