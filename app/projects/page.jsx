import { getSession } from '@/lib/identity';
import { getProjectsView } from '@/lib/projects';
import ProjectsScreen from '@/components/ProjectsScreen';

/* Stages get advanced and jobs get added at any time — never cache. */
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const view = await getProjectsView();

  return <ProjectsScreen view={view} fridge={fridge} role={session?.role ?? null} />;
}
