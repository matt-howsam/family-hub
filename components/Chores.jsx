import { PEOPLE } from '@/lib/people';
import HubIcon from '@/components/HubIcon';

const dollars = (c) => (c / 100).toLocaleString('en-AU', { maximumFractionDigits: 0 });

/* The wall's chores card — read-only, navigation only, per
   docs/family-hub-chores-brief.md's "Surfaces > Dashboard": nothing here
   is claimable or tickable, that's each person's own view
   (components/ChoresBoard.jsx). Always on, not gated to non-school days —
   "chores ignore school terms" (the brief's own rule; the lawn grows in
   the holidays), unlike the kids' school briefings next to it. */
export default function Chores({ tile, avatarIcons }) {
  return (
    <div className="chores-card">
      <div className="chores-card__header">
        <span className="chores-card__label">Chores</span>
        <span className="chores-card__available">
          {tile.availableCount} available · ${dollars(tile.availableCents)}
        </span>
      </div>
      <div className="chores-card__kids">
        {tile.kids.map((k) => (
          <div className="chores-card__kid" key={k.person}>
            <HubIcon icon={avatarIcons[k.person]} size={48} />
            <div>
              <div className="chores-card__name">{PEOPLE[k.person]?.name ?? k.person}</div>
              <div className="chores-card__stat">
                {k.doneCount} done this week · ${dollars(k.doneCents)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
