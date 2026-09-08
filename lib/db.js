import { neon } from '@neondatabase/serverless';
import { correct, today } from './week.js';

/* No DATABASE_URL means the app still renders — it just can't remember a
   correction past a reload. Deploy first, connect Neon after. */
export const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : null;

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
  } catch {
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
