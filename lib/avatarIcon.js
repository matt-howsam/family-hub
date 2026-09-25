import { sql } from './db.js';
import { PEOPLE, PEOPLE_ORDER } from './people.js';

/* Seeded from each person's existing --fh-{id}-disc / --fh-{id}-ink tokens
 * (app/tokens.css §4 PEOPLE) so an avatar looks right — and matches what
 * was there before — the first time anyone opens the studio. 'Ro' for
 * Rose rather than 'R' sidesteps the fact she and Renée share an initial. */
const SEED = {
  matt:  { kind: 'type', font: 'sans', text: 'M',  fg: '#1F4B70', bg1: '#DCEAF6', bg2: '#B9D3EA', fill: 'linear', angle: 150, shape: 'circle', effect: 'none', gloss: false },
  renee: { kind: 'type', font: 'sans', text: 'R',  fg: '#7E3A24', bg1: '#FAE3DA', bg2: '#F0C3B2', fill: 'linear', angle: 150, shape: 'circle', effect: 'none', gloss: false },
  rose:  { kind: 'type', font: 'sans', text: 'Ro', fg: '#3D3878', bg1: '#E5E4F7', bg2: '#C6C3EC', fill: 'linear', angle: 150, shape: 'circle', effect: 'none', gloss: false },
  tom:   { kind: 'type', font: 'sans', text: 'T',  fg: '#0F5A51', bg1: '#D8EFEA', bg2: '#AEDCD3', fill: 'linear', angle: 150, shape: 'circle', effect: 'none', gloss: false },
};

export function defaultAvatarConfig(personId) {
  return SEED[personId] || Object.assign({}, SEED.matt, { text: (PEOPLE[personId]?.initial || '?') });
}

const KEY = (id) => `avatar_cfg_${id}`;

export async function getAvatarConfig(personId) {
  const fallback = defaultAvatarConfig(personId);
  if (!sql) return fallback;
  try {
    const rows = await sql`select value from app_state where key = ${KEY(personId)}`;
    return rows[0]?.value ? Object.assign({}, fallback, rows[0].value) : fallback;
  } catch (e) {
    console.error('getAvatarConfig failed:', e.message);
    return fallback;
  }
}

/* One round trip for the wall strip, which needs all four at once rather
 * than one query per person. */
export async function getAllAvatarConfigs() {
  const out = {};
  for (const id of PEOPLE_ORDER) out[id] = defaultAvatarConfig(id);
  if (!sql) return out;
  try {
    const keys = PEOPLE_ORDER.map(KEY);
    const rows = await sql`select key, value from app_state where key = any(${keys})`;
    for (const row of rows) {
      const id = row.key.replace('avatar_cfg_', '');
      out[id] = Object.assign({}, out[id], row.value);
    }
  } catch (e) {
    console.error('getAllAvatarConfigs failed:', e.message);
  }
  return out;
}

export async function setAvatarConfig(personId, cfg) {
  if (!sql) return;
  await sql`
    insert into app_state (key, value) values (${KEY(personId)}, ${JSON.stringify(cfg)}::jsonb)
    on conflict (key) do update set value = excluded.value`;
}
