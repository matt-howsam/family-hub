/* ==========================================================================
   Family Hub — Lindisfarne school calendar
   Transcribed from "2026 Term Dates v2 20251205" and "2027 Term Dates v2".

   Terms are stored as published: first student day → last student day.
   Do NOT round these to Mondays. Several terms start on a Tuesday or
   Wednesday because the Monday is a pupil-free day or a public holiday, and
   a week beginning Monday is still a school week. `isSchoolWeek` handles
   that by testing overlap, not membership.
   ========================================================================== */

export const TERMS = [
  // 2026
  { year: 2026, term: 1, name: 'Lent',      start: '2026-01-27', end: '2026-04-02' },
  { year: 2026, term: 2, name: 'Pentecost', start: '2026-04-21', end: '2026-06-26' },
  { year: 2026, term: 3, name: 'Trinity',   start: '2026-07-20', end: '2026-09-25' },
  { year: 2026, term: 4, name: 'Advent',    start: '2026-10-13', end: '2026-12-09' },
  // 2027
  { year: 2027, term: 1, name: 'Lent',      start: '2027-01-28', end: '2027-04-09' },
  { year: 2027, term: 2, name: 'Pentecost', start: '2027-04-28', end: '2027-06-25' },
  { year: 2027, term: 3, name: 'Trinity',   start: '2027-07-19', end: '2027-09-24' },
  { year: 2027, term: 4, name: 'Advent',    start: '2027-10-12', end: '2027-12-08' },
];

/* Non-teaching days inside or adjacent to term, and dated school events.
   Feeds the daily briefing, not the week-letter calculation. */
export const SCHOOL_DATES = [
  { date: '2026-04-20', kind: 'pupil_free', label: 'Pupil free day' },
  { date: '2026-04-27', kind: 'holiday',    label: 'ANZAC Day public holiday' },
  { date: '2026-06-08', kind: 'holiday',    label: "King's Birthday" },
  { date: '2026-10-05', kind: 'holiday',    label: 'Labour Day' },
  { date: '2026-10-12', kind: 'pupil_free', label: 'Pupil free day' },
  { date: '2026-12-07', kind: 'event',      label: 'Junior School Speech Day' },
  { date: '2026-12-08', kind: 'event',      label: 'Middle School Speech Day' },
  { date: '2026-12-09', kind: 'event',      label: 'Senior School Speech Day · last day' },

  { date: '2027-01-26', kind: 'holiday',    label: 'Australia Day' },
  { date: '2027-01-27', kind: 'event',      label: 'Year 7 orientation' },
  { date: '2027-03-26', kind: 'holiday',    label: 'Good Friday' },
  { date: '2027-03-29', kind: 'holiday',    label: 'Easter Monday' },
  { date: '2027-04-26', kind: 'holiday',    label: 'ANZAC Day public holiday' },
  { date: '2027-04-27', kind: 'pupil_free', label: 'Pupil free day' },
  { date: '2027-06-14', kind: 'holiday',    label: "King's Birthday" },
  { date: '2027-10-04', kind: 'holiday',    label: 'Labour Day' },
  { date: '2027-10-11', kind: 'pupil_free', label: 'Pupil free day' },
  { date: '2027-12-06', kind: 'event',      label: 'Junior School Speech Day' },
  { date: '2027-12-07', kind: 'event',      label: 'Middle School Speech Day' },
  { date: '2027-12-08', kind: 'event',      label: 'Senior School Speech Day · last day' },
];

/* Multi-day school events. Camp week takes Years 7–11 out of the timetable
   entirely — the briefing must not print a normal day during one. */
export const SCHOOL_SPANS = [
  { start: '2026-05-18', end: '2026-05-22', label: 'Camp week', years: [7, 8, 9, 10, 11] },
  { start: '2027-05-24', end: '2027-05-28', label: 'Camp week', years: [7, 8, 9, 10, 11] },
];
