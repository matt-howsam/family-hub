import { iconResponse } from '@/lib/appIcon';

/* iOS bakes this into the home screen the moment someone taps "Add to Home
 * Screen" and never re-fetches it — see the note on the Settings screen.
 * 180×180 is Apple's current standard tap-icon size. */
export const dynamic = 'force-dynamic';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function appleIcon() {
  return iconResponse(size.width);
}
