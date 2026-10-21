import { getSession } from '@/lib/identity';
import { getRegisterView } from '@/lib/register';
import { getMonthlyPositionView, getAssetFundView } from '@/lib/monthlyPosition';
import RegisterScreen from '@/components/RegisterScreen';

/* Renewal dates get ticked and costs get corrected at any time — never cache. */
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = await getSession();
  const fridge = !session || session.role === 'display';
  const view = await getRegisterView();

  // Income/position/fund are stricter than the rest of this page: adults
  // only, phones only, never on the fridge "in any form" (the brief's own
  // words) — not just visually hidden, never fetched for anyone else, the
  // same full-omission treatment this module already gives `notes`.
  const showPosition = session?.role === 'adult';
  const [position, fund] = showPosition
    ? await Promise.all([getMonthlyPositionView(), getAssetFundView()])
    : [null, null];

  return (
    <RegisterScreen view={view} fridge={fridge} role={session?.role ?? null} position={position} fund={fund} />
  );
}
