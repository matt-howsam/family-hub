import { getSession } from '@/lib/identity';
import { getRegisterView } from '@/lib/register';
import RegisterScreen from '@/components/RegisterScreen';

/* Renewal dates get ticked and costs get corrected at any time — never cache. */
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const view = await getRegisterView();

  return <RegisterScreen view={view} fridge={fridge} role={session?.role ?? null} />;
}
