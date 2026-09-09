/* ==========================================================================
   Family Hub — the term layer
   Timetables, uniform rules and standing after-school activities.

   Set once a term, by hand, on purpose. SEQTA has no API and its printed
   output is frequently amended by hand, so this is entered and corrected
   rather than imported. It is stable for ten weeks at a time.

   Everything here is Term 3 2026 unless marked otherwise.
   ========================================================================== */

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export const STUDENTS = {
  rose: { name: 'Rose', year: 7, tint: 'rose', endsAt: '3:20' },
  tom:  { name: 'Tom',  year: 6, tint: 'tom',  endsAt: 'Met 3:10' },
};

/* --------------------------------------------------------------------------
   Timetables. Subjects in period order, homeroom excluded.

   Rose — verified against SEQTA for the week of 10 August 2026 (Week B) and
   against her own rebuilt timetable for Week A. Both confirmed current.

   Tom — TRANSCRIBED FROM A TERM 1 SHEET and not yet re-verified for Term 3.
   Treat as provisional until checked. The sheet also carried four handwritten
   amendments, which are applied here.
   -------------------------------------------------------------------------- */

export const TIMETABLE = {
  rose: {
    A: {
      mon: ['Pastoral Care', 'HSIE', 'Visual Arts', 'English', 'French', 'Mathematics'],
      tue: ['PDHPE', 'Assembly', 'Mathematics', 'Science', 'HSIE', 'Technology'],
      wed: ['Science', 'Science', 'Mathematics', 'Visual Arts', 'English', 'HSIE'],
      thu: ['PDHPE', 'Science', 'Sport - Dance', 'Sport - Dance', 'DiscoverEd', 'English'],
      fri: ['English', 'Visual Arts', 'HSIE', 'Mathematics', 'Technology', 'Religious Education'],
    },
    B: {
      mon: ['Pastoral Care', 'Chapel', 'Science', 'Visual Arts', 'Mathematics', 'English'],
      tue: ['PDHPE', 'Technology', 'Science', 'English', 'French', 'HSIE'],
      wed: ['Mathematics', 'English', 'Technology', 'Science', 'Technology', 'HSIE'],
      thu: ['Technology', 'PDHPE', 'Sport - Dance', 'Sport - Dance', 'DiscoverEd', 'Visual Arts'],
      fri: ['English', 'HSIE', 'Mathematics', 'PDHPE', 'Mathematics', 'Visual Arts'],
    },
  },
  tom: {
    A: {
      mon: ['English', 'English', 'English', 'Integrated Studies', 'Integrated Studies', 'English', 'Integrated Studies'],
      tue: ['PE Theory', 'Assembly', 'Mathematics', 'English', 'Mathematics', 'English', 'Dance'],
      wed: ['Drama', 'Mathematics', 'Mathematics', 'English', 'Music', 'English', 'Integrated Studies'],
      thu: ['Chapel', 'Mathematics', 'Mathematics', 'English', 'Mathematics', 'English', 'Visual Arts'],
      fri: ['Japanese', 'Mathematics', 'Mathematics', 'Sport', 'Sport', 'English', 'Pastoral Care'],
    },
    B: {
      mon: ['Music', 'English', 'English', 'DiscoverEd', 'DiscoverEd', 'English', 'Integrated Studies'],
      tue: ['English', 'Mathematics', 'Mathematics', 'PE Prac', 'Integrated Studies', 'English', 'Integrated Studies'],
      wed: ['English', 'Mathematics', 'Mathematics', 'Integrated Studies', 'Integrated Studies', 'English', 'Religious Education'],
      thu: ['Japanese', 'Mathematics', 'Mathematics', 'Visual Arts', 'English', 'English', 'PE Prac'],
      fri: ['Music', 'Mathematics', 'Mathematics', 'Sport', 'Sport', 'English', 'Pastoral Care'],
    },
  },
};

/* --------------------------------------------------------------------------
   Uniform. The rule is annotation, never data — on Rose's timetable it lives
   in a pictogram (shirt = practical, apple = theory) and on Tom's it is a
   highlighter scrawl across the top of the page. So it is entered by hand.

   Anything not listed is formal.
   -------------------------------------------------------------------------- */

export const UNIFORM = {
  rose: { A: { tue: 'sport', thu: 'sport' }, B: { fri: 'sport' } },
  tom:  { A: { fri: 'sport' }, B: { tue: 'sport', thu: 'sport', fri: 'sport' } },
};

export const UNIFORM_LABEL = { sport: 'PE uniform', formal: 'Formal uniform' };

/* --------------------------------------------------------------------------
   Standing after-school activities. One-offs come from the Home calendar.
   -------------------------------------------------------------------------- */

/* Verified against the Home calendar, September 2026. Only a fallback — a
   real calendar event for the same day overrides these. */
export const AFTER_SCHOOL = {
  rose: { mon: 'Dance, 6:15', tue: 'Pilates, 4:30', wed: 'Cadets, 6:30' },
  tom:  { thu: 'Surfing, 4:00' },
};

/* --------------------------------------------------------------------------
   What a subject requires.

   ORDER IS PRIORITY, not period order. A day with both Technology and
   Sport - Dance needs dance gear mentioned, not closed shoes — matching on
   whichever happened to fall earlier in the day surfaces the wrong thing.

   Visual Arts is deliberately absent. An art shirt is needed most days and a
   reminder that fires constantly stops being read.
   -------------------------------------------------------------------------- */

export const BRING = [
  ['Sport - Dance', 'Dance gear'],
  ['PE Prac',       'Sport shoes and a water bottle'],
  ['Sport',         'Sport shoes and a water bottle'],
  ['Music',         'Instrument'],
  ['Technology',    'Closed shoes'],
];

/* Subjects worth naming as the headline — the unusual thing about today,
   in rough priority order. Ordinary lessons are not news. */
const NOTABLE = [
  'Chapel', 'Assembly', 'Sport - Dance', 'PE Prac', 'Sport',
  'Music', 'Drama', 'Dance', 'DiscoverEd', 'Technology', 'Visual Arts',
];

/* Rose's Technology is "Technology - Material Timber" in SEQTA. Shortened
   here because the fridge reads at a metre, not a desk. */

/**
 * Today's briefing for one student.
 * Returns null on a weekend or outside term — the caller decides what to show.
 */
export function briefing(id, letter, day) {
  const student = STUDENTS[id];
  if (!student || !DAYS.includes(day)) return null;

  const periods = TIMETABLE[id]?.[letter]?.[day];
  if (!periods) return null;

  const uniform = UNIFORM[id]?.[letter]?.[day] ?? 'formal';

  const headline = NOTABLE.find((n) => periods.includes(n)) ?? null;
  const bring = BRING.find(([subject]) => periods.includes(subject))?.[1] ?? null;

  return {
    ...student,
    id,
    periods,
    uniform,
    uniformLabel: UNIFORM_LABEL[uniform],
    headline,
    bring,
    after: AFTER_SCHOOL[id]?.[day] ?? null,
  };
}

/** Monday-indexed day key for a date, or null at the weekend. */
export function dayKey(d) {
  return DAYS[(d.getUTCDay() + 6) % 7] ?? null;
}
