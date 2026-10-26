import Link from 'next/link';
import { CaretRight, ListChecks } from '@phosphor-icons/react/ssr';
import { foodIcon } from '@/lib/foodIcons';

/* Sits under the date and week letter, not a tile — tonight's dinner decays
   within hours and doesn't answer "does this need me?". Tapping it opens
   the planner: navigation, not a write, so it gets the chevron rather than
   a pencil — a pencil would promise an edit this line deliberately never
   offers.

   The shopping list icon alongside it is the same kind of thing: navigation
   to a surface with a real write, same as the planner link, not an edit
   affordance on this line itself — see docs/DECISIONS.md "Interface
   conventions". Visible on the fridge and on phones alike, since the list
   itself already gates its own writes per device (role=display may write
   it; see docs/identity.md). */
export default function TonightLine({ tonight, listCount = 0 }) {
  if (!tonight) return null;
  const Icon = tonight.card ? foodIcon(tonight.card.icon) : null;
  return (
    <div className="tonight">
      <div className="tonight__row">
        <Link className="tonight__line" href="/planner">
          <span className="tonight__label">{tonight.label}</span>
          {Icon && <Icon size={18} className="tonight__icon" />}
          <span className="tonight__value">{tonight.card ? tonight.card.title : 'nothing planned'}</span>
          <CaretRight size={14} className="tonight__chevron" />
        </Link>
        <Link className="tonight__list" href="/list" aria-label="Shopping list">
          <ListChecks size={24} className="tonight__list-icon" />
          {listCount > 0 && <span className="tonight__list-count">{listCount}</span>}
        </Link>
      </div>
      {tonight.prep && <div className="tonight__prep">{tonight.prep}</div>}
    </div>
  );
}
