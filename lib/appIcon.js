import { createElement as h } from 'react';
import { ImageResponse } from 'next/og';
import { sql } from './db.js';
import { DEFAULT_CFG, PRESETS, derive } from './hubIcon.js';

const CFG_KEY = 'app_icon_cfg';
const PNG_KEY = 'app_icon_png';

export async function getIconConfig() {
  if (!sql) return DEFAULT_CFG;
  try {
    const rows = await sql`select value from app_state where key = ${CFG_KEY}`;
    return rows[0]?.value ? Object.assign({}, DEFAULT_CFG, rows[0].value) : DEFAULT_CFG;
  } catch (e) {
    console.error('getIconConfig failed:', e.message);
    return DEFAULT_CFG;
  }
}

export async function setIconConfig(cfg) {
  if (!sql) return;
  await sql`
    insert into app_state (key, value) values (${CFG_KEY}, ${JSON.stringify(cfg)}::jsonb)
    on conflict (key) do update set value = excluded.value`;
}

/* The rendered master PNG (1024×1024, base64), regenerated client-side
 * whenever the icon is saved — see AppIconStudio's toPNG() call. Serving
 * pre-rendered bytes here means /icon and /apple-icon need no canvas or
 * font-loading of their own. */
export async function getIconPng() {
  if (!sql) return null;
  try {
    const rows = await sql`select value from app_state where key = ${PNG_KEY}`;
    const b64 = rows[0]?.value?.data;
    return b64 ? Buffer.from(b64, 'base64') : null;
  } catch (e) {
    console.error('getIconPng failed:', e.message);
    return null;
  }
}

export async function setIconPng(base64) {
  if (!sql) return;
  await sql`
    insert into app_state (key, value) values (${PNG_KEY}, ${JSON.stringify({ data: base64 })}::jsonb)
    on conflict (key) do update set value = excluded.value`;
}

/* No one's saved a custom icon yet: the "Roof" preset, a mark rather than
 * lettering, so it needs no web font loaded into the image renderer. */
const FALLBACK_CFG = PRESETS.find((p) => p.name === 'Roof').cfg;

/* Shared by app/icon.js and app/apple-icon.js. Serves the saved master
 * PNG as-is when there is one (the OS scales it to whatever size it
 * declared), otherwise renders the fallback at the requested size. */
export async function iconResponse(px) {
  const png = await getIconPng();
  if (png) return new Response(png, { headers: { 'content-type': 'image/png' } });

  const d = derive(FALLBACK_CFG);
  return new ImageResponse(
    h(
      'div',
      {
        style: {
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: d.bg, borderRadius: d.radius,
        },
      },
      h(
        'svg',
        { viewBox: '0 0 100 100', width: '72%', height: '72%' },
        h('path', {
          d: d.path, fill: 'none', stroke: d.fg, strokeWidth: d.sw, strokeLinecap: 'round', strokeLinejoin: 'round',
        }),
      ),
    ),
    { width: px, height: px },
  );
}
