import { notFound } from 'next/navigation';
import { getSession } from '@/lib/identity';
import { getJobDetail } from '@/lib/projects';
import ProjectDetailScreen from '@/components/ProjectDetailScreen';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const detail = await getJobDetail(id);
  if (!detail) notFound();

  return <ProjectDetailScreen detail={detail} fridge={fridge} role={session?.role ?? null} />;
}
