/* ==========================================================================
   Family Hub — the meal planner
   Replaces the fridge whiteboard. See docs/family-hub-meal-planner-brief.md.

   Writes are confined to this module and the display/phone gate in
   app/api/planner/route.js. Reads degrade the same way lib/db.js#getAnchor
   does: no database, or a database that rejects the query (e.g. schema.sql
   hasn't been run against it yet), means an empty plan — never a thrown
   error, which on a page like the wall would take the whole render down.
   ========================================================================== */

import { sql } from './db.js';
import { today, TZ } from './week.js';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

function sydneyHM(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  return {
    h: Number(parts.find((p) => p.type === 'hour').value),
    m: Number(parts.find((p) => p.type === 'minute').value),
  };
}

/** Active cards, split by kind, in the hand-set display order. */
export async function getLibrary() {
  if (!sql) return { meals: [], notCooking: [] };
  try {
    const rows = await sql`
      select id, title, icon, kind, prep_note as "prepNote", prep_when as "prepWhen", position
      from meal_card where archived_at is null order by position`;
    return {
      meals: rows.filter((r) => r.kind === 'meal'),
      notCooking: rows.filter((r) => r.kind === 'not_cooking'),
    };
  } catch (e) {
    console.error('getLibrary failed:', e.message);
    return { meals: [], notCooking: [] };
  }
}

/** The seven nights Monday–Sunday starting `monday`, each with its card or null. */
export async function getWeekPlan(monday) {
  const nights = Array.from({ length: 7 }, (_, i) => iso(new Date(monday.getTime() + i * DAY)));
  const empty = () => nights.map((date) => ({ date, card: null }));
  if (!sql) return empty();

  try {
    const rows = await sql`
      select p.night::text as night, c.id, c.title, c.icon, c.kind
      from meal_plan p join meal_card c on c.id = p.meal_card_id
      where p.night = any(${nights}::date[])`;
    const byNight = Object.fromEntries(rows.map((r) => [r.night, r]));
    return nights.map((date) => ({ date, card: byNight[date] ?? null }));
  } catch (e) {
    console.error('getWeekPlan failed:', e.message);
    return empty();
  }
}

export async function setNight(night, cardId, setFrom, setBy = null) {
  if (!sql) return;
  try {
    await sql`
      insert into meal_plan (night, meal_card_id, set_from, set_by)
      values (${night}, ${cardId}, ${setFrom}, ${setBy})
      on conflict (night) do update
        set meal_card_id = excluded.meal_card_id, set_from = excluded.set_from,
            set_by = excluded.set_by, updated_at = now()`;
  } catch (e) {
    console.error('setNight failed:', e.message);
  }
}

export async function clearNight(night) {
  if (!sql) return;
  try {
    await sql`delete from meal_plan where night = ${night}`;
  } catch (e) {
    console.error('clearNight failed:', e.message);
  }
}

/**
 * Fills every empty night from tomorrow through the end of `monday`'s week
 * with the same weekday's card from the previous week. Never overwrites a
 * planned night, never touches a past night. Returns the nights it wrote,
 * so the caller can offer a single undo that clears exactly those.
 */
export async function fillFromLastWeek(monday) {
  if (!sql) return [];
  try {
    const nowKey = iso(today(TZ));
    const prevMonday = new Date(monday.getTime() - 7 * DAY);
    const [thisWeek, lastWeek] = await Promise.all([getWeekPlan(monday), getWeekPlan(prevMonday)]);

    const filled = [];
    for (let i = 0; i < 7; i++) {
      const cur = thisWeek[i];
      if (cur.card || cur.date < nowKey) continue;
      const prev = lastWeek[i].card;
      if (!prev) continue;
      filled.push({ date: cur.date, cardId: prev.id });
    }
    await Promise.all(filled.map((f) => setNight(f.date, f.cardId, 'display')));
    return filled;
  } catch (e) {
    console.error('fillFromLastWeek failed:', e.message);
    return [];
  }
}

/**
 * Tonight's dashboard line: which night, its card, and any prep note whose
 * window is open right now. Morning prep is about tonight's own card,
 * 06:00–09:00; night-before prep is about tomorrow's card, 17:00–20:30 —
 * two independent checks, not one relative to whichever night is "target".
 */
export async function getTonight() {
  const now = new Date();
  const { h, m } = sydneyHM(now);
  const afterCutoff = h > 20 || (h === 20 && m >= 30);

  const calToday = today(TZ);
  const todayKey = iso(calToday);
  const tomorrowKey = iso(new Date(calToday.getTime() + DAY));
  const targetKey = afterCutoff ? tomorrowKey : todayKey;
  const label = afterCutoff ? 'Tomorrow' : 'Tonight';
  const empty = { label, card: null, prep: null };

  if (!sql) return empty;

  try {
    const rows = await sql`
      select p.night::text as night, c.title, c.icon,
             c.prep_note as "prepNote", c.prep_when as "prepWhen"
      from meal_plan p join meal_card c on c.id = p.meal_card_id
      where p.night = any(${[todayKey, tomorrowKey]}::date[])`;
    const byNight = Object.fromEntries(rows.map((r) => [r.night, r]));

    const targetCard = byNight[targetKey] ?? null;

    let prep = null;
    const tonightCard = byNight[todayKey];
    if (tonightCard?.prepWhen === 'morning' && h >= 6 && h < 9) {
      prep = tonightCard.prepNote;
    }
    const tomorrowCard = byNight[tomorrowKey];
    if (!prep && tomorrowCard?.prepWhen === 'night_before' && h >= 17 && (h < 20 || (h === 20 && m < 30))) {
      prep = `For tomorrow: ${tomorrowCard.prepNote}`;
    }

    return {
      label,
      card: targetCard ? { title: targetCard.title, icon: targetCard.icon } : null,
      prep,
    };
  } catch (e) {
    console.error('getTonight failed:', e.message);
    return empty;
  }
}

/* ---- Library — phones only. The API route gates these on role. ---- */

export async function addCard({ title, icon, kind, prepNote, prepWhen }) {
  if (!sql) return;
  try {
    const [{ pos }] = await sql`select coalesce(max(position), 0) + 1 as pos from meal_card`;
    await sql`
      insert into meal_card (title, icon, kind, prep_note, prep_when, position)
      values (${title}, ${icon}, ${kind}, ${prepNote || null}, ${prepWhen || null}, ${pos})
      on conflict (title) do nothing`;
  } catch (e) {
    console.error('addCard failed:', e.message);
  }
}

export async function archiveCard(id) {
  if (!sql) return;
  try {
    await sql`update meal_card set archived_at = now() where id = ${id}`;
  } catch (e) {
    console.error('archiveCard failed:', e.message);
  }
}
