import { Check } from '@phosphor-icons/react/ssr';

/* Static until the chores module ships. Ticking one is the one write the
   fridge allows, but that happens inside a personal view, not on the wall. */
const KIDS = [
  { id: 'tom', name: 'Tom', earned: 7, chores: [
    { label: 'Bins', done: true },
    { label: 'Dishwasher', done: false },
    { label: 'Mow · $15', done: false },
  ] },
  { id: 'rose', name: 'Rose', earned: 5, chores: [
    { label: 'Vacuum up', done: true },
    { label: 'Bathrooms · $20', done: false },
    { label: 'Windows · $15', done: false },
  ] },
];

export default function Chores() {
  return (
    <>
      {KIDS.map((k) => (
        <div className="chore" key={k.id}>
          <div
            className="chore__avatar"
            style={{ background: `var(--fh-${k.id}-disc)`, color: `var(--fh-${k.id}-ink)` }}
          >
            {k.name[0]}
          </div>
          <div>
            <div className="chore__who">{k.name} · this week</div>
            <div className="chore__list">
              {k.chores.map((c) => (
                <span
                  className={`chore__pill chore__pill--${c.done ? 'done' : 'open'}`}
                  key={c.label}
                >
                  {c.done && <Check size={17} />}
                  {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="chore__earned">
            <div className="chore__figure">${k.earned}</div>
            <div className="chore__label">earned</div>
          </div>
        </div>
      ))}
    </>
  );
}
