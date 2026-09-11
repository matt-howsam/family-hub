import { cookies } from 'next/headers';

/* The device role for this request: 'display' (the fridge) or 'person' (a
   phone). Set once via middleware.js from /?role=display, never a write
   this module makes itself. Read-only surfaces use it for idle-timeout
   behaviour; a future write (chore ticks, the meal planner) gates on it. */
export async function getRole() {
  const store = await cookies();
  return store.get('fh_role')?.value === 'display' ? 'display' : 'person';
}
