import { getSession } from './identity';

/* Back-compat shim over lib/identity.js#getSession(). The four existing
   call sites only ever check `role === 'display'` for fridge idle-timeout
   and read-only behaviour, so that's all this preserves. An unpaired or
   revoked device has no session — default to 'display' (read-only, fridge
   styling) rather than treating an unknown device as a trusted phone. */
export async function getRole() {
  const session = await getSession();
  return session?.role ?? 'display';
}
