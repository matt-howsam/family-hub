/* ==========================================================================
   Family Hub — the person registry
   One canonical id, name, avatar initial and (for children) year and tint
   per person. The avatar strip, the kids' home cards and the person views
   all read from here instead of each keeping their own copy.
   ========================================================================== */

export const PEOPLE = {
  matt:  { id: 'matt',  name: 'Matt',  initial: 'M', kind: 'adult' },
  renee: { id: 'renee', name: 'Renée', initial: 'R', kind: 'adult' },
  rose:  { id: 'rose',  name: 'Rose',  initial: 'R', kind: 'child', year: 7, tint: 'rose', endsAt: '3:20' },
  tom:   { id: 'tom',   name: 'Tom',   initial: 'T', kind: 'child', year: 6, tint: 'tom', endsAt: 'Met 3:10' },
};

/* Display order on the avatar strip. */
export const PEOPLE_ORDER = ['matt', 'renee', 'rose', 'tom'];

/* Display order on the home wall — Tom's card sits above Rose's. */
export const CHILDREN = ['tom', 'rose'];
export const ADULTS = ['matt', 'renee'];

export function person(id) {
  return PEOPLE[id] ?? null;
}
