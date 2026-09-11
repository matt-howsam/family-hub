import {
  Globe, PencilSimple, Palette, Flask, BookOpen, Barbell, UsersThree,
  Wrench, Compass, MusicNotes, Translate, MaskHappy, Book, Church, SoccerBall,
} from '@phosphor-icons/react/ssr';

/* Decoration only, never status — see docs/designs/.../Build Spec.dc.html,
   "an icon may never carry status". The uniform rule decides the uniform,
   never an icon; this just helps a subject be found at a glance. */
export const SUBJECT_ICON = {
  'Pastoral Care': UsersThree,
  'HSIE': Globe,
  'Visual Arts': Palette,
  'English': BookOpen,
  'French': Translate,
  'Japanese': Translate,
  'Mathematics': PencilSimple,
  'PDHPE': Barbell,
  'PE Theory': Book,
  'PE Prac': Barbell,
  'Sport': SoccerBall,
  'Sport - Dance': MusicNotes,
  'Dance': MusicNotes,
  'Assembly': UsersThree,
  'Science': Flask,
  'Technology': Wrench,
  'DiscoverEd': Compass,
  'Integrated Studies': Compass,
  'Religious Education': Church,
  'Chapel': Church,
  'Drama': MaskHappy,
  'Music': MusicNotes,
};

export const DEFAULT_SUBJECT_ICON = BookOpen;

export function subjectIcon(subject) {
  return SUBJECT_ICON[subject] ?? DEFAULT_SUBJECT_ICON;
}
