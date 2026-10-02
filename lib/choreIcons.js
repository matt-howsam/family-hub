import {
  Tree, Leaf, Broom, Sparkle, Drop, SprayBottle, CarSimple, Trash, WashingMachine,
  PaintRoller, Shovel, Wrench, Question,
} from '@phosphor-icons/react/ssr';

/* Curated subset for the chore library's icon picker — same reasoning as
   lib/foodIcons.js: a fixed, known-good set rather than a free-text name
   that could typo into a blank icon, and small enough not to pull the
   whole Phosphor set into the bundle. */
export const CHORE_ICONS = {
  Tree, Leaf, Broom, Sparkle, Drop, SprayBottle, CarSimple, Trash, WashingMachine,
  PaintRoller, Shovel, Wrench,
};

export function choreIcon(name) {
  return CHORE_ICONS[name] ?? Question;
}
