import { foodIcon } from '@/lib/foodIcons';

/* Sits under the date and week letter, not a tile — tonight's dinner decays
   within hours and doesn't answer "does this need me?". Tapping it opens
   the planner: navigation, not a write. */
export default function TonightLine({ tonight }) {
  if (!tonight) return null;
  const Icon = tonight.card ? foodIcon(tonight.card.icon) : null;
  return (
    <div className="tonight">
      <a className="tonight__line" href="/planner">
        <span className="tonight__label">{tonight.label}</span>
        {Icon && <Icon size={18} className="tonight__icon" />}
        <span className="tonight__value">{tonight.card ? tonight.card.title : 'nothing planned'}</span>
      </a>
      {tonight.prep && <div className="tonight__prep">{tonight.prep}</div>}
    </div>
  );
}
