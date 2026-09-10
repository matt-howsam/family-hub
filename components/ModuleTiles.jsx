import { Hammer, ChartLineDown, Receipt, Tent } from '@phosphor-icons/react/ssr';

/* Placeholder until the projects, spending, register and holidays modules
   ship — each will replace one line here with a live query. The answer
   leads and the module name is last and smallest: nobody scanning a fridge
   is looking for a module. Calm and attention differ by wash + accent only. */
const TILES = [
  { icon: Hammer, name: 'Projects', attention: true,
    answer: '7 stalled · kitchen longest at 142 days' },
  { icon: ChartLineDown, name: 'Spending',
    answer: 'Week 2 · $610 of $1,163' },
  { icon: Receipt, name: 'Register',
    answer: 'Nothing renews for 7 weeks', accent: ' · $1,449 saved' },
  { icon: Tent, name: 'Holidays',
    answer: 'Straddie in 30 weeks' },
];

export default function ModuleTiles() {
  return (
    <div className="tiles">
      {TILES.map(({ icon: Icon, name, answer, accent, attention }) => (
        <div className={`tile${attention ? ' tile--attention' : ''}`} key={name}>
          <Icon size={22} className="tile__icon" />
          <span className="tile__answer">
            {answer}
            {accent && <span className="tile__accent">{accent}</span>}
          </span>
          <span className="tile__name">{name}</span>
        </div>
      ))}
    </div>
  );
}
