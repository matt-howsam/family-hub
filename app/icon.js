import { iconResponse } from '@/lib/appIcon';

/* Reads app_state on every request rather than baking in whatever the icon
 * was at build time — otherwise saving a new one in Settings would never
 * take effect without a redeploy. */
export const dynamic = 'force-dynamic';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default async function icon() {
  return iconResponse(size.width);
}
