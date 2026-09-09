import { neon } from '@neondatabase/serverless';
import { correct, today } from './week.js';

/* The Vercel Neon integration prefixes its variables when you give it one,
   and the prefix is lowercased. Accept either, and treat an empty string as
   absent — a blank var is worse than a missing one, because it looks present. */
   const CONN =
   process.env.DATABASE_URL?.trim() ||
   process.env.hubdb_DATABASE_URL?.trim() ||
   null;
 
 export const sql = CONN ? neon(CONN) : null;
 
 export const hasDb = Boolean(sql);

/* Confirmed by Matt, Monday 7 September 2026: Week B, whole school, one cycle
   for every year level. Independently validated — the SEQTA reading of
   10 August (Week B) rolls forward four school weeks to land on B. */
const SEED = { letter: 'B', monday: '2026-09-07', setBy: 'Matt' };

export async function getAnchor() {
  if (!sql) return SEED;
  try {
    const rows = await sql`
      select letter, to_char(monday,'YYYY-MM-DD') as monday, set_by as "setBy"
      from week_anchor where id = true`;
    return rows[0] ?? SEED;
  } catch (e) {
    console.error('getAnchor failed:', e.message);
    return SEED;
  }
}

export async function setAnchor(letter, setBy = 'Matt') {
  const a = correct(letter, today(), setBy);
  if (!sql) return a;
  await sql`
    insert into week_anchor (id, letter, monday, set_by)
    values (true, ${a.letter}, ${a.monday}, ${a.setBy})
    on conflict (id) do update
      set letter = excluded.letter,
          monday = excluded.monday,
          set_by = excluded.set_by,
          updated_at = now()`;
  return a;
}
