import {
  CookingPot, BowlFood, Pizza, Popcorn, Hamburger, Fish, Egg, Bread, Carrot,
  IceCream, Cake, Coffee, Cheese, Wine, ForkKnife, Avocado, Orange, Pepper,
  Cookie, Cherries, Grains, Package, ArrowsClockwise, Suitcase, Question,
} from '@phosphor-icons/react/ssr';

/* Curated subset for the library's icon picker — picked from a grid, never
   typed, per the meal planner brief. The icon helps a card be found from a
   metre away; the title is still the card's identity, and two cards can
   share an icon. */
export const FOOD_ICONS = {
  CookingPot, BowlFood, Pizza, Popcorn, Hamburger, Fish, Egg, Bread, Carrot,
  IceCream, Cake, Coffee, Cheese, Wine, ForkKnife, Avocado, Orange, Pepper,
  Cookie, Cherries, Grains, Package, ArrowsClockwise, Suitcase, Question,
};

export function foodIcon(name) {
  return FOOD_ICONS[name] ?? Question;
}
