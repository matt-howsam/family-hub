import {
  CookingPot, BowlFood, BowlSteam, Pizza, Popcorn, Hamburger, Fish, FishSimple, Shrimp, Egg, EggCrack,
  Bread, Carrot, IceCream, Cake, Coffee, CoffeeBean, Cheese, Wine, ForkKnife, Avocado, Orange, OrangeSlice,
  Pepper, Cookie, Cherries, Grains, Acorn, Onigiri, Popsicle, TeaBag, Jar, JarLabel, Knife, Oven,
  BeerBottle, BeerStein, Champagne, Cheers, Martini, Brandy, PintGlass, Cow, Bird, Barn,
  Package, ArrowsClockwise, Suitcase, Question,
} from '@phosphor-icons/react/ssr';
import { Bbq, Tongs, ChickenLeg, Steak, Chopsticks } from './customFoodIcons.jsx';

/* Curated subset for the library's icon picker — picked from a grid, never
   typed, per the meal planner brief. The icon helps a card be found from a
   metre away; the title is still the card's identity, and two cards can
   share an icon.

   Everything Phosphor tags "food" (checked against phosphor-icons/core's
   own tag data, since the npm package doesn't ship it) plus cow/bird/barn/
   fish-simple by name, on top of the original curated set and the
   hand-drawn BBQ/tongs/chicken/steak/chopsticks. */
export const FOOD_ICONS = {
  CookingPot, BowlFood, BowlSteam, Pizza, Popcorn, Hamburger, Fish, FishSimple, Shrimp, Egg, EggCrack,
  Bread, Carrot, IceCream, Cake, Coffee, CoffeeBean, Cheese, Wine, ForkKnife, Avocado, Orange, OrangeSlice,
  Pepper, Cookie, Cherries, Grains, Acorn, Onigiri, Popsicle, TeaBag, Jar, JarLabel, Knife, Oven,
  BeerBottle, BeerStein, Champagne, Cheers, Martini, Brandy, PintGlass, Cow, Bird, Barn,
  Bbq, Tongs, ChickenLeg, Steak, Chopsticks,
  Package, ArrowsClockwise, Suitcase, Question,
};

export function foodIcon(name) {
  return FOOD_ICONS[name] ?? Question;
}
