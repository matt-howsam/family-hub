import { Check } from '@phosphor-icons/react/ssr';
import HubIcon from '@/components/HubIcon';

/* Static mock pending the real job board's dashboard line — see
   docs/family-hub-chores-brief.md's "Open": placement can't land in zone 1,
   and the brief itself defers this surface to "Later". Ticking a real job
   happens inside a personal view (components/ChoresBoard.jsx), never here,
   so this tile was always read-only regardless.

   The avatar is real, though — same per-person HubIcon config as the wall
   strip and each person's own page, not the old generic initial-in-a-disc. */
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

export default function Chores({ avatarIcons }) {
  return (
    <>
      {KIDS.map((k) => (
        <div className="chore" key={k.id}>
          <HubIcon icon={avatarIcons[k.id]} size={52} />
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
